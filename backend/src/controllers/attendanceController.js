const axios = require('axios');
const { publishUnlockCommand } = require('../services/mqttService');

const postAttendanceAPI = async (req, res) => {
    try {
        const imageBuffer = req.body;

        // 1. Kiểm tra xem có nhận được mảng byte thô không
        if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
            return res.status(400).json({ error: 'Không nhận được dữ liệu ảnh thô (Raw Image)' });
        }

        console.log(`Nhận được ảnh từ ESP32 (Kích thước: ${imageBuffer.length} bytes)`);

        // 2. Gửi thẳng mảng byte sang API /verify-face của Python AI
        const aiResponse = await axios.post('http://127.0.0.1:5000/verify-face', imageBuffer, {
            headers: {
                'Content-Type': 'image/jpeg'
            }
        });

        const aiData = aiResponse.data;

        // 3. Xử lý phản hồi từ AI
        if (aiData.match === true) {
            // Nhận diện đúng -> Kích hoạt MQTT mở cửa
            publishUnlockCommand(aiData.user, aiData.id || aiData.user);

            return res.status(200).json({
                message: 'Nhận diện thành công, đang mở cửa!',
                data: aiData
            });
        } else {
            console.log('Người lạ! Không mở cửa.');
            return res.status(403).json({
                message: 'Nhận diện thất bại: Người lạ!',
                data: aiData
            });
        }

    } catch (error) {
        console.error('Lỗi Controller Chấm công:', error.message);
        if (error.response) {
            return res.status(error.response.status).json({ error: error.response.data });
        }
        return res.status(500).json({ error: 'Lỗi hệ thống máy chủ' });
    }
};

module.exports = { postAttendanceAPI };