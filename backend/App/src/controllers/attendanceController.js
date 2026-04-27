const axios = require("axios");
const pool = require("../db");
const { upsertDailyTimesheet } = require("../services/attendanceService");

// Set up cho việc ghi log cả trong hệ thống và database
// const fs = require("fs");
// const path = require("path");
// const FALLBACK_LOG_PATH = path.join(
//   __dirname,
//   "../../logs/attendance_fallback.log",
// );


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

      // Logging
      // 1. Ghi log vào file text dự phòng (Luôn ghi để backup)
      // const logEntry = `${new Date().toISOString()} | ID: ${bestMatch.user_id} | Name: ${bestMatch.full_name} | Dist: ${bestMatch.distance.toFixed(4)}\n`;
      // fs.appendFile(FALLBACK_LOG_PATH, logEntry, (err) => {
      //   if (err) console.error("❌ Lỗi ghi file log dự phòng:", err);
      // });

      // 2. Logic luân phiên Check-in / Check-out
      // Tìm bản ghi quẹt thẻ gần nhất CỦA NGÀY HÔM NAY của user này
      const checkStatusQuery = `
        SELECT event_type 
        FROM attendance_events 
        WHERE user_id = $1 AND DATE(event_time) = CURRENT_DATE 
        ORDER BY event_time DESC 
        LIMIT 1;
      `;

      const statusResult = await pool.query(checkStatusQuery, [
        bestMatch.user_id,
      ]);

      let nextEvent = "CHECK_IN"; // Mặc định nếu hôm nay chưa quẹt thì là vào ca

      if (statusResult.rows.length > 0) {
        const lastEvent = statusResult.rows[0].event_type;
        // Nếu lần quẹt gần nhất là CHECK_IN, thì lần này đảo thành CHECK_OUT
        if (lastEvent === "CHECK_IN") {
          nextEvent = "CHECK_OUT";
        }
      }

      // 3. Ghi trạng thái mới vào Database
      const logQuery = `INSERT INTO attendance_events (user_id, event_type) VALUES ($1, $2)`;
      try {
        await pool.query(logQuery, [bestMatch.user_id, nextEvent]);
        await upsertDailyTimesheet(bestMatch.user_id);
        console.log(
          `📝 [DB LOG] Đã lưu lịch sử: [${nextEvent}] cho ${bestMatch.full_name}`,
        );
      } catch (err) {
        console.error("❌ [DB LOG ERROR] Lỗi ghi log database:", err.message);
      }

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

      const errorLogEntry = `${new Date().toISOString()} | [DENIED] | Dist: ${currentDist} | ImageSize: ${imageBuffer.length} bytes\n`;

      //logginf lần thất bại
      // fs.appendFile(FALLBACK_LOG_PATH, errorLogEntry, (err) => {
      //   if (err) console.error("❌ Lỗi ghi file log hệ thống:", err);
      //   else
      //     console.log(
      //       "📝 [SYSTEM LOG] Đã ghi lại nỗ lực truy cập thất bại vào file.",
      //     );
      // });

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

// Hàm lấy danh sách chấm công hôm nay cho trang Web
const getTimesheetsAPI = async (req, res) => {
  try {
    // Câu lệnh SQL lấy tên User và thông tin công ngày hôm nay (CURRENT_DATE)
    const query = `
      SELECT u.user_id, u.full_name, 
             dt.status, 
             dt.working_hours,
             TO_CHAR(dt.first_check_in, 'HH24:MI:SS') as check_in,
             TO_CHAR(dt.last_check_out, 'HH24:MI:SS') as check_out
      FROM users u
      LEFT JOIN daily_timesheets dt ON u.user_id = dt.user_id AND dt.work_date = CURRENT_DATE;
    `;

    const result = await pool.query(query);

    // Gửi danh sách này về cho trang Web
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Lỗi lấy bảng công:", error.message);
    return res
      .status(500)
      .json({ error: "Lỗi hệ thống không lấy được bảng công" });
  }
};


const getAttendanceLogsAPI = async (req, res) => {
  try {
    const query = `
      SELECT u.full_name, e.event_type, e.event_time 
      FROM attendance_events e
      JOIN users u ON e.user_id = u.user_id
      ORDER BY e.event_time DESC
      LIMIT 20; -- Lấy 20 bản ghi mới nhất
    `;
    const result = await pool.query(query);
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: "Lỗi lấy nhật ký" });
  }
};

module.exports = { postAttendanceAPI, getTimesheetsAPI, getAttendanceLogsAPI };
