const pool = require("../db");

// ==========================================
// HELPERS: VALIDATION & LOGIC
// ==========================================

const isValidTime = (time) => /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(time);
const isValidDate = (date) => !isNaN(new Date(date).getTime());

/**
 * Kiểm tra chồng chéo thời gian an toàn (Hỗ trợ cả ca đêm)
 * Bằng cách ghép working_date vào time để tạo thành Timestamp chuẩn.
 */
const hasOverlapWithDate = (workingDate, aStartStr, aEndStr, bStartStr, bEndStr) => {
    const createDate = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}`);
    
    let aStart = createDate(workingDate, aStartStr);
    let aEnd = createDate(workingDate, aEndStr);
    let bStart = createDate(workingDate, bStartStr);
    let bEnd = createDate(workingDate, bEndStr);

    // Nếu giờ kết thúc < giờ bắt đầu -> vắt qua ngày hôm sau
    if (aEnd < aStart) aEnd.setDate(aEnd.getDate() + 1);
    if (bEnd < bStart) bEnd.setDate(bEnd.getDate() + 1);

    return aStart < bEnd && aEnd > bStart;
};

// ==========================================
// 1. API QUẢN LÝ CA LÀM VIỆC (SHIFTS)
// ==========================================

const createShift = async (req, res) => {
    try {
        const { start_time, end_time } = req.body;

        if (!start_time || !end_time || !isValidTime(start_time) || !isValidTime(end_time)) {
            return res.status(400).json({ error: "Thời gian không hợp lệ. Format chuẩn: HH:MM:SS" });
        }
        if (start_time === end_time) {
            return res.status(400).json({ error: "Thời gian bắt đầu và kết thúc không được trùng nhau" });
        }

        const checkDuplicate = await pool.query(
            `SELECT * FROM shifts WHERE start_time = $1 AND end_time = $2 AND is_active = TRUE`, 
            [start_time, end_time]
        );
        if (checkDuplicate.rows.length > 0) {
            return res.status(409).json({ error: "Khung giờ ca làm việc này đã tồn tại" });
        }

        const result = await pool.query(
            `INSERT INTO shifts (start_time, end_time) VALUES ($1, $2) RETURNING *`, 
            [start_time, end_time]
        );

        return res.status(201).json({ message: "Tạo ca thành công", data: result.rows[0] });
    } catch (error) {
        console.error("❌ Lỗi createShift:", error.message);
        return res.status(500).json({ error: "Lỗi hệ thống khi tạo ca" });
    }
};

const updateShift = async (req, res) => {
    try {
        const { id } = req.params;
        const { start_time, end_time } = req.body;

        if (!start_time || !end_time || !isValidTime(start_time) || !isValidTime(end_time)) {
            return res.status(400).json({ error: "Thời gian không hợp lệ. Format chuẩn: HH:MM:SS" });
        }
        if (start_time === end_time) {
            return res.status(400).json({ error: "Thời gian không được trùng nhau" });
        }

        const checkDuplicate = await pool.query(
            `SELECT * FROM shifts WHERE start_time = $1 AND end_time = $2 AND shift_id != $3 AND is_active = TRUE`, 
            [start_time, end_time, id]
        );
        if (checkDuplicate.rows.length > 0) {
            return res.status(409).json({ error: "Khung giờ ca làm việc này đã tồn tại" });
        }

        const checkUsage = await pool.query(
            `SELECT 1 FROM user_shifts WHERE shift_id = $1 LIMIT 1`,
            [id]
        );
        
        if (checkUsage.rows.length > 0) {
            return res.status(409).json({ 
                error: "Không thể sửa giờ vì ca này đã được phân lịch cho nhân viên. Vui lòng tạo ca mới nếu muốn thay đổi." 
            });
        }

        const result = await pool.query(
            `UPDATE shifts SET start_time = $1, end_time = $2 WHERE shift_id = $3 AND is_active = TRUE RETURNING *`, 
            [start_time, end_time, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Không tìm thấy ca (hoặc ca đã bị ẩn)" });
        return res.status(200).json({ message: "Cập nhật thành công", data: result.rows[0] });
    } catch (error) {
        return res.status(500).json({ error: "Lỗi hệ thống khi cập nhật ca" });
    }
};

const deleteShift = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE shifts SET is_active = FALSE WHERE shift_id = $1 AND is_active = TRUE RETURNING shift_id`, 
            [id]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ error: "Không tìm thấy ca hoặc ca đã bị xóa" });
        return res.status(200).json({ message: "Đã ẩn ca làm việc an toàn" });
    } catch (error) {
        return res.status(500).json({ error: "Lỗi hệ thống khi xóa ca" });
    }
};

