const axios = require("axios");
const pool = require("../db");

const { upsertShiftTimesheet, findUserActiveShift} = require("../services/attendanceService");
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

    // LỖI: KHÔNG CÓ ẢNH -> Trả về THƯỜNG HỢP 3 (Bỏ qua frame)
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      return res.status(200).json({ 
          match: false, 
          status: "failed", 
          error: "Không nhận được dữ liệu ảnh thô" 
      });
    }

    console.log(`📷 Nhận được ảnh từ camera ESP32 (${imageBuffer.length} bytes)`);

    // =====================================================================
    // BƯỚC 1: TRÍCH XUẤT VECTOR
    // =====================================================================
    const aiResponse = await axios.post('http://127.0.0.1:5000/extract', req.body, {
        headers: {
            'Content-Type': 'image/jpeg',
            'Content-Length': req.body.length
        }
    });

    const vectorArray = aiResponse.data.vector;
    const vectorString = `[${vectorArray.join(",")}]`;

    // =====================================================================
    // BƯỚC 2: TÌM NGƯỜI GIỐNG NHẤT BẰNG PGVECTOR
    // =====================================================================
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
    const THRESHOLD = 0.65;

    // =====================================================================
    // BƯỚC 3: QUYẾT ĐỊNH & GHI LOG (CHUẨN FORMAT CE TEAM)
    // =====================================================================
    if (bestMatch && bestMatch.distance <= THRESHOLD) {
        console.log(`✅ [DB MATCH] Nhận diện: ${bestMatch.full_name} (Độ lệch: ${bestMatch.distance.toFixed(4)})`);

        const client = await pool.connect();
        let eventId = null; 

        try {
            // Ghi log
            const logQuery = `INSERT INTO attendance_events (user_id, event_type, image_url) VALUES ($1, 'CHECK_IN', NULL) RETURNING event_id, event_time`;
            const logResult = await client.query(logQuery, [bestMatch.user_id]);
            const { event_id, event_time } = logResult.rows[0]; 
            eventId = event_id;

            await client.query('BEGIN');
            await client.query(`SELECT 1 FROM users WHERE user_id = $1 FOR UPDATE`, [bestMatch.user_id]);

            const shiftData = await findUserActiveShift(bestMatch.user_id);
            
            // LỖI: KHÔNG CÓ CA LÀM VIỆC -> Trả về TRƯỜNG HỢP 3 (Bỏ qua frame)
            if (shiftData) {
              const { activeShift, shiftStartFull, shiftEndFull} = shiftData;

              await client.query('COMMIT');

              // Tính công
              const { shift_id, working_date } = activeShift;
              const eventsRes = await pool.query(`
                SELECT 1
                FROM shift_timesheets
                WHERE user_id = $1
                  AND shift_id = $2
                  AND working_date = $3
              `, [bestMatch.user_id, shift_id, working_date]);

              const events = eventsRes.rows;

              if(events.length === 0){
                await upsertShiftTimesheet(bestMatch.user_id, shift_id, working_date, bestMatch.full_name,event_time, shiftStartFull, shiftEndFull);
              }
            }


            console.log(`📝 [DB LOG] Đã lưu lịch sử cho ${bestMatch.full_name}`);

            // Upload ảnh ngầm
            uploadToCloudinary(imageBuffer)
                .then(async (imgUrl) => {
                    await pool.query(`UPDATE attendance_events SET image_url = $1 WHERE event_id = $2`, [imgUrl, eventId]);
                })
                .catch((err) => console.error("❌ [CLOUDINARY ERROR] Lỗi upload ngầm:", err.message));

            // THÀNH CÔNG: MỞ CỬA -> Trả về TRƯỜNG HỢP 1 (Có name, có id)
            return res.status(200).json({
                match: true,
                status: "success",
                name: bestMatch.full_name,
                id: bestMatch.user_id
            });

        } catch (err) {
            await client.query('ROLLBACK');
            console.error("❌ [DB LOG ERROR] Lỗi ghi log database:", err.message);

            // LỖI SPAM CAMERA -> Trả về TRƯỜNG HỢP 3 (Bỏ qua frame)
            if (err.code === 'P0001' || err.message.includes('5 seconds') || err.message.includes('5 giây')) {
                return res.status(200).json({ match: false, status: "failed", error: "Thao tác quá nhanh, đang chờ 5s..." });
            }
            
            // LỖI HỆ THỐNG -> Trả về TRƯỜNG HỢP 3
            return res.status(200).json({ match: false, status: "failed", error: "Lỗi hệ thống khi lưu nhật ký" });
            
        } finally {
            client.release();
        }

    } else {
        // NHẬN DIỆN THẤT BẠI (NGƯỜI LẠ) -> Trả về TRƯỜNG HỢP 2 (KHÔNG có key 'error')
        const currentDist = bestMatch ? bestMatch.distance.toFixed(4) : "N/A";
        console.log(`❌ [DB MATCH] Người lạ! (Độ lệch: ${currentDist})`);

        return res.status(200).json({
            match: false,
            status: "failed"
        });
    }

  } catch (error) {
    // LỖI TỪ AI PYTHON HOẶC SẬP CODE CỤC BỘ -> Trả về TRƯỜNG HỢP 3 (Để ESP32 âm thầm bỏ qua, không sập theo)
    const errorMsg = (error.response && error.response.data && error.response.data.detail) 
                     ? error.response.data.detail 
                     : "Lỗi hệ thống hoặc AI bị sập";
    
    // Tắt bớt log dài dòng nếu chỉ là lỗi "Không có khuôn mặt trong ảnh"
    if (!errorMsg.includes("face")) {
        console.error("Lỗi Controller Chấm công:", error.message);
    }

    return res.status(200).json({ 
        match: false, 
        status: "failed", 
        error: errorMsg 
    });
  }
};

