const pool = require("../db");

// ==========================================
// HELPERS
// ==========================================
const isValidTime = (time) => /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(time);
const isValidDate = (date) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const d = new Date(date);
    return !isNaN(d.getTime()) && d.toISOString().split('T')[0] === date;
};

const hasOverlapWithDate = (workingDate, aStartStr, aEndStr, bStartStr, bEndStr) => {
    const createDate = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}`);
    
    let aStart = createDate(workingDate, aStartStr);
    let aEnd = createDate(workingDate, aEndStr);
    let bStart = createDate(workingDate, bStartStr);
    let bEnd = createDate(workingDate, bEndStr);

    if (aEnd < aStart) aEnd.setDate(aEnd.getDate() + 1);
    if (bEnd < bStart) bEnd.setDate(bEnd.getDate() + 1);

    return aStart < bEnd && aEnd > bStart;
};

// ==========================================
// SERVICES
// ==========================================

const createShiftService = async (start_time, end_time) => {
    if (!isValidTime(start_time) || !isValidTime(end_time)) throw new Error("INVALID_TIME");
    if (start_time === end_time) throw new Error("SAME_TIME");

    const checkDuplicate = await pool.query(
        `SELECT * FROM shifts WHERE start_time = $1 AND end_time = $2 AND is_active = TRUE`, 
        [start_time, end_time]
    );
    if (checkDuplicate.rows.length > 0) throw new Error("DUPLICATE_SHIFT");

    const result = await pool.query(
        `INSERT INTO shifts (start_time, end_time) VALUES ($1, $2) RETURNING *`, 
        [start_time, end_time]
    );
    return result.rows[0];
};

const updateShiftService = async (id, start_time, end_time) => {
    if (!isValidTime(start_time) || !isValidTime(end_time)) throw new Error("INVALID_TIME");
    if (start_time === end_time) throw new Error("SAME_TIME");

    const checkDuplicate = await pool.query(
        `SELECT * FROM shifts WHERE start_time = $1 AND end_time = $2 AND shift_id != $3 AND is_active = TRUE`, 
        [start_time, end_time, id]
    );
    if (checkDuplicate.rows.length > 0) throw new Error("DUPLICATE_SHIFT");

    const checkUsage = await pool.query(`SELECT 1 FROM user_shifts WHERE shift_id = $1 LIMIT 1`, [id]);
    if (checkUsage.rows.length > 0) throw new Error("SHIFT_IN_USE");

    const result = await pool.query(
        `UPDATE shifts SET start_time = $1, end_time = $2 WHERE shift_id = $3 AND is_active = TRUE RETURNING *`, 
        [start_time, end_time, id]
    );

    if (result.rows.length === 0) throw new Error("NOT_FOUND");
    return result.rows[0];
};

const deleteShiftService = async (shiftId) => {
    // 1. Kiểm tra xem ca này có đang được phân cho ai trong tương lai không
    const checkUsage = await pool.query(`
        SELECT 1 FROM user_shifts 
        WHERE shift_id = $1 AND working_date >= CURRENT_DATE
        LIMIT 1
    `, [shiftId]);

    if (checkUsage.rows.length > 0) {
        throw new Error("CANNOT_DELETE_ACTIVE_SHIFT"); 
    }

    // 2. Tiến hành Soft Delete (Đã thêm điều kiện is_active = TRUE)
    const result = await pool.query(`
        UPDATE shifts 
        SET is_active = FALSE 
        WHERE shift_id = $1 AND is_active = TRUE 
        RETURNING *
    `, [shiftId]);

    // 3. Chặn tình huống rác: Ca không tồn tại hoặc đã bị xóa từ trước
    if (result.rows.length === 0) {
        throw new Error("NOT_FOUND"); 
    }

    return result.rows[0];
};

const getAllShiftsService = async () => {
    const result = await pool.query(`SELECT * FROM shifts WHERE is_active = TRUE ORDER BY start_time ASC`);
    return result.rows;
};

const assignUserShiftService = async (user_id, shift_id, working_date) => {
    if (!isValidDate(working_date)) throw new Error("INVALID_DATE");

    const shiftCheck = await pool.query(
        `SELECT start_time, end_time FROM shifts WHERE shift_id = $1 AND is_active = TRUE`, 
        [shift_id]
    );
    if (shiftCheck.rows.length === 0) throw new Error("NOT_FOUND");
    const { start_time: newStart, end_time: newEnd } = shiftCheck.rows[0];

    const existingShifts = await pool.query(`
        SELECT s.start_time, s.end_time FROM user_shifts us
        JOIN shifts s ON us.shift_id = s.shift_id
        WHERE us.user_id = $1 AND us.working_date = $2
    `, [user_id, working_date]);

    if (existingShifts.rows.length >= 2) throw new Error("MAX_SHIFTS");

    for (let shift of existingShifts.rows) {    
        if (hasOverlapWithDate(working_date, newStart, newEnd, shift.start_time, shift.end_time)) {        
            throw new Error(`OVERLAP: Ca mới bị đè thời gian với ca (${shift.start_time} - ${shift.end_time})`);    
        }
    }

    try {
        const result = await pool.query(
            `INSERT INTO user_shifts (user_id, shift_id, working_date) VALUES ($1, $2, $3) RETURNING *`,
            [user_id, shift_id, working_date]
        );
        return result.rows[0];
    } catch (error) {
        if (error.code === '23505') throw new Error("ALREADY_ASSIGNED");
        if (error.code === '23503') throw new Error("USER_NOT_FOUND");
        throw error;
    }
};

const assignBulkUserShiftsService = async (assignments) => {
    if (!Array.isArray(assignments) || assignments.length === 0) throw new Error("INVALID_PAYLOAD");

    const client = await pool.connect(); 
    try {
        await client.query('BEGIN'); 
        let insertedCount = 0;

        for (const item of assignments) {
            if (!isValidDate(item.working_date)) throw new Error(`Ngày ${item.working_date} không hợp lệ`);

            const shiftRes = await client.query(
                `SELECT start_time, end_time FROM shifts WHERE shift_id = $1 AND is_active = TRUE`, 
                [item.shift_id]
            );
            if (shiftRes.rows.length === 0) throw new Error(`Ca làm việc ID ${item.shift_id} không tồn tại hoặc bị khóa`);
            const { start_time: newStart, end_time: newEnd } = shiftRes.rows[0];

            const existingShifts = await client.query(`
                SELECT s.start_time, s.end_time FROM user_shifts us
                JOIN shifts s ON us.shift_id = s.shift_id
                WHERE us.user_id = $1 AND us.working_date = $2
            `, [item.user_id, item.working_date]);

            if (existingShifts.rows.length >= 2) throw new Error(`Nhân viên ${item.user_id} đã max 2 ca ngày ${item.working_date}`);

            for (const shift of existingShifts.rows) {
                if (hasOverlapWithDate(item.working_date, newStart, newEnd, shift.start_time, shift.end_time)) {
                    throw new Error(`Xung đột ca: Nhân viên ${item.user_id} ngày ${item.working_date} bị đè giờ`);
                }
            }

            const insertResult = await client.query(
                `INSERT INTO user_shifts (user_id, shift_id, working_date) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, 
                [item.user_id, item.shift_id, item.working_date]
            );
            if (insertResult.rowCount > 0) insertedCount++;
        }

        await client.query('COMMIT'); 
        return insertedCount;
    } catch (error) {
        await client.query('ROLLBACK'); 
        throw error; 
    } finally {
        client.release(); 
    }
};

