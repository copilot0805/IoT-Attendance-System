const axios = require("axios");
const pool = require("../db");

const { upsertShiftTimesheet, findUserActiveShift, determineNextEvent} = require("../services/attendanceService");
const {uploadToCloudinary} = require("../services/uploadFile")

// const postAttendanceAPI = async (req, res) => {
//     try {
//         const imageBuffer = req.body;

//         // 1. Kiểm tra xem có nhận được mảng byte thô không
//         if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
//             return res.status(400).json({ error: 'Không nhận được dữ liệu ảnh thô (Raw Image)' });
//         }

//         console.log(`Nhận được ảnh từ ESP32 (Kích thước: ${imageBuffer.length} bytes)`);

//         // 2. Gửi thẳng mảng byte sang API /verify-face của Python AI
//         const aiResponse = await axios.post('http://127.0.0.1:5000/verify-face', imageBuffer, {
//             headers: {
//                 'Content-Type': 'image/jpeg'
//             }
//         });

//         const aiData = aiResponse.data;

//         // 3. Xử lý phản hồi từ AI
//         if (aiData.match === true) {
//             // Nhận diện đúng -> Kích hoạt MQTT mở cửa
//             publishUnlockCommand(aiData.user, aiData.id || aiData.user);

//             return res.status(200).json({
//                 message: 'Nhận diện thành công, đang mở cửa!',
//                 data: aiData
//             });
//         } else {
//             console.log('Người lạ! Không mở cửa.');
//             return res.status(403).json({
//                 message: 'Nhận diện thất bại: Người lạ!',
//                 data: aiData
//             });
//         }

//     } catch (error) {
//         console.error('Lỗi Controller Chấm công:', error.message);
//         if (error.response) {
//             return res.status(error.response.status).json({ error: error.response.data });
//         }
//         return res.status(500).json({ error: 'Lỗi hệ thống máy chủ' });
//     }
// };

