const pool = require("../db");

const upsertDailyTimesheet = async (userId) => {
  const checkInLimit = process.env.CHECKIN_TIME || '08:15:00';
  const query = `
    INSERT INTO daily_timesheets (user_id, work_date, first_check_in, last_check_out, working_hours, status)
    SELECT 
        user_id, 
        CURRENT_DATE,
        MIN(event_time), 
        MAX(event_time),
        COALESCE(EXTRACT(EPOCH FROM (MAX(event_time) - MIN(event_time))) / 3600, 0),
        CASE 
            WHEN MIN(event_time) IS NULL THEN 'ABSENT'
            WHEN MIN(event_time)::time > '08:15:00' THEN 'LATE'
            ELSE 'PRESENT'
        END
    FROM attendance_events
    WHERE user_id = $1 AND DATE(event_time) = CURRENT_DATE
    GROUP BY user_id, CURRENT_DATE
    ON CONFLICT (user_id, work_date) 
    DO UPDATE SET 
        first_check_in = EXCLUDED.first_check_in,
        last_check_out = EXCLUDED.last_check_out,
        working_hours = EXCLUDED.working_hours,
        status = EXCLUDED.status;
  `;
  try {
    await pool.query(query, [userId, checkInLimit]);
    console.log(`📊 [SERVICE] Đã cập nhật Timesheet cho: ${userId}`);
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
