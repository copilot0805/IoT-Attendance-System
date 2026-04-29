# IoT-Attendance-System

# 📷 Hệ Thống Chấm Công AI - ESP32-S3 Camera Node (CE Team)

Tài liệu này mô tả kiến trúc hoạt động của Camera Node (Phần cứng) và đặc tả giao tiếp (API Contract) dành cho Backend/AI Server (CS Team).

## 1. Tổng quan Kiến trúc (System Architecture)
Phần cứng sử dụng chip **ESP32-S3-N16R8** chạy hệ điều hành thời gian thực **FreeRTOS** với 2 luồng xử lý độc lập:
* **Core 0 (UI & Actuator):** Quản lý màn hình LCD I2C và điều khiển Servo (Cửa) mượt mà, không bị block.
* **Core 1 (Network & AI):** Chụp ảnh liên tục, đóng gói thành binary và đẩy lên Server bằng giao thức HTTP POST với kỹ thuật **Keep-Alive**.

### Tính năng đặc biệt (Dành cho Backend lưu ý):
* **Dynamic Config:** Node không hardcode URL. Nếu mất kết nối, Node tự phát WiFi `BKU_SETUP` (IP: 192.168.4.1) để cấu hình lại URL.
* **Smart Watchdog:** Nếu Server sập hoặc sút kết nối liên tục 10 lần, Node tự động xóa URL cũ, dọn dẹp RAM và reset về chế độ Setup an toàn.
* **Tối ưu Độ trễ (Low Latency):** Nhờ cơ chế tái sử dụng Socket (Keep-Alive), thời gian gửi ảnh và nhận kết quả (Wait AI) giảm từ **~2600ms xuống chỉ còn ~400ms**.

---

## 2. Đặc tả Giao thức CE - CS (API Contract)

Node phần cứng sẽ liên tục gửi các frame ảnh (JPEG) lên Server. Backend của team CS cần tuân thủ nghiêm ngặt các quy tắc sau để phần cứng không bị treo.

### 2.1. Request từ Hardware (ESP32 -> Server)
* **Method:** `POST`
* **Endpoint:** (Cấu hình động qua Web Admin, bắt buộc có `/verify-face` ở cuối)
* **Headers:**
  * `Content-Type: image/jpeg`
  * `Connection: keep-alive`
  * `Host: <được tự động trích xuất từ URL>`
* **Body:** Raw binary data của ảnh JPEG.

### 2.2. Response từ Server (Server -> ESP32)
⚠️ **CỰC KỲ QUAN TRỌNG:** Backend **BẮT BUỘC phải trả về mã `HTTP 200 OK`** cho mọi khung hình nhận được, ngay cả khi khung hình đó không có khuôn mặt (No face detected). Nếu trả về mã 4xx hoặc 5xx, Watchdog của phần cứng sẽ hiểu là Server sập và tự động cắt kết nối.

Backend phải trả về một chuỗi **JSON** chuẩn xác theo 1 trong 3 trường hợp sau:

#### Trường hợp 1: Có người & Nhận diện THÀNH CÔNG (Mở cửa)
```json
{
  "match": true,
  "status": "success",
  "name": "Nguyen Trung Kien",
  "id": "205xxxx"
}
```
👉 *Phản ứng của Hardware: Màn hình hiển thị Tên/ID, Cửa Servo mở 90 độ trong 3 giây, sau đó đóng lại.*

#### Trường hợp 2: Có người & Nhận diện THẤT BẠI (Người lạ)
```json
{
  "match": false,
  "status": "failed"
}
```
👉 *Phản ứng của Hardware: KHÔNG có key "error". Màn hình báo "UNRECOGNIZED!", cửa giữ nguyên trạng thái đóng.*

#### Trường hợp 3: KHÔNG có người / Lỗi khung hình (Bỏ qua)
```json
{
  "match": false,
  "status": "failed",
  "error": "No face detected in this frame"
}
```
👉 *Phản ứng của Hardware: Nhận diện CÓ key "error". Hardware sẽ âm thầm bỏ qua khung hình này để chống nhiễu loạn UI. Màn hình vẫn hiển thị "Ready to scan...".*

---

## 3. Quản lý trạng thái kết nối (Keep-Alive TCP)
* ESP32 sẽ gửi ảnh với nhịp độ `~150ms` delay giữa các frame.
* Nếu Backend sử dụng Nginx hoặc Cloudflare, hãy lưu ý cấu hình `keepalive_timeout` đủ dài (khuyến nghị > 10s) để tránh việc Server chủ động ngắt kết nối liên tục gây tốn tài nguyên bắt tay (SSL Handshake) lại từ đầu.
* Khi Server chủ động ngắt (Lỗi `-29312 SSL EOF`), ESP32 đã có cơ chế tự động dọn rác Socket và kết nối lại, nhưng frame đó sẽ bị trễ ~2 giây.

---
*Documented by CE Team.*
