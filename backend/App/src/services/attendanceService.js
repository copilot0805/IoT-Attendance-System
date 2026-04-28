const pool = require("../db");
const axios = require("axios");

// Tìm ca làm việc của ngày hôm nay HOẶC hôm qua (ca đêm)
const findUserActiveShift = async (userId) => {
    const now = new Date();
    const query = `
        SELECT s.shift_id, s.start_time, s.end_time, us.working_date
        FROM user_shifts us
        JOIN shifts s ON us.shift_id = s.shift_id
        WHERE us.user_id = $1 
          AND us.working_date >= CURRENT_DATE - INTERVAL '1 day'
          AND us.working_date <= CURRENT_DATE
        ORDER BY us.working_date DESC`;

    const result = await pool.query(query, [userId]);
    
    for (const row of result.rows) {
        const { start_time, end_time, working_date } = row;
        const d = new Date(working_date);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        let sStart = new Date(`${dateStr}T${start_time}`);
        let sEnd = new Date(`${dateStr}T${end_time}`);

        if (sEnd < sStart) sEnd.setDate(sEnd.getDate() + 1);

        // buffer để đảm bảo check in và check out đúng ca
        const check_in_buffer = 1
        const check_out_buffer = 2
        const validStart = new Date(sStart.getTime() - (check_in_buffer * 60 * 60 * 1000));
        const validEnd = new Date(sEnd.getTime() + (check_out_buffer * 60 * 60 * 1000));

        if (now >= validStart && now <= validEnd) {
            return { activeShift: row, shiftStartFull: sStart, shiftEndFull: sEnd,validStart, validEnd };
        }
    }
    return null;
};

/**
 * 2. Quyết định hành động tiếp theo (CHECK_IN hay CHECK_OUT)
 */
const determineNextEvent = async (userId, validStart, validEnd) => {
    // Dùng đúng khung giờ buffer (-1h đến +2h) đã bao gồm ngày tháng chính xác
    const query = `
        SELECT event_type, event_time FROM attendance_events 
        WHERE user_id = $1 
          AND event_time >= $2 AND event_time <= $3
        ORDER BY event_time DESC LIMIT 1;`;

    const res = await pool.query(query, [userId, validStart, validEnd]);

    // Chưa có log trong ca này thì là CHECK_IN
    if (res.rows.length === 0) return "CHECK_IN";

    const lastEvent = res.rows[0];
    
    // Cooldown 10 phút. 
    // Nếu quẹt quá gần nhau, quăng lỗi để chặn luôn việc tạo cặp IN/OUT sai lệch.
    // const lastEventTime = new Date(lastEvent.event_time);
    // const dbTimeRes = await pool.query("SELECT CURRENT_TIMESTAMP AS now");
    // const now = new Date(dbTimeRes.rows[0].now);
    // const diffMinutes = (now - lastEventTime) / (1000 * 60);
    // if (diffMinutes < 10) {
    //     throw new Error("COOLDOWN_10_MINS"); 
    // }

    return lastEvent.event_type === "CHECK_IN" ? "CHECK_OUT" : "CHECK_IN";
};

// Cập nhật bảng công theo Ca làm việc
const upsertShiftTimesheet = async (userId, shiftId, workingDate, name) => {
  try {
    // Lấy thông tin ca để xác định khung giờ
    const shiftRes = await pool.query(
      `SELECT start_time, end_time FROM shifts WHERE shift_id = $1`, 
      [shiftId]
    );
    const { start_time, end_time } = shiftRes.rows[0];

    const d = new Date(workingDate);
    const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    let startTimeFull = new Date(`${dateString}T${start_time}`);
    let endTimeFull = new Date(`${dateString}T${end_time}`);

    // Xử lý ca đêm
    if (endTimeFull < startTimeFull) {
      endTimeFull.setDate(endTimeFull.getDate() + 1); 
    }

    const searchStart = new Date(startTimeFull.getTime() - (1 * 60 * 60 * 1000));
    const searchEnd = new Date(endTimeFull.getTime() + (2 * 60 * 60 * 1000));

    const eventsRes = await pool.query(`
        SELECT event_type, event_time
        FROM attendance_events
        WHERE user_id = $1 
          AND event_time >= $2 
          AND event_time <= $3
        ORDER BY event_time ASC
    `, [userId, searchStart, searchEnd]);

    // VÒNG LẶP BẮT CẶP IN/OUT ĐỂ TÍNH GIỜ THỰC TẾ
    let first_in = null;
    let last_out = null;
    let totalMs = 0;
    let current_in_time = null; 

    eventsRes.rows.forEach(event => {
      const eventTime = new Date(event.event_time);

      if (event.event_type === 'CHECK_IN') {
        if (!first_in) first_in = eventTime; 
        if (!current_in_time) current_in_time = eventTime; 
      } 
      else if (event.event_type === 'CHECK_OUT') {
        last_out = eventTime; 
        
        if (current_in_time) {
          totalMs += (eventTime - current_in_time);
          current_in_time = null; 
        }
      }
    });

    const workingHour = (totalMs / (1000 * 60 * 60)).toFixed(2);

    let status = 'PRESENT';
    const now = new Date();

    if (!first_in && !last_out) {
      status = 'ABSENT';
    } 
    // Nếu vẫn còn trong giờ ca làm và đang ở trạng thái đã IN, thì báo WORKING
    else if (now < searchEnd && current_in_time !== null) {
      status = 'WORKING'; 
    } 
    else if (!first_in || !last_out || current_in_time !== null) {
      status = 'INCOMPLETE';
    } 
    else if (first_in > startTimeFull) {
      status = 'LATE';
    }

    await pool.query(`
        INSERT INTO shift_timesheets 
        (user_id, shift_id, working_date, first_check_in, last_check_out, working_hour, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, shift_id, working_date) 
        DO UPDATE SET 
            first_check_in = EXCLUDED.first_check_in,
            last_check_out = EXCLUDED.last_check_out,
            working_hour = EXCLUDED.working_hour,
            status = EXCLUDED.status;
    `, [userId, shiftId, workingDate, first_in, last_out, workingHour, status]);

    console.log(`📊 [SERVICE] Chốt công ${name} | Hrs: ${workingHour} | Status: ${status}`);

  } catch (err) {
    console.error("❌ [SERVICE ERROR]:", err.message);
  }
};

// Hàm Cron Job đánh vắng mặt
const markAbsentForToday = async () => {
  const query = `
    INSERT INTO shift_timesheets (user_id, shift_id, working_date, status)
    SELECT us.user_id, us.shift_id, us.working_date, 'ABSENT' 
    FROM user_shifts us
    JOIN shifts s ON us.shift_id = s.shift_id
    LEFT JOIN shift_timesheets st 
      ON us.user_id = st.user_id 
      AND us.shift_id = st.shift_id 
      AND us.working_date = st.working_date
    WHERE 
      (
        CASE 
          WHEN s.end_time > s.start_time THEN (us.working_date + s.end_time + interval '2 hours')
          ELSE (us.working_date + interval '1 day' + s.end_time + interval '2 hours')
        END
      ) < NOW()
      AND st.timesheet_id IS NULL;
  `;
  try {
    const res = await pool.query(query);
    console.log(`🌙 [CRON] Đã chốt vắng mặt cho ${res.rowCount} ca đã kết thúc.`);
  } catch (err) {
    console.error("❌ [CRON ERROR]:", err.message);
  }
};

module.exports = { upsertShiftTimesheet, markAbsentForToday, findUserActiveShift, determineNextEvent };