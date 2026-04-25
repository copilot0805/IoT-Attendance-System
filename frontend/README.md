# Khung Frontend

Thư mục này chứa bộ khung Vite + React + TypeScript cho dự án IoT Attendance.

## Tính năng đã có

- Định tuyến với các route được bảo vệ
- Trạng thái xác thực JWT lưu trong localStorage
- API client Axios với interceptor tự thêm Bearer token
- Trang đăng nhập
- Trang Dashboard dạng placeholder
- Trang quản lý người dùng (thêm/cập nhật ảnh/xóa)
- Trang test điểm danh (upload file JPEG thô tới `/attendance`)

## Bắt đầu nhanh

1. Sao chép file môi trường:

```bash
cp .env.example .env
```

2. Cài đặt dependencies:

```bash
npm install
```

3. Chạy dev server:

```bash
npm run dev
```

## Biến môi trường

- `VITE_API_BASE_URL`: URL gốc của backend API. Ví dụ: `http://localhost:5001/v1/api`
