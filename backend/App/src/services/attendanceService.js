const pool = require("../db");

// Khoảng thời gian cho phép điểm danh sớm/trễ
const BUFFER_BEFORE = 30 * 60 * 1000; // 30 phút
const BUFFER_AFTER  = 0; 

const findUserActiveShift = async (userId) => {
  const now = new Date();

  // 1. Lấy tất cả ca làm việc của user trong ngày hôm nay (và ca đêm hôm qua nếu có)
  const query = `
    SELECT s.shift_id, s.start_time, s.end_time, us.working_date
    FROM user_shifts us
    JOIN shifts s ON us.shift_id = s.shift_id
    WHERE us.user_id = $1 
      AND us.working_date >= CURRENT_DATE - INTERVAL '1 day'
      AND us.working_date <= CURRENT_DATE
    ORDER BY us.working_date DESC, s.start_time DESC
  `;

  const result = await pool.query(query, [userId]);

  if (result.rows.length === 0) {
    return null; // Không có lịch làm việc
  }

  // 2. Duyệt qua từng ca làm việc để tìm "Ca mục tiêu"
  for (const row of result.rows) {
    const { start_time, end_time, working_date, shift_id } = row;

    // Ép kiểu Date cho Start và End
    const d = new Date(working_date);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let shiftStart = new Date(`${dateStr}T${start_time}+07:00`);
    let shiftEnd   = new Date(`${dateStr}T${end_time}+07:00`);

    // Xử lý ca đêm qua ngày
    if (shiftEnd < shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);

    // Tính vùng đệm cho phép chấm công của ca này
    const validStart = new Date(shiftStart.getTime() - BUFFER_BEFORE);
    const validEnd   = new Date(shiftEnd.getTime() + BUFFER_AFTER);

    // Bỏ qua nếu thời gian hiện tại vẫn chưa đến giờ cho phép Check-in của ca này
    if (now < validStart) {
        continue; 
    }

    // Nếu thời gian hiện tại đã vượt qua giờ đóng ca quá lâu (hết hạn chấm công ca này)
    if (now > validEnd) {
        continue;
    }
    return { activeShift: row, shiftStartFull: shiftStart, shiftEndFull: shiftEnd};
  }
  return null; 
};



// Cập nhật bảng công theo Ca làm việc (Giữ nguyên logic của bạn, chỉ thêm chặn lỗi getTime)
const upsertShiftTimesheet = async (userId, shiftId, workingDate, name, inTime,sStart, sEnd) => {
  try {
    let status = 'PRESENT';
    let totalMs = 0;
    const GRACE = 5 * 60 * 1000; // 5 phút ân hạn cho việc đi trễ

    const isLate = inTime > new Date(sStart.getTime() + GRACE);

    if (isLate) {
      status = 'LATE';
      totalMs = sEnd - inTime;
    }
    else{totalMs = sEnd - sStart;}
    const workingHour = Number((totalMs / 3600000).toFixed(2));
    await pool.query(`
      INSERT INTO shift_timesheets 
      (user_id, shift_id, working_date, first_check_in, last_check_out, working_hour, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING
    `, [userId, shiftId, workingDate, inTime, sEnd, workingHour, status]);

    console.log(`📊 ${name} : ${status}`);

  } catch (err) {
    console.error("❌ [SERVICE ERROR]:", err.message);
  }
};

module.exports = { upsertShiftTimesheet, findUserActiveShift };