const getTimesheetsAPI = async (req, res) => {
  try {
    const todayVN = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const date = req.query.date || todayVN; 
    
    const userId = req.query.user_id;

    let query = `
      SELECT u.user_id, u.full_name, 
             s.start_time, s.end_time,
             COALESCE(st.status, 'PENDING') as status, 
             COALESCE(st.working_hour, 0) as working_hours,
             TO_CHAR(st.first_check_in, 'HH24:MI:SS') as check_in,
             TO_CHAR(st.last_check_out, 'HH24:MI:SS') as check_out
      FROM users u
      JOIN user_shifts us ON u.user_id = us.user_id 
      JOIN shifts s ON us.shift_id = s.shift_id
      LEFT JOIN shift_timesheets st 
             ON u.user_id = st.user_id 
            AND st.shift_id = us.shift_id 
            AND st.working_date = us.working_date
      WHERE us.working_date = $1
    `;
    const params = [date];

    if (userId) {
      query += ` AND u.user_id = $2`;
      params.push(userId);
    }

    query += ` ORDER BY s.start_time ASC, u.full_name ASC`;

    const result = await pool.query(query, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("❌ Lỗi lấy bảng công:", error.message);
    return res.status(500).json({ error: "Lỗi hệ thống không lấy được bảng công" });
  }
};


const getAttendanceLogsAPI = async (req, res) => {
  try {
    const date = req.query.date; 
    const userId = req.query.user_id; 
    
    const limit = parseInt(req.query.limit) || 20; 
    const offset = parseInt(req.query.offset) || 0; 

    let query = `
      SELECT u.full_name, e.event_type, e.event_time, e.image_url AS imgurl 
      FROM attendance_events e
      JOIN users u ON e.user_id = u.user_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    if (date) {
      query += ` AND e.event_time >= $${paramIndex}::timestamp 
                 AND e.event_time < $${paramIndex}::timestamp + INTERVAL '1 day'`;
      params.push(date);
      paramIndex++;
    }

    if (userId) {
      query += ` AND e.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    query += ` ORDER BY e.event_time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("❌ Lỗi lấy nhật ký:", error.message);
    return res.status(500).json({ error: "Lỗi lấy nhật ký" });
  }
};

module.exports = { postAttendanceAPI, getTimesheetsAPI, getAttendanceLogsAPI };
