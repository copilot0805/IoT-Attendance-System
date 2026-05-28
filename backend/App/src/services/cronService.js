const cron = require('node-cron');
const pool = require('../db');

// Hàm chạy tự động để quét và chốt sổ chấm công
const closeAttendanceForYesterday = async () => {
    console.log("🕒 [CRONJOB] Bắt đầu tiến trình chốt sổ chấm công...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const absentQuery = `
            INSERT INTO shift_timesheets 
                (user_id, shift_id, working_date, status, working_hour, first_check_in, last_check_out)
            SELECT 
                us.user_id, 
                us.shift_id, 
                us.working_date, 
                'ABSENT',
                0,
                NULL,
                NULL
            FROM user_shifts us
            LEFT JOIN shift_timesheets st 
                ON us.user_id = st.user_id 
                AND us.shift_id = st.shift_id 
                AND us.working_date = st.working_date
            WHERE us.working_date = CURRENT_DATE - INTERVAL '1 day'
              AND st.user_id IS NULL
            ON CONFLICT (user_id, shift_id, working_date) 
            DO NOTHING;  -- An toàn nếu có race condition
        `;
        const absentRes = await client.query(absentQuery);
        console.log(`❌ [CRON] Đã ghi nhận ${absentRes.rowCount} lượt ABSENT (Vắng mặt không phép).`);

        await client.query('COMMIT');
        console.log("✅ [CRONJOB] Chốt sổ chấm công thành công!");

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("🔥 [CRONJOB ERROR] Lỗi khi chạy chốt sổ:", error.message);
    } finally {
        client.release();
    }
};

const initCronJobs = () => {
    cron.schedule('0 12 * * *', () => {
        closeAttendanceForYesterday();
    }, {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh" 
    });
    
    console.log("⏰ Cronjob đã được kích hoạt (Sẽ chạy chốt sổ vào 12:00 trưa hàng ngày).");
};

module.exports = { initCronJobs };