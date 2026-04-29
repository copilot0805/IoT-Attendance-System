-- Kích hoạt extension pgvector (Bắt buộc cho nhận diện khuôn mặt)
CREATE EXTENSION IF NOT EXISTS vector;

-- -- Dọn dẹp các bảng và trigger cũ (nếu có) để tránh lỗi khi chạy lại file
-- DROP TRIGGER IF EXISTS trigger_prevent_spam_attendance ON attendance_events;
-- DROP FUNCTION IF EXISTS check_spam_attendance();
-- DROP TABLE IF EXISTS shift_timesheets CASCADE;
-- DROP TABLE IF EXISTS attendance_events CASCADE;
-- DROP TABLE IF EXISTS user_shifts CASCADE;
-- DROP TABLE IF EXISTS shifts CASCADE;
-- DROP TABLE IF EXISTS face_vectors CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TYPE IF EXISTS user_role CASCADE;

-- Định nghĩa Role bảo mật đồng nhất
CREATE TYPE user_role AS ENUM ('ADMIN', 'EMPLOYEE');

-- 1. Bảng USERS
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'EMPLOYEE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng FACE_VECTORS
CREATE TABLE face_vectors (
    vector_id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    vector vector (512), 
    model_version VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng SHIFTS (Quản lý các ca làm việc)
CREATE TABLE shifts (
    shift_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. Bảng USER_SHIFTS (Bảng trung gian thể hiện quan hệ "work" với thuộc tính working_date)
CREATE TABLE user_shifts (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(shift_id) ON DELETE CASCADE,
    working_date DATE NOT NULL,
    PRIMARY KEY (user_id, shift_id, working_date)
);

-- 5. Bảng ATTENDANCE_EVENTS (Giữ nguyên cấu trúc phẳng, không kẹp shift_id)
CREATE TABLE attendance_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(20) DEFAULT 'CHECK_IN', 
    CHECK (event_type IN ('CHECK_IN', 'CHECK_OUT')),
    image_url VARCHAR(255), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng SHIFT_TIMESHEETS (Đã cập nhật để trỏ qua user_shifts)
CREATE TABLE shift_timesheets (
    timesheet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    shift_id UUID NOT NULL,
    working_date DATE NOT NULL,
    first_check_in TIMESTAMP,
    last_check_out TIMESTAMP,
    working_hour DECIMAL(5, 2) DEFAULT 0,
    status VARCHAR(50),
    UNIQUE(user_id, shift_id, working_date),
    -- Thiết lập khóa ngoại trỏ sang bảng user_shifts 
    CONSTRAINT fk_user_shift 
        FOREIGN KEY (user_id, shift_id, working_date) 
        REFERENCES user_shifts(user_id, shift_id, working_date) 
        ON DELETE CASCADE
    
);

-- ==========================================
-- TRIGGER & FUNCTIONS (Giữ nguyên logic cũ)
-- ==========================================

CREATE OR REPLACE FUNCTION check_spam_attendance()
RETURNS TRIGGER AS $$
BEGIN
    -- Lock theo user_id để chống Race Condition 
    PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text));

    -- Check trong 5 giây gần nhất
    IF EXISTS (
        SELECT 1 
        FROM attendance_events
        WHERE user_id = NEW.user_id 
        AND event_time > NOW() - INTERVAL '5 seconds'
    ) THEN
        RAISE EXCEPTION 'Too fast, wait 5 seconds';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX idx_attendance_user_time
ON attendance_events (user_id, event_time DESC);

CREATE TRIGGER trigger_prevent_spam_attendance
BEFORE INSERT ON attendance_events
FOR EACH ROW
EXECUTE FUNCTION check_spam_attendance();