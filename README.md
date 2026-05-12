# IoT-Attendance-System

Hệ thống chấm công IoT dùng ESP32-CAM, backend Node.js/Express, AI service Python và PostgreSQL + pgvector.

<details>
  <summary>📐 Hiển thị Kiến Trúc Tổng Quan</summary>

```mermaid
flowchart LR
	subgraph E[Edge Devices]
		CAM[ESP32-CAM]
		CTRL[ESP32-Controller]
	end

	subgraph A[Application Layer]
		FE[Frontend React Vite]
		BE[Backend Express API]
		AI[AI FastAPI Service]
	end

	subgraph D[Data Layer]
		PG[(PostgreSQL pgvector)]
	end

	subgraph X[External Services]
		NG[ngrok tunnel]
		MQ[HiveMQ Cloud]
		CD[Cloudinary]
	end

	CAM --> NG --> BE
	FE --> BE
	BE --> AI
	BE --> PG
	BE --> MQ
	MQ --> CTRL
	BE --> CD
```

</details>

<details>
  <summary>🔄 Hiển thị Luồng Xác Minh Khuôn Mặt</summary>

```mermaid
sequenceDiagram
	autonumber
	participant CAM as ESP32-CAM
	participant BE as Backend Express
	participant AI as AI FastAPI
	participant DB as PostgreSQL pgvector
	participant MQ as HiveMQ Cloud
	participant CTRL as ESP32-Controller

	CAM->>BE: POST /v1/api/verify-face (image/jpeg raw)
	BE->>AI: Extract embedding from image
	AI-->>BE: embedding vector + model info
	BE->>DB: Search nearest face vector
	DB-->>BE: matched user or no match

	alt Match found
		BE->>DB: Insert attendance_event and update timesheet
		BE->>MQ: Publish unlock command
		MQ-->>CTRL: gate/control unlock
		BE-->>CAM: 200 {match:true,status:success}
	else No match or invalid image
		BE-->>CAM: 200 {match:false,status:failed}
	end
```

</details>

<details>
  <summary>📊 Hiển thị Trạng Thái Bảng Công</summary>

```mermaid
stateDiagram-v2
	[*] --> PENDING: shift assigned

	PENDING --> WORKING: first check-in in valid window
	WORKING --> PRESENT: check-out and full cycle complete
	WORKING --> LATE: first check-in beyond grace period
	LATE --> PRESENT: check-out completes cycle

	WORKING --> INCOMPLETE: shift ended with missing check-out
	LATE --> INCOMPLETE: shift ended with missing check-out

	PENDING --> ABSENT: cron close day and no attendance
	INCOMPLETE --> [*]: day close
	PRESENT --> [*]: day close
	ABSENT --> [*]: day close
```

</details>

## Các Sơ Đồ Chi Tiết

### Sơ Đồ Chính (hiển thị ở trên)

- 📐 Kiến Trúc Tổng Quan
- 🔄 Luồng Xác Minh Khuôn Mặt
- 📊 Trạng Thái Bảng Công

### Sơ Đồ Mở Rộng

- 🌐 [Deployment Diagram](docs/diagrams/deployment.md) - Cách các thành phần được triển khai trên server/cloud
- 📈 [Data Flow Diagram](docs/diagrams/dataflow.md) - Luồng dữ liệu qua các lớp xử lý
- 🏗️ [Component Diagram](docs/diagrams/components.md) - Cấu trúc các component và dependencies

### Tài Liệu Bổ Sung

- 📑 [Diagram Index](docs/diagrams/index.md) - Tổng hợp tất cả 7 sơ đồ
- 📘 [Luồng Nghiệp Vụ Chấm Công](docs/attendance_logic.md)
- 🔧 [Mô Tả Kiến Trúc Backend](docs/backend_doc.md)
- 📄 [Báo Cáo Backend & Frontend](docs/fullstack_report.md)
