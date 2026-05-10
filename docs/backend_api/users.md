# 📑 TÀI LIỆU API - MODULE XÁC THỰC & QUẢN LÝ NHÂN SỰ
**Base URL khuyến nghị:** `http://localhost:5001/v1/api` (hoặc domain thực tế của bạn)

---

## MODULE 1: XÁC THỰC (AUTHENTICATION)

### 1. Đăng nhập hệ thống
* **Mô tả:** API dùng để đăng nhập cho cả Admin và Nhân viên.
* **Endpoint:** `POST /users/login` (Hoặc `POST /login`)
* **Headers:** * `Content-Type: application/json`
* **Body Request (JSON):**
  ```json
  {
    "email": "admin@hcmut.edu.vn",
    "password": "password123"
  }
  ```
* **Response Thành công (200 OK):**
  ```json
  {
    "EC": 0,
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "email": "admin@hcmut.edu.vn",
      "name": "Admin Nguyen",
      "role": "ADMIN"
    }
  }
  ```
* **Response Thất bại (200 OK - do logic code xử lý mã lỗi EC):**
  ```json
  {
    "EC": 1,
    "EM": "Email/Password không hợp lệ"
  }
  ```

---

## MODULE 2: QUẢN LÝ NHÂN SỰ (DÀNH CHO ADMIN)
⚠️ **Yêu cầu chung cho Module này:** Bắt buộc truyền Header xác thực: `Authorization: Bearer <access_token>`

### 1. Lấy danh sách nhân viên (Có phân trang & Tìm kiếm)
* **Mô tả:** Lấy danh sách users để hiển thị lên bảng quản lý.
* **Endpoint:** `GET /users`
* **Headers:** * `Authorization: Bearer <access_token>`
* **Query Parameters (Truyền trên URL):**
  * `search` (string, tuỳ chọn): Từ khóa tìm kiếm theo tên hoặc ID nhân viên.
  * `page` (number, mặc định: 1): Trang hiện tại muốn lấy.
  * `limit` (number, mặc định: 10, tối đa: 100): Số lượng nhân viên trên mỗi trang.
  * *Ví dụ: `GET /users?search=Nguyen&page=1&limit=10`*
* **Response Thành công (200 OK):**
  ```json
  {
    "message": "Lấy danh sách nhân viên thành công",
    "data": [
      {
        "user_id": "uuid-string-123",
        "full_name": "Nguyễn Văn A",
        "email": "nva@gmail.com",
        "role": "EMPLOYEE"
      }
    ],
    "pagination": {
      "total_records": 1,
      "total_pages": 1,
      "current_page": 1,
      "limit": 10,
      "has_next": false,
      "has_prev": false
    }
  }
  ```

### 2. Đăng ký nhân viên mới (Enroll)
* **Mô tả:** Tạo tài khoản nhân viên mới và đồng thời gửi ảnh khuôn mặt cho AI tạo vector nhận diện.
* **Endpoint:** `POST /users/enroll`
* **Headers:** * `Content-Type: multipart/form-data` (Bắt buộc dùng form-data vì có upload file)
  * `Authorization: Bearer <access_token>`
* **Body Request (Form-Data):**
  * `full_name` (text, bắt buộc): Tên nhân viên (VD: Nguyễn Văn A)
  * `email` (text, bắt buộc): Email đăng nhập
  * `password` (text, bắt buộc): Mật khẩu
  * `role` (text, tuỳ chọn): Quyền (Mặc định là `EMPLOYEE`, hoặc truyền `ADMIN`)
  * `photo` (file, bắt buộc): File ảnh chân dung khuôn mặt
* **Response Thành công (201 Created):**
  ```json
  {
    "message": "Tạo người dùng và đăng ký khuôn mặt thành công!",
    "data": {
      "user": {
        "user_id": "uuid-string-123",
        "full_name": "Nguyễn Văn A",
        "email": "nva@gmail.com",
        "role": "EMPLOYEE",
        "created_at": "...",
        "updated_at": "..."
      },
      "face_vector": {
        "vector_id": 1,
        "model_version": "ArcFace",
        "is_active": true
      }
    }
  }
  ```
* **Response Lỗi Thường Gặp:**
  * `400 Bad Request`: Thiếu thông tin hoặc AI không tìm thấy khuôn mặt trong ảnh.
  * `409 Conflict`: Email đã tồn tại trong hệ thống.

### 3. Cập nhật ảnh khuôn mặt
* **Mô tả:** Cập nhật lại ảnh khuôn mặt (tạo vector mới) cho nhân viên đã tồn tại.
* **Endpoint:** `PUT /users/:id`
* **Headers:** * `Content-Type: multipart/form-data`
  * `Authorization: Bearer <access_token>`
* **Path Parameters:**
  * `id` (string/uuid): ID của nhân viên cần cập nhật ảnh. (VD: `/users/uuid-123`)
* **Body Request (Form-Data):**
  * `photo` (file, bắt buộc): File ảnh mới 
* **Response Thành công (201 Created):**
  ```json
  {
    "message": "Cập nhật ảnh khuôn mặt thành công!",
    "data": {
      "face_vector": {
        "vector_id": 2,
        "model_version": "ArcFace",
        "is_active": true
      }
    }
  }
  ```
* **Response Lỗi Thường Gặp:**
  * `404 Not Found`: Không tìm thấy user.
  * `400 Bad Request`: Ảnh không thay đổi (SAME_PHOTO) hoặc Lỗi từ AI.

### 4. Xóa nhân viên
* **Mô tả:** Xóa nhân viên khỏi cơ sở dữ liệu.
* **Endpoint:** `DELETE /users/:id`
* **Headers:** * `Authorization: Bearer <access_token>`
* **Path Parameters:**
  * `id` (string/uuid): ID của nhân viên cần xóa.
* **Response Thành công (200 OK):**
  ```json
  {
    "message": "Xóa người dùng thành công!",
    "data": {
      "user_id": "uuid-string-123"
    }
  }
  ```
* **Response Lỗi Thường Gặp:**
  * `404 Not Found`: Không tìm thấy nhân viên.