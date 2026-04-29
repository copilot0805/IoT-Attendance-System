## 1. API Endpoints

### 1.1 Authentication & Public APIs

| Method | Endpoint      | Description                            | Auth   |
| :----- | :------------ | :------------------------------------- | :----- |
| `POST` | `/attendance` | Nhận ảnh từ ESP32, nhận diện và mở cửa | Public |

---

### 1.2 Shift Management

| Method   | Endpoint      | Description               | Permission |
| :------- | :------------ | :------------------------ | :--------- |
| `GET`    | `/shifts`     | Lấy danh sách ca làm việc | Auth       |
| `POST`   | `/shifts`     | Tạo ca làm việc mới       | Admin      |
| `PUT`    | `/shifts/:id` | Cập nhật ca làm việc      | Admin      |
| `DELETE` | `/shifts/:id` | Soft delete ca làm việc   | Admin      |

---

### 1.3 Attendance 

| Method   | Endpoint            | Description               | Permission |
| :------- | :------------------ | :------------------------ | :--------- |
| `GET`    | `/timesheets`       | Xem bảng công tổng hợp    | Auth       |
**Query Parameters:**
* `date` (Tùy chọn): Lọc bảng công theo một ngày cụ thể. Nếu không truyền sẽ mặc định lấy ngày hiện tại (theo múi giờ Việt Nam). (Định dạng: YYYY-MM-DD)
* `user_id` (Tùy chọn): Lọc theo UUID của một nhân viên cụ thể. Nếu không truyền sẽ lấy bảng công của toàn bộ nhân viên.

| `GET`    | `/attendance/logs`  | Xem các sự kiện gần nhất  | Auth       |
**Query Parameters:**
* `date` (Tùy chọn): Lọc nhật ký sự kiện theo một ngày cụ thể. Nếu không truyền sẽ lấy toàn bộ lịch sử. (Định dạng: YYYY-MM-DD)
* `user_id` (Tùy chọn): Lọc theo UUID của một nhân viên cụ thể. Nếu không truyền sẽ lấy lịch sử của toàn bộ nhân viên.
* `limit` (Tùy chọn): Số lượng bản ghi tối đa trả về (dùng để phân trang). Mặc định là 20. (Định dạng: Số nguyên)
* `offset` (Tùy chọn): Số lượng bản ghi muốn bỏ qua (dùng để phân trang). Mặc định là 0. (Định dạng: Số nguyên)

| `GET`    | `/user-shifts`      | Xem lịch phân ca          | Auth       |
**Query Parameters:**
  * `start_date` (Bắt buộc): Ngày bắt đầu lọc (Định dạng: YYYY-MM-DD)
  * `end_date` (Bắt buộc): Ngày kết thúc lọc (Định dạng: YYYY-MM-DD)
  * `user_id` (Tùy chọn): Lọc theo UUID của một nhân viên cụ thể. Nếu không truyền sẽ lấy toàn bộ nhân viên.

| `POST`   | `/user-shifts`      | Gán ca cho user           | Auth       |
| `POST`   | `/user-shifts/bulk` | Gán ca hàng loạt          | Admin      |
| `DELETE` | `/user-shifts`      | Hủy lịch phân ca          | Auth       |
**Query Parameters (Bắt buộc phải có đủ 3 tham số):**
  * user_id: UUID của nhân viên
  * shift_id: ID của ca làm việc
  * working_date: Ngày làm việc cần hủy (Định dạng: YYYY-MM-DD)

---

### 1.4. Detailed Core APIs (Showcase)

Dưới đây là chi tiết các API xử lý logic nghiệp vụ cốt lõi của hệ thống:

#### API 1: Chấm công & Mở cửa tự động
* **Đường dẫn:** `POST /attendance`
* **Mục đích:** Nhận file ảnh từ camera (ESP32), nhận diện khuôn mặt và tự động chốt giờ (Check-in/out).

