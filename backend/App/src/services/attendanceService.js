const pool = require("../db");

// Khoảng thời gian cho phép điểm danh sớm/trễ
const BUFFER_BEFORE = 30 * 60 * 1000; // 30 phút
const BUFFER_AFTER  = 60 * 60 * 1000; // 60 phút

/**
 * TÌM CA LÀM VIỆC MỤC TIÊU (HỖ TRỢ NHIỀU CA/NGÀY)
 * @param {string} userId - UUID của nhân viên
 * @returns {Object} { activeShift, shiftStartFull, shiftEndFull, isCheckIn }
 */
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
    ORDER BY us.working_date ASC, s.start_time ASC
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

    // ==========================================
    // 3. KIỂM TRA LỊCH SỬ ĐỂ CHỐT TRẠNG THÁI 
    // ==========================================
    const logQuery = `
      SELECT event_type 
      FROM attendance_events
      WHERE user_id = $1
        AND event_time >= $2
        AND event_time <= $3
      ORDER BY event_time DESC
      LIMIT 1
    `;
    const logRes = await pool.query(logQuery, [userId, validStart, validEnd]);
    const lastEventType = logRes.rows.length > 0 ? logRes.rows[0].event_type : null;

    if (!lastEventType) {
        return { activeShift: row, shiftStartFull: shiftStart, shiftEndFull: shiftEnd, nextEvent: 'CHECK_IN' };
    } 
    
    if (lastEventType === 'CHECK_IN') {
        return { activeShift: row, shiftStartFull: shiftStart, shiftEndFull: shiftEnd, nextEvent: 'CHECK_OUT' };
    }

    if (lastEventType === 'CHECK_OUT') {
        if (now < shiftEnd) {
             return { activeShift: row, shiftStartFull: shiftStart, shiftEndFull: shiftEnd, nextEvent: 'CHECK_IN' };
        }
    }
  }

  // ==========================================
  // 4. GIỚI HẠN LOGIC "VỚT" (TRÁNH PHÁ DỮ LIỆU CŨ)
  // ==========================================
  const lastCompletedShift = result.rows[result.rows.length - 1];
  
  const { start_time, end_time, working_date } = lastCompletedShift;
  const d = new Date(working_date);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  let shiftStart = new Date(`${dateStr}T${start_time}+07:00`);
  let shiftEnd   = new Date(`${dateStr}T${end_time}+07:00`);
  if (shiftEnd < shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);

  const validStart = new Date(shiftStart.getTime() - BUFFER_BEFORE);
  const validEnd   = new Date(shiftEnd.getTime() + BUFFER_AFTER);

  const MAX_LATE = 2 * 60 * 60 * 1000;
  if (now.getTime() - shiftEnd.getTime() > MAX_LATE) {
      return null; 
  }

  // Xem trạng thái cuối cùng của cái ca cuối cùng này là gì
  const lastLogRes = await pool.query(`
      SELECT event_type FROM attendance_events
      WHERE user_id = $1 AND event_time >= $2 AND event_time <= $3
      ORDER BY event_time DESC LIMIT 1
  `, [userId, validStart, validEnd]);
  const finalEventType = lastLogRes.rows.length > 0 ? lastLogRes.rows[0].event_type : null;

  if (finalEventType === 'CHECK_IN') {
      return {
          activeShift: lastCompletedShift,
          shiftStartFull: shiftStart,
          shiftEndFull: shiftEnd,
          nextEvent: 'CHECK_OUT' 
      };
  }

  return null; 
};



// Cập nhật bảng công theo Ca làm việc (Giữ nguyên logic của bạn, chỉ thêm chặn lỗi getTime)
const upsertShiftTimesheet = async (userId, shiftId, workingDate, name) => {
  try {
    const shiftRes = await pool.query(
      `SELECT start_time, end_time FROM shifts WHERE shift_id = $1`, 
      [shiftId]
    );

    if (shiftRes.rows.length === 0) return; // Chặn lỗi không tìm thấy ca

    const { start_time, end_time } = shiftRes.rows[0];

    const d = new Date(workingDate);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    let shiftStart = new Date(`${dateStr}T${start_time}+07:00`);
    let shiftEnd   = new Date(`${dateStr}T${end_time}+07:00`);

    if (shiftEnd < shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);

    if(!shiftStart || !shiftEnd) return;

    const searchStart = new Date(shiftStart.getTime() - BUFFER_BEFORE);
    const searchEnd   = new Date(shiftEnd.getTime() + BUFFER_AFTER);

    const eventsRes = await pool.query(`
      SELECT event_type, event_time
      FROM attendance_events
      WHERE user_id = $1
        AND event_time >= $2
        AND event_time <= $3
      ORDER BY event_time ASC
    `, [userId, searchStart, searchEnd]);

    const events = eventsRes.rows;

    const firstCheckInEvent = events.find(e => {
      if (e.event_type !== 'CHECK_IN') return false;
      const t = new Date(e.event_time);
      return t >= new Date(shiftStart.getTime() - BUFFER_BEFORE) &&
             t <= new Date(shiftStart.getTime() + 4 * 60 * 60 * 1000);
    });

    const first_in = firstCheckInEvent 
      ? new Date(firstCheckInEvent.event_time)
      : null;

    let last_out = null;
    let totalMs = 0;
    let current_in = null;

    for (const e of events) {
      const t = new Date(e.event_time);

      if (e.event_type === 'CHECK_IN') {
        if (!current_in) current_in = t;
      } 
      else if (e.event_type === 'CHECK_OUT') {
        if (!current_in) continue; 

        if (t > current_in) {
          const actualStart = new Date(Math.max(current_in, shiftStart));
          const actualEnd   = new Date(Math.min(t, shiftEnd));

          if (actualEnd > actualStart) {
            totalMs += (actualEnd - actualStart);
          }

          last_out = t;
          current_in = null;
        }
      }
    }

    const workingHour = Number((totalMs / 3600000).toFixed(2));

    let status = 'PRESENT';
    const now = new Date();
    const GRACE = 5 * 60 * 1000; // 5 phút ân hạn cho việc đi trễ

    const isLate = first_in && first_in > new Date(shiftStart.getTime() + GRACE);

    if (current_in && now <= shiftEnd) {
      status = 'WORKING';
    } 
    else if (!first_in || !last_out || current_in) {
      status = 'INCOMPLETE';
    } 
    else if (isLate) {
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
        status = EXCLUDED.status
    `, [userId, shiftId, workingDate, first_in, last_out, workingHour, status]);

    console.log(`📊 ${name} | ${workingHour}h | ${status}`);

  } catch (err) {
    console.error("❌ [SERVICE ERROR]:", err.message);
  }
};

module.exports = { upsertShiftTimesheet, findUserActiveShift };