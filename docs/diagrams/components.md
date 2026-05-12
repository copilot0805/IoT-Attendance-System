# Component Diagram

```mermaid
graph TB
    subgraph IoTLayer["IoT Layer (Hardware)"]
        CAM["ESP32-CAM Component<br/>- Image Capture<br/>- JPEG Encoding<br/>- HTTP Client"]
        CTRL["ESP32-Controller Component<br/>- MQTT Subscribe<br/>- Servo Control<br/>- LCD Display"]
    end

    subgraph BackendLayer["Backend Layer (Node.js)"]
        ROUTER["Router Module<br/>- Route Mapping<br/>- Middleware Chain"]
        AUTH["Auth Component<br/>- JWT Verify<br/>- Role Check"]
        ADMIN["Admin Controller<br/>- User Enroll<br/>- Face Update<br/>- User Delete"]
        SHIFT["Shift Controller<br/>- Create Shift<br/>- Assign Roster<br/>- Get Schedule"]
        ATTEND["Attendance Controller<br/>- Verify Face<br/>- Log Event<br/>- Update Timesheet"]
        CRON["Cronjob Service<br/>- Close Shift<br/>- Mark Absent<br/>- Generate Report"]
    end

    subgraph ServiceLayer["Service Layer (Business Logic)"]
        ADMIN_SVC["Admin Service<br/>- Enroll Logic<br/>- Photo Hash<br/>- Email Validate"]
        SHIFT_SVC["Shift Service<br/>- Time Conflict<br/>- Overlap Check<br/>- Bulk Assign"]
        ATTEND_SVC["Attendance Service<br/>- Time Buffer Logic<br/>- Hour Calculate<br/>- Status Determine"]
        UPLOAD_SVC["Upload Service<br/>- Cloudinary API<br/>- Async Upload"]
    end

    subgraph IntegrationLayer["Integration Layer"]
        AI["AI Service Adapter<br/>- Extract Vector<br/>- Call Python API"]
        MQTT["MQTT Client<br/>- Publish Command<br/>- Subscribe Topic"]
        CLOUD["Cloudinary Client<br/>- Upload Image<br/>- Get URL"]
    end

    subgraph DataLayer["Data Layer (PostgreSQL)"]
        USERS_T["users Table<br/>- ID, Email<br/>- Password Hash<br/>- Role"]
        FACE_T["face_vectors Table<br/>- Vector[512]<br/>- Model Version<br/>- Is Active"]
        SHIFTS_T["shifts Table<br/>- Start/End Time<br/>- Is Active"]
        USERSHIFTS_T["user_shifts Table<br/>- User-Shift Map<br/>- Working Date"]
        EVENTS_T["attendance_events<br/>- Event Log<br/>- Event Type<br/>- Image URL"]
        TIMESHEET_T["shift_timesheets<br/>- Aggregated Data<br/>- Working Hours<br/>- Status"]
    end

    subgraph FrontendLayer["Frontend Layer (React)"]
        ROUTER_UI["Router Component<br/>- Route Definition<br/>- Protected Route"]
        AUTH_UI["Auth Context<br/>- Login Hook<br/>- Token Storage"]
        LOGIN_UI["Login Page<br/>- Email Input<br/>- Password Input"]
        DASHBOARD["Dashboard Page<br/>- Stats View<br/>- Navigation"]
        USER_MGMT["User Management<br/>- Enroll Form<br/>- Photo Upload<br/>- Delete Button"]
        ATTEND_TEST["Attendance Test<br/>- File Upload<br/>- API Call<br/>- Result Display"]
    end

    %% Backend to Service
    ROUTER --> AUTH
    ROUTER --> ADMIN
    ROUTER --> SHIFT
    ROUTER --> ATTEND
    ROUTER --> CRON

    ADMIN --> ADMIN_SVC
    SHIFT --> SHIFT_SVC
    ATTEND --> ATTEND_SVC
    ATTEND --> UPLOAD_SVC

    %% Service to Integration
    ADMIN_SVC --> AI
    ATTEND_SVC --> AI
    ATTEND --> MQTT
    UPLOAD_SVC --> CLOUD

    %% Integration to Data
    AI -.->|Read Vector| FACE_T
    ADMIN_SVC --> USERS_T
    ADMIN_SVC --> FACE_T
    SHIFT_SVC --> SHIFTS_T
    SHIFT_SVC --> USERSHIFTS_T
    ATTEND_SVC --> EVENTS_T
    ATTEND_SVC --> TIMESHEET_T

    %% Frontend to Backend
    LOGIN_UI -->|POST /login| ROUTER
    USER_MGMT -->|POST /users/enroll| ROUTER
    USER_MGMT -->|PUT /users/:id| ROUTER
    ATTEND_TEST -->|POST /verify-face| ROUTER

    %% Frontend Internal
    ROUTER_UI --> LOGIN_UI
    ROUTER_UI --> DASHBOARD
    ROUTER_UI --> USER_MGMT
    ROUTER_UI --> ATTEND_TEST
    AUTH_UI -.->|Token Mgmt| LOGIN_UI
    AUTH_UI -.->|Token Mgmt| USER_MGMT

    %% IoT Integration
    CAM -->|POST Image| ROUTER
    MQTT -->|JSON Command| CTRL

    style IoTLayer fill:#e0e0e0
    style BackendLayer fill:#bbdefb
    style ServiceLayer fill:#c8e6c9
    style IntegrationLayer fill:#ffe0b2
    style DataLayer fill:#f0f4c3
    style FrontendLayer fill:#f8bbd0
```

## Mô Tả Các Thành Phần

### IoT Layer

- **ESP32-CAM**: Bắt ảnh, encode JPEG, gửi qua HTTP POST
- **ESP32-Controller**: Nhận lệnh MQTT, điều khiển servo mở cửa, hiển thị LCD

### Backend Layer

- **Router**: Định tuyến request và gắn middleware
- **Auth**: Xác minh JWT, kiểm tra role
- **Admin/Shift/Attend Controllers**: Xử lý request của từng domain
- **Cronjob Service**: Chạy tự động để chốt sổ công

### Service Layer

- **Admin Service**: Xử lý logic đăng ký người dùng, hash ảnh
- **Shift Service**: Kiểm tra xung đột thời gian ca làm
- **Attendance Service**: Tính giờ, xác định trạng thái công
- **Upload Service**: Gửi ảnh lên Cloudinary bất đồng bộ

### Integration Layer

- **AI Adapter**: Gọi Python service để extract vector
- **MQTT Client**: Publish lệnh unlock qua HiveMQ
- **Cloudinary Client**: Upload và lưu ảnh lên cloud

### Data Layer

- 6 bảng PostgreSQL chính quản lý dữ liệu system

### Frontend Layer

- **Router**: Quản lý các tuyến đường và bảo vệ route
- **Auth Context**: Lưu token và thông tin user
- **Pages**: Login, Dashboard, User Management, Attendance Test
