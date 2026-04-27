const pool = require("../db");

const upsertDailyTimesheet = async (userId,name) => {
  const checkInLimit = process.env.CHECKIN_TIME || '08:15:00';
  const query = `
    -- 1. CTE tạo bảng tạm: Ghép cặp mỗi dòng sự kiện với sự kiện quẹt thẻ liền kề tiếp theo của nó
    WITH ordered_events AS (
        SELECT 
            user_id,
            event_time,
            event_type,
            -- Hàm LEAD giúp lấy event_time và event_type của dòng tiếp theo
            LEAD(event_time) OVER (PARTITION BY user_id ORDER BY event_time) as next_time,
            LEAD(event_type) OVER (PARTITION BY user_id ORDER BY event_time) as next_type
        FROM attendance_events
        WHERE user_id = $1 AND DATE(event_time) = CURRENT_DATE
    ),
    
    -- 2. CTE tính tổng giờ: Chỉ lấy những cặp thỏa mãn điều kiện CHECK_IN và kế tiếp là CHECK_OUT
    calculated_hours AS (
        SELECT 
            user_id,
            SUM(EXTRACT(EPOCH FROM (next_time - event_time)) / 3600) as real_working_hours
        FROM ordered_events
        WHERE event_type = 'CHECK_IN' AND next_type = 'CHECK_OUT'
        GROUP BY user_id
    )
    
    -- 3. Cập nhật vào bảng daily_timesheets
    INSERT INTO daily_timesheets (user_id, work_date, first_check_in, last_check_out, working_hours, status)
    SELECT 
        e.user_id, 
        CURRENT_DATE, 
        
        -- Lấy giờ vào làm đầu tiên
        MIN(e.event_time), 
        
        -- Lấy giờ tan làm cuối cùng (Chỉ lấy khi hành động là CHECK_OUT)
        MAX(CASE WHEN e.event_type = 'CHECK_OUT' THEN e.event_time ELSE NULL END),
        
        -- Lấy tổng giờ đã tính ở bước 2
        COALESCE((SELECT real_working_hours FROM calculated_hours), 0),
        
        -- Xét trạng thái LATE dựa vào lần quẹt thẻ đầu ngày
        CASE 
            WHEN MIN(e.event_time) IS NULL THEN 'ABSENT'
            WHEN MIN(e.event_time)::time > $2::time THEN 'LATE' 
            ELSE 'PRESENT'
        END
    FROM attendance_events e
    WHERE e.user_id = $1 AND DATE(e.event_time) = CURRENT_DATE
    GROUP BY e.user_id
    ON CONFLICT (user_id, work_date) 
    DO UPDATE SET 
        first_check_in = EXCLUDED.first_check_in,
        last_check_out = EXCLUDED.last_check_out,
        -- Cập nhật giờ làm thực tế
        working_hours = EXCLUDED.working_hours,
        status = EXCLUDED.status;
  `;
  try {
    await pool.query(query, [userId, checkInLimit]);
    console.log(`📊 [SERVICE] Đã cập nhật Timesheet cho ${name}`);
  } catch (err) {
    console.error("❌ [SERVICE ERROR]:", err.message);
  }
};

const markAbsentForToday = async () => {
  const query = `
    INSERT INTO daily_timesheets (user_id, work_date, status)
    SELECT u.user_id, CURRENT_DATE, 'ABSENT' FROM users u
    LEFT JOIN daily_timesheets dt ON u.user_id = dt.user_id AND dt.work_date = CURRENT_DATE
    WHERE dt.timesheet_id IS NULL
    ON CONFLICT (user_id, work_date) DO NOTHING;
  `;
  try {
    const res = await pool.query(query);
    console.log(`🌙 [CRON] Đã chốt vắng mặt cho ${res.rowCount} người.`);
  } catch (err) {
    console.error("❌ [CRON ERROR]:", err.message);
  }
};

module.exports = { upsertDailyTimesheet, markAbsentForToday };