const getAllShifts = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM shifts WHERE is_active = TRUE ORDER BY start_time ASC`);
        return res.status(200).json(result.rows);
    } catch (error) {
        return res.status(500).json({ error: "Lỗi lấy danh sách ca làm việc" });
    }
};

// ==========================================
// 2. API PHÂN CA NHÂN VIÊN (USER_SHIFTS)
// ==========================================

const assignUserShift = async (req, res) => {
    try {
        const { user_id, shift_id, working_date } = req.body;

        if (!user_id || !shift_id || !working_date || !isValidDate(working_date)) {
            return res.status(400).json({ error: "Dữ liệu đầu vào không hợp lệ hoặc thiếu" });
        }

        // ĐÃ FIX: Chỉ cho phép gán vào ca đang ACTIVE
        const shiftCheck = await pool.query(
            `SELECT start_time, end_time FROM shifts WHERE shift_id = $1 AND is_active = TRUE`, 
            [shift_id]
        );
        if (shiftCheck.rows.length === 0) return res.status(404).json({ error: "Ca làm việc không tồn tại hoặc đã bị khóa" });
        
        const { start_time: newStart, end_time: newEnd } = shiftCheck.rows[0];

        // Lấy danh sách ca hiện tại của user trong ngày
        const existingShifts = await pool.query(`
            SELECT s.start_time, s.end_time 
            FROM user_shifts us
            JOIN shifts s ON us.shift_id = s.shift_id
            WHERE us.user_id = $1 AND us.working_date = $2
        `, [user_id, working_date]);

        if (existingShifts.rows.length >= 2) {
            return res.status(400).json({ error: "Nhân viên đã đạt giới hạn 2 ca/ngày" });
        }

        // ĐÃ FIX: Dùng Helper kiểm tra Overlap an toàn tuyệt đối với working_date
        for (let shift of existingShifts.rows) {    
            if (hasOverlapWithDate(working_date, newStart, newEnd, shift.start_time, shift.end_time)) {        
                return res.status(409).json({             
                    error: `Ca mới bị đè thời gian với ca (${shift.start_time} - ${shift.end_time})`         
                });    
            }
        }

        const query = `INSERT INTO user_shifts (user_id, shift_id, working_date) VALUES ($1, $2, $3) RETURNING *`;
        const result = await pool.query(query, [user_id, shift_id, working_date]);

        return res.status(201).json({ message: "Gán ca thành công", data: result.rows[0] });

    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ error: "Nhân viên đã được gán ca này rồi" });
        if (error.code === '23503') return res.status(400).json({ error: "Nhân viên không tồn tại" });
        return res.status(500).json({ error: "Lỗi hệ thống khi gán ca" });
    }
};

const assignBulkUserShifts = async (req, res) => {
    const client = await pool.connect(); 
    try {
        const { assignments } = req.body; 

        if (!Array.isArray(assignments) || assignments.length === 0) {
            return res.status(400).json({ error: "Payload không hợp lệ" });
        }

        await client.query('BEGIN'); 
        let insertedCount = 0;

        for (const item of assignments) {
            if (!isValidDate(item.working_date)) throw new Error(`Ngày ${item.working_date} không hợp lệ`);

            // ĐÃ FIX: Phải check is_active = TRUE
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
        return res.status(201).json({ message: `Đã phân bổ ${insertedCount}/${assignments.length} ca làm việc.` });

    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error("❌ Bulk assign error:", error.message);
        
        // Trả về thẳng message lỗi để FE dễ hiển thị Toast/Alert
        return res.status(409).json({ error: error.message });
    } finally {
        client.release(); 
    }
};

const getRoster = async (req, res) => {
    try {
        const { start_date, end_date, user_id } = req.query;

        if (!start_date || !end_date || !isValidDate(start_date) || !isValidDate(end_date)) {
            return res.status(400).json({ error: "Cần start_date và end_date hợp lệ (YYYY-MM-DD)" });
        }

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
        return res.status(200).json(result.rows);
    } catch (error) {
        return res.status(500).json({ error: "Lỗi hệ thống khi lấy danh sách" });
    }
};

const removeUserShift = async (req, res) => {
    try {
        const { user_id, shift_id, working_date } = req.query;

        if (!user_id || !shift_id || !working_date) {
            return res.status(400).json({ error: "Thiếu tham số (user_id, shift_id, working_date)" });
        }

        const result = await pool.query(
            `DELETE FROM user_shifts WHERE user_id = $1 AND shift_id = $2 AND working_date = $3 RETURNING *`, 
            [user_id, shift_id, working_date]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Không tìm thấy lịch phân ca này" });
        return res.status(200).json({ message: "Đã hủy ca thành công" });
    } catch (error) {
        return res.status(500).json({ error: "Lỗi hệ thống khi hủy ca" });
    }
};

module.exports = {
    createShift, getAllShifts, updateShift, deleteShift, 
    assignUserShift, getRoster, removeUserShift, assignBulkUserShifts
};