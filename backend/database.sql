-- Kích hoạt extension pgvector (Bắt buộc cho hệ thống nhận diện khuôn mặt)
CREATE EXTENSION IF NOT EXISTS vector;

-- Định nghĩa Role bảo mật đồng nhất cho hệ thống
CREATE TYPE user_role AS ENUM ('ADMIN', 'EMPLOYEE');

-- Bảng USERS
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'EMPLOYEE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng FACEVECTORS
CREATE TABLE face_vectors (
    vector_id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    vector vector (512), -- Thay đổi 512 thành số chiều vector tương ứng của model (vd: DeepFace/ArcFace)
    model_version VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng ATTENDANCE_LOGS (Bổ sung để hoàn thiện nghiệp vụ chấm công)
CREATE TABLE attendance_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    work_date DATE NOT NULL, -- ngày làm việc (theo múi giờ công ty)
    check_in_time TIMESTAMP, -- thời gian check-in thực tế
    check_out_time TIMESTAMP, -- thời gian check-out thực tế (nullable nếu chưa ra về)
    check_in_image_url VARCHAR(255), -- ảnh chụp lúc check-in
    check_out_image_url VARCHAR(255), -- ảnh chụp lúc check-out
    status VARCHAR(50) DEFAULT 'CHECKED_IN',
    -- Giá trị có thể: 'CHECKED_IN', 'CHECKED_OUT', 'LATE', 'EARLY_LEAVE', 'MISSING_CHECK_OUT', 'ABSENT'
    late_minutes INT DEFAULT 0,
    early_leave_minutes INT DEFAULT 0,
    working_hours DECIMAL(5, 2), -- số giờ làm việc thực tế (VD: 8.5)
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, work_date) -- mỗi user mỗi ngày chỉ có 1 bản ghi duy nhất
);