const getRosterService = async (start_date, end_date, user_id) => {
    if (!isValidDate(start_date) || !isValidDate(end_date)) throw new Error("INVALID_DATE");

    let query = `
        SELECT u.user_id, u.full_name, us.working_date, s.shift_id, s.start_time, s.end_time
        FROM user_shifts us
        JOIN users u ON us.user_id = u.user_id
        JOIN shifts s ON us.shift_id = s.shift_id
        WHERE us.working_date >= $1 AND us.working_date <= $2
    `;
    const params = [start_date, end_date];

    if (user_id) {
        query += ` AND us.user_id = $3`;
        params.push(user_id);
    }

    query += ` ORDER BY us.working_date ASC, s.start_time ASC, u.full_name ASC`;
    const result = await pool.query(query, params);
    return result.rows;
};

const removeUserShiftService = async (user_id, shift_id, working_date) => {
    const result = await pool.query(
        `DELETE FROM user_shifts WHERE user_id = $1 AND shift_id = $2 AND working_date = $3 RETURNING *`, 
        [user_id, shift_id, working_date]
    );
    if (result.rows.length === 0) throw new Error("NOT_FOUND");
    return true;
};

module.exports = {
    createShiftService, updateShiftService, deleteShiftService, getAllShiftsService,
    assignUserShiftService, assignBulkUserShiftsService, getRosterService, removeUserShiftService
};