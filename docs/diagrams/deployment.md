# Deployment Diagram

```mermaid
graph TB
    subgraph LocalNetwork["Local Network (Nhóm CE)"]
        ESP32CAM["📷 ESP32-CAM<br/>(UXGA Image Capture)"]
        ESP32CTRL["🔧 ESP32-Controller<br/>(Servo Control)"]
    end

    subgraph CloudServices["Cloud Services"]
        NGROK["🌐 ngrok Tunnel<br/>(HTTPS Bridge)"]
        HIVEMQ["☁️ HiveMQ Cloud<br/>(MQTT Broker)"]
        CLOUDINARY["📦 Cloudinary<br/>(Image Storage)"]
    end

    subgraph BackendServer["Backend Server<br/>(Local or Cloud)"]
        EXPRESS["🟢 Express API<br/>(Node.js)"]
        POSTGRES["🐘 PostgreSQL<br/>(pgvector)"]
        AI["🤖 AI Service<br/>(Python FastAPI)"]
    end

    subgraph Frontend["Frontend Client<br/>(Browser)"]
        REACT["⚛️ React + Vite<br/>(Admin UI)"]
    end

    ESP32CAM -->|Raw JPEG via ngrok| NGROK
    NGROK -->|HTTPS POST| EXPRESS
    REACT -->|HTTP/HTTPS| EXPRESS
    EXPRESS -->|SQL Query| POSTGRES
    EXPRESS -->|Extract Vector| AI
    EXPRESS -->|Publish Command| HIVEMQ
    HIVEMQ -->|Subscribe| ESP32CTRL
    EXPRESS -->|Upload Image| CLOUDINARY

    style LocalNetwork fill:#e1f5ff
    style CloudServices fill:#fff9e6
    style BackendServer fill:#f3e5f5
    style Frontend fill:#e8f5e9
```

## Mô Tả Triển Khai

- **Local Network (CE)**: Thiết bị IoT (camera, controller) chạy trên mạng nội bộ
- **ngrok Tunnel**: Cải tiến khả năng truy cập từ bên ngoài để ESP32-CAM có thể gửi ảnh đến backend
- **HiveMQ Cloud**: MQTT broker công cộng để gửi lệnh điều khiển từ backend đến controller
- **Cloudinary**: Lưu trữ ảnh chấm công trên cloud
- **Backend Server**: Có thể chạy trên máy local hoặc cloud, lắng nghe request từ frontend và IoT devices
- **PostgreSQL**: Cơ sở dữ liệu chứa vector khuôn mặt (pgvector) để so khớp nhanh
- **AI Service**: Microservice Python chạy riêng biệt để trích xuất embedding từ ảnh
- **Frontend**: Web app React dùng để quản trị người dùng, xem bảng công, test API