const postAttendanceAPI = async (req, res) => {
  try {
    const imageBuffer = req.body;

    if (
      !imageBuffer ||
      !Buffer.isBuffer(imageBuffer) ||
      imageBuffer.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Không nhận được dữ liệu ảnh thô (Raw Image)" });
    }

    console.log(
      `Nhận được ảnh từ camera ESP32 (Kích thước: ${imageBuffer.length} bytes)`,
    );

    // =====================================================================
    // BƯỚC 1: CHỈ NHỜ AI TRÍCH XUẤT 512 SỐ (KHÔNG CHO AI TỰ SO SÁNH NỮA)
    // =====================================================================
    console.log('>>> Kích thước ảnh Camera gửi AI:', req.body.length, 'bytes');

    const aiResponse = await axios.post('http://127.0.0.1:5000/extract', req.body, {
        headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': req.body.length // Chặn Axios cắt nhỏ dữ liệu
        }
    });

    const vectorArray = aiResponse.data.vector;
    const vectorString = `[${vectorArray.join(",")}]`;

    // =====================================================================
    // BƯỚC 2: POSTGRESQL TỰ TÌM NGƯỜI GIỐNG NHẤT (DÙNG PGVECTOR)
    // =====================================================================
    // Phép toán <=> chính là Cosine Distance (Độ lệch góc) giống hệt AI dùng
    const query = `
            SELECT u.user_id, u.full_name,
                   (v.vector <=> $1) AS distance
            FROM face_vectors v
            JOIN users u ON v.user_id = u.user_id
            WHERE v.is_active = TRUE
            ORDER BY v.vector <=> $1
            LIMIT 1;
        `;

    const result = await pool.query(query, [vectorString]);
    const bestMatch = result.rows[0];

    // Ngưỡng sai số cho phép (Threshold y hệt con Python cũ)
    const THRESHOLD = 0.65;

    // =====================================================================
    // BƯỚC 3: QUYẾT ĐỊNH MỞ CỬA & GHI LOG
    // =====================================================================
      if (bestMatch && bestMatch.distance <= THRESHOLD) {
        console.log(
          `✅ [DB MATCH] Nhận diện: ${bestMatch.full_name} (Độ lệch: ${bestMatch.distance.toFixed(4)})`,
      );

      // Kiểm tra xem có gần thời gian ca làm việc không
      const shiftData = await findUserActiveShift(bestMatch.user_id);
      if (!shiftData) return res.status(403).json({ error: "Ngoài giờ làm việc" });

      // Xác định là check in hay check out
      const { activeShift, validStart, validEnd } = shiftData;
      const nextEvent = await determineNextEvent(bestMatch.user_id, validStart, validEnd);

      let eventId; // Biến lưu ID của sự kiện để cập nhật ảnh sau

      // Ghi trạng thái mới vào Database
      const logQuery = `INSERT INTO attendance_events (user_id, event_type, image_url) VALUES ($1, $2, NULL) RETURNING event_id`;
      try {
        const logResult = await pool.query(logQuery, [bestMatch.user_id, nextEvent]);
        eventId = logResult.rows[0].event_id;

        // Tính toán và chốt dữ liệu chấm công của một ca làm việc vào bảng shift_timesheets.
        const { shift_id, working_date } = activeShift;
        await upsertShiftTimesheet(bestMatch.user_id, shift_id, working_date, bestMatch.full_name);

        console.log(`📝 [DB LOG] Đã lưu lịch sử: [${nextEvent}] cho ${bestMatch.full_name}`,);
      } catch (err) {
        console.error("❌ [DB LOG ERROR] Lỗi ghi log database:", err.message);

        // KIỂM TRA LỖI TRIGGER
        if (err.code === 'P0001' || err.message.includes('5 seconds') || err.message.includes('5 giây')) {
            return res.status(429).json({ error: "Thao tác quá nhanh! Vui lòng đợi 5 giây rồi quẹt lại." });
        }
        
        // Nếu là lỗi DB khác thì báo lỗi server
        return res.status(500).json({ error: "Lỗi hệ thống khi lưu nhật ký." });
      }

      // CHẠY NGẦM CLOUDINARY
      uploadToCloudinary(imageBuffer)
        .then(async (imgUrl) => {
            await pool.query(`UPDATE attendance_events SET image_url = $1 WHERE event_id = $2`, [imgUrl, eventId]);
            console.log(`☁️ [CLOUDINARY] Đã lưu ảnh thành công cho ${bestMatch.full_name}`);
        })
        .catch((err) => {
            console.error("❌ [CLOUDINARY ERROR] Lỗi upload ngầm:", err.message);
        });

      return res.status(200).json({
        message: "Nhận diện thành công, đang mở cửa!",
        data: {
          match: true,
          user: bestMatch.full_name,
          id: bestMatch.user_id,
          command: "unlock",
          status: "success",
        },
      });
    } else {
      const currentDist = bestMatch ? bestMatch.distance.toFixed(4) : "N/A";
      console.log(`❌ [DB MATCH] Người lạ! (Độ lệch gần nhất: ${currentDist})`);

      return res.status(403).json({
        message: "Nhận diện thất bại: Người lạ!",
        data: { match: false, status: "failed" },
      });
    }
  } catch (error) {
    console.error("Lỗi Controller Chấm công:", error.message);
    if (error.response && error.response.data) {
      return res
        .status(400)
        .json({ error: error.response.data.detail || "Lỗi AI" });
    }
    return res.status(500).json({ error: "Lỗi hệ thống máy chủ" });
  }
};

const getTimesheetsAPI = async (req, res) => {
  try {
    const query = `
      SELECT u.user_id, u.full_name, 
             s.start_time, s.end_time,
             COALESCE(st.status, 'PENDING') as status, 
             COALESCE(st.working_hour, 0) as working_hours,
             TO_CHAR(st.first_check_in, 'HH24:MI:SS') as check_in,
             TO_CHAR(st.last_check_out, 'HH24:MI:SS') as check_out
      FROM users u
      JOIN user_shifts us ON u.user_id = us.user_id AND us.working_date = CURRENT_DATE
      JOIN shifts s ON us.shift_id = s.shift_id
      LEFT JOIN shift_timesheets st 
             ON u.user_id = st.user_id 
            AND st.shift_id = us.shift_id 
            AND st.working_date = us.working_date;
    `;

    const result = await pool.query(query);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("❌ Lỗi lấy bảng công:", error.message);
    return res.status(500).json({ error: "Lỗi hệ thống không lấy được bảng công" });
  }
};


const getAttendanceLogsAPI = async (req, res) => {
  try {
    const query = `
      SELECT u.full_name, e.event_type, e.event_time, e.image_url AS imgurl 
      FROM attendance_events e
      JOIN users u ON e.user_id = u.user_id
      ORDER BY e.event_time DESC
      LIMIT 20;
    `;
    const result = await pool.query(query);
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: "Lỗi lấy nhật ký" });
  }
};

module.exports = { postAttendanceAPI, getTimesheetsAPI, getAttendanceLogsAPI };
