
# 📑 TÀI LIỆU API - MODULE CA LÀM VIỆC & PHÂN LỊCH
**Base URL khuyến nghị:** `http://localhost:5001/v1/api`
⚠️ **Yêu cầu chung:** Tất cả các API dưới đây (trừ GET `/user-shifts`) đều yêu cầu quyền Admin. Cần truyền Header: `Authorization: Bearer <access_token>`

---

## MODULE: QUẢN LÝ CA LÀM VIỆC (SHIFTS)

### 1. Lấy danh sách toàn bộ ca làm việc
* **Mô tả:** Lấy danh sách các khung giờ ca làm việc đang hoạt động (chưa bị xóa).
* **Endpoint:** `GET /shifts`
* **Response Thành công (200 OK):**
  ```json
  [
    {
      "shift_id": 1,
      "start_time": "08:00:00",
      "end_time": "12:00:00",
      "is_active": true
    },
    {
      "shift_id": 2,
      "start_time": "13:00:00",
      "end_time": "17:00:00",
      "is_active": true
    }
  ]
  ```

### 2. Tạo ca làm việc mới
* **Endpoint:** `POST /shifts`
* **Body Request (JSON):**
  ```json
  {
    "start_time": "08:00:00",
    "end_time": "17:00:00"
  }
  ```
* **Response Thành công (201 Created):**
  ```json
  {
    "message": "Tạo ca thành công",
    "data": {
      "shift_id": 3,
      "start_time": "08:00:00",
      "end_time": "17:00:00",
      "is_active": true
    }
  }
  ```
* **Response Lỗi Thường Gặp:**
  * `400 Bad Request`: Thiếu thời gian, sai format (không phải HH:MM:SS), hoặc giờ bắt đầu trùng giờ kết thúc.
  * `409 Conflict`: Khung giờ ca làm việc này đã tồn tại.

### 3. Cập nhật giờ của ca làm việc
* **Endpoint:** `PUT /shifts/:id`
* **Path Parameters:** `id` (ID của ca cần sửa)
* **Body Request (JSON):**
  ```json
  {
    "start_time": "08:30:00",
    "end_time": "17:30:00"
  }
  ```
* **Response Thành công (200 OK):**
  ```json
  {
    "message": "Cập nhật thành công",
    "data": {
      "shift_id": 1,
      "start_time": "08:30:00",
      "end_time": "17:30:00",
      "is_active": true
    }
  }
  ```
* **Response Lỗi Thường Gặp:**
  * `409 Conflict`: Không thể sửa vì ca này đã được phân lịch cho nhân viên (`SHIFT_IN_USE`), hoặc trùng giờ với một ca khác.
  * `404 Not Found`: Không tìm thấy ca.

### 4. Xóa ca làm việc (Soft Delete)
* **Mô tả:** Ẩn ca làm việc (chuyển `is_active = FALSE`). **Lưu ý:** Nếu ca đã từng có người làm trong quá khứ, hệ thống vẫn cho phép xóa (ẩn đi), nhưng sẽ CHẶN xóa nếu ca đó đang được phân cho nhân viên ở các ngày trong tương lai.
* **Endpoint:** `DELETE /shifts/:id`
* **Path Parameters:** `id` (ID của ca cần xóa)
* **Response Thành công (200 OK):**
  ```json
  {
    "message": "Đã ẩn ca làm việc an toàn"
  }
  ```

---

## MODULE: PHÂN LỊCH LÀM VIỆC (USER_SHIFTS)

### 1. Xem ca làm việc
* **Mô tả:** Xem danh sách lịch làm việc của tất cả nhân viên hoặc của riêng một người. API này mọi người đều xem được.
* **Endpoint:** `GET /user-shifts`
* **Query Parameters:**
  * `start_date` (YYYY-MM-DD, bắt buộc): Từ ngày.
  * `end_date` (YYYY-MM-DD, bắt buộc): Đến ngày.
  * `user_id` (string, tuỳ chọn): Lọc theo ID nhân viên cụ thể.
* **Response Thành công (200 OK):**
  ```json
  [
    {
      "user_id": "uuid-123",
      "full_name": "Nguyễn Văn A",
      "working_date": "2026-05-07T00:00:00.000Z",
      "shift_id": 1,
      "start_time": "08:00:00",
      "end_time": "12:00:00"
    }
  ]
  ```

### 2. Gán ca cho một nhân viên (Cá nhân)
* **Endpoint:** `POST /user-shifts`
* **Body Request (JSON):**
  ```json
  {
    "user_id": "uuid-123",
    "shift_id": 1,
    "working_date": "2026-05-07"
  }
  ```
* **Response Lỗi Thường Gặp:**
  * `400 Bad Request`: Ngày không hợp lệ, hoặc nhân viên đã max 2 ca/ngày.
  * `409 Conflict`: Nhân viên đã được gán ca này rồi, hoặc ca mới bị đè thời gian (OVERLAP) với ca đã có.

### 3. Gán ca hàng loạt 
* **Mô tả:** Phân nhiều ca cho nhân viên trong cùng một thao tác. Rất hữu ích cho giao diện Admin.
* **Endpoint:** `POST /user-shifts/bulk`
* **Body Request (JSON):**
  ```json
  {
    "assignments": [
      {
        "user_id": "uuid-123",
        "shift_id": 1,
        "working_date": "2026-05-07"
      },
      {
        "user_id": "uuid-123",
        "shift_id": 2,
        "working_date": "2026-05-07"
      }
    ]
  }
  ```
* **Response Thành công (201 Created):**
  ```json
  {
    "message": "Đã phân bổ 2 ca làm việc."
  }
  ```
* **Response Lỗi Thường Gặp:**
  * `409 Conflict`: Trả về chi tiết lỗi như đè giờ, quá 2 ca/ngày. Quá trình này dùng Transaction nên nếu lỗi 1 ca sẽ Rollback toàn bộ.

### 4. Hủy/Xóa ca của nhân viên
* **Endpoint:** `DELETE /user-shifts`
* **Query Parameters (Truyền trên URL):**
  * `user_id` (bắt buộc)
  * `shift_id` (bắt buộc)
  * `working_date` (bắt buộc, format: YYYY-MM-DD)
* **Response Thành công (200 OK):**
  ```json
  {
    "message": "Đã hủy ca thành công"
  }
  ```