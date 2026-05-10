const { enrollUserService, updatePhotoService, deleteUserService,getUsersService } = require('../services/adminService.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const pool = require('../db');


const postEnrollUserAPI = async (req, res) => {
    try {
        const { full_name, email, password, role } = req.body;
        const photo = req.file;

        // 1. Validate dữ liệu đầu vào cơ bản
        if (!full_name || !email || !password || !photo) {
            return res.status(400).json({ error: 'Vui lòng cung cấp đủ thông tin (full_name, email, password) và ảnh khuôn mặt (photo)' });
        }

        // 2. Đẩy logic xử lý xuống Service
        const result = await enrollUserService({ full_name, email, password, role }, photo);

        // 3. Trả kết quả thành công
        return res.status(201).json({
            message: 'Tạo người dùng và đăng ký khuôn mặt thành công!',
            data: result.data
        });

    } catch (error) {
        // 4. Xử lý các mã lỗi được ném ra từ Service
        if (error.message.startsWith('AI_ERROR:')) {
            return res.status(400).json({ error: error.message.replace('AI_ERROR: ', '') });
        }
        if (error.message.startsWith('EMAIL_EXISTS:')) {
            return res.status(409).json({ error: error.message.replace('EMAIL_EXISTS: ', '') });
        }
        return res.status(500).json({ error: 'Lỗi hệ thống máy chủ' });
    }
};

const updatePhotoAPI = async (req, res) => {
    try {
        const id = req.params.id;
        const photo = req.file;
        if (!photo) {
            return res.status(400).json({ error: 'Vui lòng cung cấp ảnh khuôn mặt (photo)' });
        }

        const result = await updatePhotoService(id, photo);

        // 3. Trả kết quả thành công
        return res.status(201).json({
            message: 'Cập nhật ảnh khuôn mặt thành công!',
            data: result.data
        });

    } catch (error) {
        console.error('Controller Error (updatePhotoAPI):', error.message || error);
        if (error.message.startsWith('AI_ERROR:')) {
            return res.status(400).json({ error: error.message.replace('AI_ERROR: ', '') });
        }
        if (error.message.startsWith('SAME_PHOTO:')) {
            return res.status(400).json({ error: error.message.replace('SAME_PHOTO: ', '') });
        }
        if (error.message.startsWith('USER_NOT_FOUND:')) {
            return res.status(404).json({ error: error.message.replace('USER_NOT_FOUND: ', '') });
        }
        if (error.message.startsWith('INVALID_ID:')) {
            return res.status(400).json({ error: error.message.replace('INVALID_ID: ', '') });
        }
        return res.status(500).json({ error: 'Lỗi hệ thống máy chủ' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ error: 'ID không hợp lệ' });
        }
        const result = await deleteUserService(id);
        return res.status(200).json({
            message: 'Xóa người dùng thành công!',
            data: result.data
        });
    } catch (error) {
        console.error('Controller Error (deleteUser):', error.message || error);
        if (error.message.startsWith('USER_NOT_FOUND:')) {
            return res.status(404).json({ error: error.message.replace('USER_NOT_FOUND: ', '') });
        } else {
            return res.status(500).json({ error: 'Lỗi hệ thống máy chủ' });
        }
    }
};


const getUsersAPI = async (req, res) => {
    try {
        const search = req.query.search || "";
        
        const limit = parseInt(req.query.limit, 10) || 10;
        const page = parseInt(req.query.page, 10) || 1;   

        // Chặn lỗi tà đạo từ Frontend (nhập page = -1)
        if (page < 1 || limit < 1) {
            return res.status(400).json({ error: "Page và Limit phải lớn hơn 0" });
        }

        const result = await getUsersService(search, limit, page);

        return res.status(200).json({
            message: "Lấy danh sách nhân viên thành công",
            data: result.users,
            pagination: result.meta
        });

    } catch (error) {
        console.error("❌ Lỗi Controller Get Users:", error.message);
        return res.status(500).json({ error: "Lỗi hệ thống khi tải danh sách người dùng" });
    }
};


module.exports = {
    postEnrollUserAPI,
    updatePhotoAPI,
    deleteUser,
    getUsersAPI
};