const bcrypt = require('bcryptjs');
const axios = require('axios');
const FormData = require('form-data');
const pool = require('../db');
const fs = require('fs');

const enrollUserService = async (userData, file) => {
    const { full_name, email, password, role } = userData;
    const client = await pool.connect();
    console.log('Qua service enrollUserService với data:', userData);
    try {
        // ==========================================
        // 1. GỌI AI MICROSERVICE TRÍCH XUẤT VECTOR
        // ==========================================
        // const form = new FormData();
        // // Sử dụng file.buffer vì ta sẽ cấu hình Multer lưu ở RAM (Memory)
        // form.append('file', file.buffer, {
        //     filename: file.originalname,
        //     contentType: file.mimetype,
        // });

        // Gửi ảnh sang port 5000 (Python AI)


        const aiResponse = await axios.post('http://127.0.0.1:5000/extract', file.buffer, {
            headers: {
                'Content-Type': 'application/octet-stream',
                // BẮT BUỘC PHẢI CÓ DÒNG NÀY ĐỂ ÉP AXIOS GỬI NGUYÊN KHỐI:
                'Content-Length': file.buffer.length 
            }
        });

        const vectorArray = aiResponse.data.vector;
        const modelVersion = aiResponse.data.model || 'ArcFace';
        const vectorString = `[${vectorArray.join(',')}]`;

        // ==========================================
        // 2. LƯU DATABASE BẰNG TRANSACTION
        // ==========================================
        const password_hash = await bcrypt.hash(password, 10);
        const userRole = role || 'EMPLOYEE';

        await client.query('BEGIN'); // Khởi tạo Transaction

        // 2.1. Thêm vào bảng users
        const userResult = await client.query(
            `INSERT INTO users (full_name, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING user_id, full_name, email, role, created_at, updated_at`,
            [full_name, email, password_hash, userRole]
        );
        const newUser = userResult.rows[0];

        // 2.2. Thêm vector vào bảng face_vectors
        const faceResult = await client.query(
            `INSERT INTO face_vectors (user_id, vector, model_version, is_active)
             VALUES ($1, $2, $3, TRUE)
             RETURNING vector_id, model_version, is_active, created_at, updated_at`,
            [newUser.user_id, vectorString, modelVersion]
        );

        await client.query('COMMIT'); // Hoàn tất Transaction

        return {
            success: true,
            data: {
                user: newUser,
                face_vector: faceResult.rows[0]
            }
        };

    } catch (error) {
        await client.query('ROLLBACK'); // Xóa bỏ thay đổi nếu có lỗi

        // Phân loại lỗi để Controller dễ dàng trả về HTTP Status code tương ứng
        if (error.response && error.response.data) {
            throw new Error('AI_ERROR: ' + (error.response.data.detail || error.response.data.error));
        }
        if (error.code === '23505') {
            throw new Error('EMAIL_EXISTS: Email này đã tồn tại trong hệ thống');
        }
        console.error('Service Error (enrollUserService):', error);
        throw new Error('DB_ERROR: Lỗi hệ thống nội bộ');
    } finally {
        client.release();
    }
};

const updatePhotoService = async (id, file) => {
    const client = await pool.connect();
    console.log('Qua service updatePhotoService với data:', { id, originalname: file.originalname });
    try {
        // 1. Kiểm tra user tồn tại
        const userResult = await client.query('SELECT user_id FROM users WHERE user_id = $1', [id]);
        if (userResult.rowCount === 0) {
            console.log(`User with ID ${id} not found`);
            throw new Error('USER_NOT_FOUND: Người dùng không tồn tại');
        }

        // 2. Gọi AI microservice trích xuất vector
        // const form = new FormData();
        // form.append('file', file.buffer, {
        //     filename: file.originalname,
        //     contentType: file.mimetype,
        // });


        const aiResponse = await axios.post('http://127.0.0.1:5000/extract', file.buffer, {
            headers: {
                'Content-Type': 'application/octet-stream',
                // BẮT BUỘC PHẢI CÓ DÒNG NÀY ĐỂ ÉP AXIOS GỬI NGUYÊN KHỐI:
                'Content-Length': file.buffer.length 
            }
        });

        const vectorArray = aiResponse.data.vector;
        const modelVersion = aiResponse.data.model || 'ArcFace';
        const vectorString = `[${vectorArray.join(',')}]`;

        const vectorResult = await client.query(
            `SELECT vector_id FROM face_vectors WHERE user_id = $1 AND is_active = TRUE AND vector = $2`,
            [id, vectorString]
        );
        if (vectorResult.rowCount > 0) {
            throw new Error('SAME_PHOTO: Ảnh khuôn mặt không thay đổi');
        }

        // 3. Lưu vector mới vào face_vectors
        const insertResult = await client.query(
            `INSERT INTO face_vectors (user_id, vector, model_version, is_active)
             VALUES ($1, $2, $3, TRUE)
             RETURNING vector_id, model_version, is_active, created_at, updated_at`,
            [id, vectorString, modelVersion]
        );

        return {
            success: true,
            data: {
                face_vector: insertResult.rows[0]
            }
        };

    } catch (error) {
        console.error('Service Error (updatePhotoService):', error);
        if (error.response && error.response.data) {
            throw new Error('AI_ERROR: ' + (error.response.data.detail || error.response.data.error));
        }
        if (error.code === '22P02') {
            throw new Error('USER_NOT_FOUND: Người dùng không tồn tại');
        }

        if (error.message.startsWith('SAME_PHOTO:')) {
            throw error;
        }
        if (error.message.startsWith('USER_NOT_FOUND:')) {
            throw error;
        }
        throw new Error('DB_ERROR: Lỗi hệ thống nội bộ');
    } finally {
        client.release();
    }
};

const deleteUserService = async (id) => {
    const client = await pool.connect();
    try {
        const result = await client.query('DELETE FROM users WHERE user_id = $1 RETURNING user_id', [id]);
        if (result.rowCount === 0) {
            //console.log(`User with ID ${id} not found for deletion`);
            throw new Error('USER_NOT_FOUND: Người dùng không tồn tại');
        }
        return {
            success: true,
            data: {
                user_id: id
            }
        };
    } catch (error) {
        console.error('Service Error (deleteUserService):', error);
        throw new Error('USER_NOT_FOUND: Người dùng không tồn tại');
    } finally {
        client.release();
    }
};

module.exports = {
    enrollUserService,
    updatePhotoService,
    deleteUserService
};