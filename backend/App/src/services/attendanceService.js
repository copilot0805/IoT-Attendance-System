const pool = require("../db");
const { uploadToCloudinary } = require("./uploadFile");

// Khoảng thời gian cho phép điểm danh sớm/trễ
const BUFFER_BEFORE = 30 * 60 * 1000; 
const BUFFER_AFTER  = 0; 

const processBackgroundAttendance = async (userId, fullName, imageBuffer, eventId, eventTime) => {
    // 1. UPLOAD ẢNH
    try {
        const image_url = await uploadToCloudinary(imageBuffer);
        await pool.query(`UPDATE attendance_events SET image_url = $1 WHERE event_id = $2`, [image_url, eventId]);
    } catch (err) {
        console.error("❌ [CLOUDINARY ERROR] Lỗi up ảnh:", err.message);
    }

    // 2. TÍNH CÔNG
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
  
        await client.query(`SELECT 1 FROM users WHERE user_id = $1 FOR UPDATE`, [userId]);
        const shiftData = await findUserActiveShift(userId, eventTime);
        if (shiftData) {
            const { activeShift, shiftStartFull, shiftEndFull } = shiftData;
            const { shift_id, working_date } = activeShift;
            
            const eventsRes = await client.query(`
                SELECT 1 FROM shift_timesheets
                WHERE user_id = $1 AND shift_id = $2 AND working_date = $3
            `, [userId, shift_id, working_date]);

            if (eventsRes.rows.length === 0) {
                await upsertShiftTimesheet(client, userId, shift_id, working_date, fullName, eventTime, shiftStartFull, shiftEndFull);
            }
        } 

        await client.query('COMMIT');
        console.log(`📝 [BACKGROUND] Hoàn tất tính công cho ${fullName}`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ [BACKGROUND DB ERROR]:", err.message);
    } finally {
        client.release();
    }
};

const findUserActiveShift = async (userId, checkInTime) => {
  const now = new Date(checkInTime);

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
  if (result.rows.length === 0) return null;

  for (const row of result.rows) {
    const { start_time, end_time, working_date } = row;

    const dateStr = new Date(working_date).toLocaleDateString('sv-SE');
    
    let shiftStart = new Date(`${dateStr}T${start_time}+07:00`);
    let shiftEnd   = new Date(`${dateStr}T${end_time}+07:00`);

    if (shiftEnd < shiftStart) {
        shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    const validStart = new Date(shiftStart.getTime() - BUFFER_BEFORE);
    const validEnd   = new Date(shiftEnd.getTime() + BUFFER_AFTER);

    if (now >= validStart && now <= validEnd) {
        return { activeShift: row, shiftStartFull: shiftStart, shiftEndFull: shiftEnd };
    }
  }
  
  return null; 
};

const upsertShiftTimesheet = async (client, userId, shiftId, workingDate, name, checkInTime, shiftStart, shiftEnd) => {
  try {
    let status = 'PRESENT';
    let totalMs = 0;
    const GRACE = 5 * 60 * 1000; 

    const isLate = checkInTime > new Date(shiftStart.getTime() + GRACE);

    if (isLate) {
      status = 'LATE';
      totalMs = shiftEnd - checkInTime; 
    }
    else {
      totalMs = shiftEnd - shiftStart;
    }
    
    const workingHour = Number((totalMs / 3600000).toFixed(2));

    await client.query(`
      INSERT INTO shift_timesheets 
      (user_id, shift_id, working_date, first_check_in, last_check_out, working_hour, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING
    `, [userId, shiftId, workingDate, checkInTime, shiftEnd, workingHour, status]);

    console.log(`📊 ${name} : ${status}`);

  } catch (err) {
    console.error("❌ [UPSERT SERVICE ERROR]:", err.message);
    throw err;
  }
};

module.exports = { processBackgroundAttendance };