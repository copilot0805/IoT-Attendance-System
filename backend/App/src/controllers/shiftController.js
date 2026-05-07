const shiftService = require('../services/shiftService');

const createShift = async (req, res) => {
    try {
        const { start_time, end_time } = req.body;
        if (!start_time || !end_time) return res.status(400).json({ error: "Thiếu thời gian" });

        const newShift = await shiftService.createShiftService(start_time, end_time);
        return res.status(201).json({ message: "Tạo ca thành công", data: newShift });
    } catch (error) {
        if (error.message === "INVALID_TIME") return res.status(400).json({ error: "Thời gian không hợp lệ. Format chuẩn: HH:MM:SS" });
        if (error.message === "SAME_TIME") return res.status(400).json({ error: "Thời gian không được trùng nhau" });
        if (error.message === "DUPLICATE_SHIFT") return res.status(409).json({ error: "Khung giờ ca làm việc này đã tồn tại" });
        return res.status(500).json({ error: "Lỗi hệ thống khi tạo ca" });
    }
};

const updateShift = async (req, res) => {
    try {
        const { start_time, end_time } = req.body;
        if (!start_time || !end_time) return res.status(400).json({ error: "Thiếu thời gian" });

        const updatedShift = await shiftService.updateShiftService(req.params.id, start_time, end_time);
        return res.status(200).json({ message: "Cập nhật thành công", data: updatedShift });
    } catch (error) {
        if (error.message === "INVALID_TIME") return res.status(400).json({ error: "Thời gian không hợp lệ." });
        if (error.message === "SAME_TIME") return res.status(400).json({ error: "Thời gian không được trùng nhau" });
        if (error.message === "DUPLICATE_SHIFT") return res.status(409).json({ error: "Khung giờ ca làm việc này đã tồn tại" });
        if (error.message === "SHIFT_IN_USE") return res.status(409).json({ error: "Không thể sửa giờ vì ca này đã được phân lịch." });
        if (error.message === "NOT_FOUND") return res.status(404).json({ error: "Không tìm thấy ca (hoặc ca đã bị ẩn)" });
        return res.status(500).json({ error: "Lỗi hệ thống khi cập nhật ca" });
    }
};

const deleteShift = async (req, res) => {
    try {
        await shiftService.deleteShiftService(req.params.id);
        return res.status(200).json({ message: "Đã ẩn ca làm việc an toàn" });
    } catch (error) {
        if (error.message === "NOT_FOUND") return res.status(404).json({ error: "Không tìm thấy ca hoặc ca đã bị xóa" });
        return res.status(500).json({ error: "Lỗi hệ thống khi xóa ca" });
    }
};

const getAllShifts = async (req, res) => {
    try {
        const shifts = await shiftService.getAllShiftsService();
        return res.status(200).json(shifts);
    } catch (error) {
        return res.status(500).json({ error: "Lỗi lấy danh sách ca làm việc" });
    }
};

const assignUserShift = async (req, res) => {
    try {
        const { user_id, shift_id, working_date } = req.body;
        if (!user_id || !shift_id || !working_date) return res.status(400).json({ error: "Dữ liệu đầu vào thiếu" });

        const assigned = await shiftService.assignUserShiftService(user_id, shift_id, working_date);
        return res.status(201).json({ message: "Gán ca thành công", data: assigned });
    } catch (error) {
        if (error.message === "INVALID_DATE") return res.status(400).json({ error: "Ngày không hợp lệ" });
        if (error.message === "NOT_FOUND") return res.status(404).json({ error: "Ca làm việc không tồn tại hoặc đã bị khóa" });
        if (error.message === "MAX_SHIFTS") return res.status(400).json({ error: "Nhân viên đã đạt giới hạn 2 ca/ngày" });
        if (error.message.includes("OVERLAP")) return res.status(409).json({ error: error.message });
        if (error.message === "ALREADY_ASSIGNED") return res.status(409).json({ error: "Nhân viên đã được gán ca này rồi" });
        if (error.message === "USER_NOT_FOUND") return res.status(400).json({ error: "Nhân viên không tồn tại" });
        return res.status(500).json({ error: "Lỗi hệ thống khi gán ca" });
    }
};

const assignBulkUserShifts = async (req, res) => {
    try {
        const insertedCount = await shiftService.assignBulkUserShiftsService(req.body.assignments);
        return res.status(201).json({ message: `Đã phân bổ ${insertedCount} ca làm việc.` });
    } catch (error) {
        if (error.message === "INVALID_PAYLOAD") return res.status(400).json({ error: "Payload không hợp lệ" });
        return res.status(409).json({ error: error.message });
    }
};

const getRoster = async (req, res) => {
    try {
        const { start_date, end_date, user_id } = req.query;
        if (!start_date || !end_date) return res.status(400).json({ error: "Cần start_date và end_date" });

        const roster = await shiftService.getRosterService(start_date, end_date, user_id);
        return res.status(200).json(roster);
    } catch (error) {
        if (error.message === "INVALID_DATE") return res.status(400).json({ error: "Ngày không hợp lệ" });
        return res.status(500).json({ error: "Lỗi hệ thống khi lấy danh sách" });
    }
};

const removeUserShift = async (req, res) => {
    try {
        const { user_id, shift_id, working_date } = req.query;
        if (!user_id || !shift_id || !working_date) return res.status(400).json({ error: "Thiếu tham số" });

        await shiftService.removeUserShiftService(user_id, shift_id, working_date);
        return res.status(200).json({ message: "Đã hủy ca thành công" });
    } catch (error) {
        if (error.message === "NOT_FOUND") return res.status(404).json({ error: "Không tìm thấy lịch phân ca này" });
        return res.status(500).json({ error: "Lỗi hệ thống khi hủy ca" });
    }
};

module.exports = {
    createShift, getAllShifts, updateShift, deleteShift, 
    assignUserShift, getRoster, removeUserShift, assignBulkUserShifts
};