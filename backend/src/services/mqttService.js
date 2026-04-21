const mqtt = require('mqtt');
require('dotenv').config();

// 1. Cấu hình kết nối đến HiveMQ Cloud (Dùng mqtts ở port 8883 cho Backend)
// const options = {
//     username: 'hcmut_attendance',
//     password: process.env.HIVEMQ_PASSWORD || 'Mật_Khẩu_Của_Nhóm_Bạn', // Cập nhật mật khẩu nhóm vào đây
//     clientId: 'nodejs_backend_' + Math.random().toString(16).substring(2, 8)
// };

// const client = mqtt.connect('mqtts://2ee617fd7b3842639f968abf50a4670f.s1.eu.hivemq.cloud:8883', options);

// client.on('connect', () => {
//     console.log('Đã kết nối thành công tới HiveMQ Cloud!');
// });

// client.on('error', (err) => {
//     console.error('Lỗi kết nối MQTT:', err);
// });

const isTesting = true; // Chuyển thành false khi team CE đưa password
let client = null;

if (!isTesting) {
    const options = {
        username: 'hcmut_attendance',
        password: process.env.HIVEMQ_PASSWORD || 'Mật_Khẩu_Của_Nhóm_Bạn',
        clientId: 'nodejs_backend_' + Math.random().toString(16).substring(2, 8)
    };
    client = mqtt.connect('mqtts://2ee617fd7b3842639f968abf50a4670f.s1.eu.hivemq.cloud:8883', options);

    client.on('connect', () => {
        console.log(' Đã kết nối thành công tới HiveMQ Cloud!');
    });

    client.on('error', (err) => {
        console.error('Lỗi kết nối MQTT:', err.message);
    });
} else {
    console.log(' Đang ở chế độ TEST: Bỏ qua kết nối HiveMQ.');
}


// 2. Hàm phát tín hiệu mở cửa
const publishUnlockCommand = (name, id) => {
    if (!client) {
        console.log(`[GIẢ LẬP MQTT]  Đã gửi lệnh mở cửa cho: ${name} (ID: ${id})`);
        return; // Quan trọng: return để code không chạy tiếp xuống dưới
    }
    const topic = 'bku/attendance/gate/control';
    const payload = JSON.stringify({
        command: "unlock",
        name: name,
        id: id,
        status: "success"
    });

    client.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) {
            console.error('Lỗi khi gửi lệnh mở cửa:', err);
        } else {
            console.log(`Đã gửi lệnh mở cửa cho: ${name} (ID: ${id})`);
        }
    });
};

module.exports = {
    publishUnlockCommand
};