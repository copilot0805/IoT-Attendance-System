const cron = require('node-cron');
const pool = require('../db');

// Hàm chạy tự động để quét và chốt sổ chấm công
const closeAttendanceForYesterday = async () => {
    console.log("🕒 [CRONJOB] Bắt đầu tiến trình chốt sổ chấm công...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // =================================================================
        // NHIỆM VỤ 1: QUÉT NHỮNG NGƯỜI QUÊN CHECK-OUT -> GẮN 'INCOMPLETE'
        // =================================================================
        const incompleteQuery = `
            UPDATE shift_timesheets
            SET status = 'INCOMPLETE'
            WHERE working_date = CURRENT_DATE - INTERVAL '1 day'
              AND last_out IS NULL
              AND status = 'WORKING' 
            RETURNING user_id, shift_id;
        `;
        const incompleteRes = await client.query(incompleteQuery);
        console.log(`⚠️ [CRON] Đã chuyển ${incompleteRes.rowCount} ca thành INCOMPLETE (Quên quét mặt ra về).`);

        // =================================================================
        // NHIỆM VỤ 2: QUÉT NHỮNG NGƯỜI KHÔNG ĐẾN CÔNG TY -> GẮN 'ABSENT'
        // =================================================================
        const absentQuery = `
            INSERT INTO shift_timesheets (user_id, shift_id, working_date, status)
            SELECT us.user_id, us.shift_id, us.working_date, 'ABSENT'
            FROM user_shifts us
            LEFT JOIN shift_timesheets st 
                ON us.user_id = st.user_id 
                AND us.shift_id = st.shift_id 
                AND us.working_date = st.working_date
            WHERE us.working_date = CURRENT_DATE - INTERVAL '1 day'
              AND st.user_id IS NULL -- Điều kiện: Không tồn tại trong bảng công
            RETURNING user_id;
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