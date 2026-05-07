
# 📑 TÀI LIỆU API - MODULE CHẤM CÔNG (ATTENDANCE & TIMESHEETS)
**Base URL khuyến nghị:** `http://localhost:5001/v1/api`

---

## MODULE: XÁC THỰC KHUÔN MẶT 
⚠️ **Lưu ý quan trọng:** API này **KHÔNG** yêu cầu token xác thực và được thiết kế đặc biệt để tránh crash hệ thống nhúng. API luôn trả về HTTP Status `200 OK`, kể cả khi có lỗi logic (để ESP32 chỉ cần parse JSON mà không bị văng exception).

### 1. Gửi ảnh khuôn mặt để điểm danh
* **Endpoint:** `POST /verify-face`
* **Headers:** * `Content-Type: image/jpeg` 
* **Body Request:** Raw Binary. Giới hạn kích thước tối đa 10MB.
* **Response:**
  * **Trường hợp 1: Có người, nhận diện đúng -> Mở cửa (Status 200 OK)**
    ```json
    {
      "match": true,
      "status": "success",
      "name": "Nguyễn Văn A",
      "id": "uuid-123"
    }
    ```

  * **Trường hợp 2: Có người, nhưng là người lạ -> Không mở cửa (Status 200 OK)**
    ```json
    {
      "match": false,
      "status": "failed"
    }
    ```

  * **Trường hợp 3: Ảnh lỗi, mờ, không có người, hoặc đang bị chống spam (Status 200 OK)**
    ```json
    {
      "match": false,
      "status": "failed",
      "error": "Lỗi hệ thống hoặc AI bị sập" // Hoặc "Không nhận được dữ liệu ảnh thô", "Thao tác quá nhanh, đang chờ 5s..."
    }
    ```

---

## MODULE: BÁO CÁO & NHẬT KÝ
⚠️ **Yêu cầu chung:** Bắt buộc truyền Header xác thực: `Authorization: Bearer <access_token>`

### 1. Xem nhật ký thao tác (Attendance Logs)
* **Mô tả:** Lấy danh sách thô (Raw Logs) các lần check IN/OUT của hệ thống.
* **Endpoint:** `GET /attendance/logs`
* **Query Parameters:**
  * `date` (YYYY-MM-DD, tuỳ chọn): Lọc nhật ký trong một ngày cụ thể.
  * `user_id` (string, tuỳ chọn): Lọc theo ID nhân viên.
  * `limit` (number, mặc định: 20): Số lượng dòng hiển thị.
  * `offset` (number, mặc định: 0): Số dòng bỏ qua (dùng cho phân trang thủ công).
  * **Ghi chú:** Nếu không truyền tham số ngày và phân trang, hệ thống mặc định trả về 20 lần gần nhất.
* **Response Thành công (200 OK):**
  ```json
  [
    {
      "full_name": "Nguyễn Văn A",
      "event_type": "CHECK_IN",
      "event_time": "2026-05-07T01:05:22.123Z",
      "imgurl": "[https://cloudinary.com/](https://cloudinary.com/)..." 
    },
    {
      "full_name": "Nguyễn Văn A",
      "event_type": "CHECK_OUT",
      "event_time": "2026-05-07T10:05:22.123Z",
      "imgurl": "[https://cloudinary.com/](https://cloudinary.com/)..."
    }
  ]
  ```

### 2. Xem bảng công tổng hợp (Timesheets)
* **Mô tả:** Lấy dữ liệu công làm việc đã được hệ thống tổng hợp, tính toán giờ làm và phân loại trạng thái.
* **Endpoint:** `GET /timesheets`
* **Query Parameters:**
  * `date` (YYYY-MM-DD, tuỳ chọn, mặc định: ngày hiện tại theo giờ VN): Xem bảng công của ngày nào.
  * `user_id` (string, tuỳ chọn): Lọc theo nhân viên.
* **Response Thành công (200 OK):**
  ```json
  [
    {
      "user_id": "uuid-123",
      "full_name": "Nguyễn Văn A",
      "start_time": "08:00:00",
      "end_time": "17:00:00",
      "status": "WORKING",
      "working_hours": 3.5,
      "check_in": "08:05:12",
      "check_out": null
    },
    {
      "user_id": "uuid-456",
      "full_name": "Trần Thị B",
      "start_time": "13:00:00",
      "end_time": "17:00:00",
      "status": "INCOMPLETE",
      "working_hours": 0,
      "check_in": "13:00:10",
      "check_out": null
    }
  ]
  ```
* **Ghi chú dữ liệu:**
  * `check_in`: Thời điểm ghi nhận lượt **Check-in đầu tiên** trong khung giờ ca làm việc.
  * `check_out`: Thời điểm ghi nhận lượt **Check-out cuối cùng** tính đến thời điểm hiện tại. Nếu nhân viên quét mặt ra vào nhiều lần, hệ thống sẽ luôn cập nhật giờ mới nhất vào đây.

### 💡 Bảng chú giải trạng thái (Status) trong Timesheets:
* `PENDING`: Nhân viên chưa có thao tác nào trong ca làm việc.
* `WORKING`: Đã CHECK_IN và ca làm việc vẫn đang diễn ra.
* `PRESENT`: Đã hoàn thành đủ chu trình IN-OUT hợp lệ, làm việc bình thường.
* `LATE`: Hoàn thành chu trình IN-OUT nhưng bị tính là đi trễ.
* `INCOMPLETE`: Lỗi thao tác! Có CHECK_IN nhưng không CHECK_OUT (hoặc ngược lại) khi ca làm việc đã kết thúc. Cần Admin xem xét.
* `ABSENT`: Vắng mặt không phép (Được đánh dấu tự động bởi hệ thống lúc 12:00 trưa hôm sau theo múi giờ Asia/Ho_Chi_Minh).