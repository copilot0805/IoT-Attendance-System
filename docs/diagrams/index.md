# IoT Attendance - Diagram Index

Trang này tổng hợp toàn bộ 4 sơ đồ chính của dự án để tiện theo dõi và trình bày.

## Muc luc

1. [System Architecture](./architecture.md)
2. [Database ERD](./erd.md)
3. [Attendance Verification Sequence](./attendance-sequence.md)
4. [Timesheet State Machine](./timesheet-state.md)

---

## 1) System Architecture

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

---

## 2) Database ERD

```mermaid
erDiagram
    users {
        UUID user_id PK
        VARCHAR full_name
        VARCHAR email
        VARCHAR password_hash
        user_role role
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    face_vectors {
        UUID vector_id PK
        UUID user_id FK
        VECTOR vector_512
        VARCHAR model_version
        BOOLEAN is_active
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    shifts {
        UUID shift_id PK
        TIME start_time
        TIME end_time
        BOOLEAN is_active
    }

    user_shifts {
        UUID user_id FK
        UUID shift_id FK
        DATE working_date
    }

    attendance_events {
        UUID event_id PK
        UUID user_id FK
        TIMESTAMP event_time
        VARCHAR event_type
        VARCHAR image_url
        TIMESTAMP created_at
    }

    shift_timesheets {
        UUID timesheet_id PK
        UUID user_id FK
        UUID shift_id FK
        DATE working_date
        TIMESTAMP first_check_in
        TIMESTAMP last_check_out
        DECIMAL working_hour
        VARCHAR status
    }

    users ||--o{ face_vectors : has
    users ||--o{ user_shifts : assigned
    shifts ||--o{ user_shifts : schedules
    users ||--o{ attendance_events : generates
    user_shifts ||--o| shift_timesheets : aggregates
```

---

## 3) Attendance Verification Sequence

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

---

## 4) Timesheet State Machine

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
