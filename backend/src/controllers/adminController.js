const { enrollUserService } = require('../services/adminService.js');
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


module.exports = {
    postEnrollUserAPI,
};