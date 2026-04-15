const { enrollUserService, updatePhotoService } = require('../services/adminService.js');
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


module.exports = {
    postEnrollUserAPI,
    updatePhotoAPI
};