**Request:**
* **Header:** `Content-Type: application/octet-stream`
* **Body:** Truyền thẳng file ảnh gốc (Binary data).

**Response (200 OK - Cho phép mở cửa):**
```json
{
  "message": "Nhận diện thành công, đang mở cửa!",
  "data": {
    "match": true,
    "user": "Tên người dùng",
    "id": "uuid-của-user",
    "command": "unlock",
    "status": "success"
  }
}

### API 2: Phân ca làm việc hàng loạt (Bulk Assign)

* **Đường dẫn:** `POST /user-shifts/bulk`
* **Mục đích:** Gán lịch làm việc cho nhiều nhân viên trong nhiều ngày cùng lúc. Tích hợp Database Transaction (`BEGIN/COMMIT`) và thuật toán kiểm tra chồng chéo ca (`Overlap Constraint`).

**1. Dữ liệu gửi lên (Request JSON)**
* **Header:** `Content-Type: application/json`
* **Body:**
```json
{
  "assignments": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "shift_id": "8d8a7c6b-5e4f-3d2c-1b0a-9f8e7d6c5b4a",
      "working_date": "2026-05-01"
    },
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "shift_id": "8d8a7c6b-5e4f-3d2c-1b0a-9f8e7d6c5b4a",
      "working_date": "2026-05-02"
    }
  ]
}
```

**2. Dữ liệu trả về (Response JSON)**

**Thành công (201 Created):**
```json
{
  "message": "Đã phân bổ 2/2 ca làm việc thành công."
}
```

**Thất bại (409 Conflict - Do bị đè giờ hoặc vi phạm ràng buộc):**
```json
{
  "error": "Xung đột ca: Nhân viên 550e8400... vào ngày 2026-05-01 đã có lịch làm việc trùng thời gian này."
}
```

## 2. Core Logic

#### Event Determination

* Hệ thống **không yêu cầu user chọn IN/OUT**
* Tự động xác định dựa trên:

  * Lịch sử event gần nhất trong **shift window**
  * Luân phiên trạng thái (`CHECK_IN` ↔ `CHECK_OUT`)

#### Spam Protection

* Trigger DB chặn event trong vòng **5 giây**

---

### 3.2 Shift Handling

#### Shift Definition

* Mỗi shift gồm:

  * `start_time`
  * `end_time`
* Nếu `end_time < start_time` → được xem là **ca qua đêm**

#### Shift Window

Để đảm bảo không bỏ sót dữ liệu:

```text
Shift Window = [start_time - 1h, end_time + 2h]
```

#### Overlap Constraint

Khi gán ca:

```text
(Start A < End B) AND (End A > Start B)
```

→ ngăn chồng chéo ca

#### Limit

* Mỗi user tối đa **2 ca / ngày**

---

### 3.3 Attendance Event Model

Hệ thống hoạt động theo mô hình **event-based**: CHECK_IN → CHECK_OUT → CHECK_IN → CHECK_OUT → ...


### 3.4 Timesheet Calculation

#### Event Collection

* Lấy tất cả events trong shift window

#### Pairing Logic

* Ghép các cặp:

```text
CHECK_IN → CHECK_OUT
```

* Bỏ qua:

  * OUT không có IN trước
  * IN không có OUT sau (tạm thời)

#### Working Hours

```text
Working Hours = tổng thời gian của tất cả cặp IN/OUT hợp lệ
```

---

### 3.5 Attendance Status

| Status       | Meaning                               |
| ------------ | ------------------------------------- |
| `PRESENT`    | Có đủ IN/OUT hợp lệ                   |
| `LATE`       | Check-in đầu tiên trễ                 |
| `WORKING`    | Đã IN nhưng chưa OUT (đang trong ca)  |
| `INCOMPLETE` | Thiếu IN hoặc OUT sau khi ca kết thúc |
| `ABSENT`     | Không có event nào                    |


