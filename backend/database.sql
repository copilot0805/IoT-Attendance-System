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

-- Bảng ATTENDANCE_LOGS 
-- 1. Bảng lưu mọi sự kiện quẹt thẻ
CREATE TABLE attendance_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(20) DEFAULT 'CHECK_IN', 
    image_url VARCHAR(255), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng tổng hợp chấm công theo ngày
CREATE TABLE daily_timesheets (
    timesheet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    first_check_in TIMESTAMP,
    last_check_out TIMESTAMP,
    working_hours DECIMAL(5, 2) DEFAULT 0,
    status VARCHAR(50), -- 'PRESENT', 'LATE', 'ABSENT'
    UNIQUE (user_id, work_date)
);