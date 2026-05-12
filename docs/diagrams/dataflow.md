# Data Flow Diagram (DFD)

```mermaid
flowchart LR
    subgraph Sources["Data Sources"]
        CAM["📷 ESP32-CAM<br/>JPEG Image"]
        ADMIN["👤 Admin<br/>User Input"]
    end

    subgraph DataProcessing["Data Processing"]
        EXTRACT["Extract Vector<br/>(AI Service)"]
        MATCH["Match Face<br/>(pgvector)"]
        VALIDATE["Validate Shift<br/>(Time & Role)"]
        CALC["Calculate Hours<br/>(Timesheet Logic)"]
    end

    subgraph DataStore["Data Storage"]
        FACEDB["face_vectors<br/>(Embedding DB)"]
        USERDB["users<br/>(Account DB)"]
        EVENTDB["attendance_events<br/>(Raw Logs)"]
        SHIFTDB["shift_timesheets<br/>(Aggregated)"]
        PHOTOSTORE["Cloudinary<br/>(Image CDN)"]
    end

    subgraph Outputs["Outputs & Actions"]
        UNLOCK["Unlock Gate<br/>(MQTT Command)"]
        DASHUI["Dashboard UI<br/>(React)"]
        LOGS["Attendance Logs<br/>(API Response)"]
    end

    CAM -->|Binary JPEG| EXTRACT
    EXTRACT -->|Vector[512]| MATCH
    MATCH -->|Matched User ID| VALIDATE
    VALIDATE -->|Valid Shift Check| CALC
    CALC -->|Working Hours| SHIFTDB

    ADMIN -->|Enroll Face| EXTRACT
    EXTRACT -->|Store Vector| FACEDB
    ADMIN -->|Create Shift| USERDB
    ADMIN -->|Assign User| USERDB

    MATCH -->|User ID| USERDB
    VALIDATE -->|Event Type| EVENTDB
    CALC -->|Status| SHIFTDB
    CAM -->|Upload Image| PHOTOSTORE

    MATCH -->|Unlock Command| UNLOCK
    SHIFTDB -->|Display Data| DASHUI
    EVENTDB -->|Query Logs| LOGS
    FACEDB -->|Read Vector| MATCH

    style Sources fill:#e3f2fd
    style DataProcessing fill:#f3e5f5
    style DataStore fill:#fce4ec
    style Outputs fill:#c8e6c9
```

## Luồng Dữ Liệu Chi Tiết

1. **Data Sources**:
   - Camera gửi ảnh JPEG raw binary
   - Admin thao tác qua UI để thêm người dùng, ca làm việc

2. **Processing**:
   - AI trích xuất vector 512 chiều từ ảnh
   - Backend so khớp vector với DB bằng pgvector
   - Validate thời gian chấm công có hợp lệ không
   - Tính toán giờ làm thực tế

3. **Storage**:
   - face_vectors: lưu embedding để so khớp nhanh
   - users: lưu thông tin tài khoản, mật khẩu
   - attendance_events: lưu lịch sử từng lần quẹt thẻ
   - shift_timesheets: lưu kết quả tổng hợp (giờ, trạng thái)
   - Cloudinary: lưu ảnh backup

4. **Outputs**:
   - MQTT unlock command gửi đến controller
   - Dashboard UI hiển thị dữ liệu real-time
   - API trả về logs để frontend query
