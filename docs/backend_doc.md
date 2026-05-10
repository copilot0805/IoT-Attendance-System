1. Tổng quan Kiến trúc Hệ thống
   Backend Node.js đóng vai trò là Bộ điều phối trung tâm (Orchestrator). Mọi luồng dữ liệu từ Phần cứng (CE) và kết quả phân tích từ AI đều được tập hợp tại đây để đưa ra quyết định nghiệp vụ (mở cửa, ghi log, quản lý nhân sự).

Ngôn ngữ: Node.js (Express framework).

Database: PostgreSQL tích hợp extension pgvector (dùng để so khớp khuôn mặt tốc độ cao thay vì so khớp trên RAM của AI).
(lưu ý vì mặc định postgreSQL 1 số bản ko hỗ trợ vector nên phải tải thêm extension này. Còn tải như nào thì có 2 cách là cài trực tiếp hoặc cài qua docker. Khuyến khích làm qua docker vì cách 1 khá lằng nhằng. Nhưng cứ lấy sql script trong database.sql chạy trước, nếu bản postgre trên máy mấy ông đã có vector thì bỏ qua phần lưu ý này)

Cổng kết nối: 5001 (Backend) và 5000 (AI Microservice).

2. Các điểm khớp nối với Team CE (Phần cứng)
   A. Luồng Nhận ảnh Chấm công
   Endpoint: POST /v1/api/attendance.

Định dạng gửi: Raw Binary (image/jpeg).

Cơ chế xử lý: Backend nhận buffer ảnh -> Forward sang AI lấy vector -> Quét Database PostgreSQL -> Trả kết quả mở cửa.

3. Các điểm khớp nối với Team AI (Model)
   Backend yêu cầu AI hoạt động như một Embedding Service (Trạm trích xuất đặc trưng).

Endpoint yêu cầu AI cung cấp: POST /extract.
(cái này tôi đang thêm /extract bên phần AI của ông cường và xử lý nhận diện bằng <=> của postgre luôn vì AI đang hardcode chỉ truyền 2 ảnh vào thư mục AImodel và chỉ so khớp với 2 ảnh đó, đúng logic thì phải quét trên toàn database. Mấy ông có thể vào file attendanceController để xem, phần comment lại là quét bằng ai nhưng phải ném ảnh lên, phần đang chạy là quét bằng postgre)

Định dạng truyền: Raw Binary (image/jpeg) để đồng bộ tốc độ.

Dữ liệu AI trả về cho Backend:

JSON
{
"vector": [0.12, -0.05, ..., 512 dimensions],
"model": "ArcFace"
}
Lý do: Backend sẽ tự thực hiện so khớp bằng SQL để đảm bảo khả năng mở rộng (Scale) lên hàng ngàn nhân viên mà không làm treo RAM của server Python.

4. Cấu trúc Database (PostgreSQL)
   Nhóm AI và CE cần biết các bảng này để hiểu cách dữ liệu được lưu trữ:

Bảng users: Lưu thông tin cơ bản, email, mật khẩu (đã hash) và vai trò (ADMIN/EMPLOYEE).

Bảng face_vectors: Lưu trữ vector 512 chiều của mỗi user. Đây là cột quan trọng nhất để đối chiếu khuôn mặt.

Bảng shifts: Lưu thông tin cấu hình các ca làm việc, bao gồm thời gian bắt đầu và thời gian kết thúc của mỗi ca.

Bảng user_shifts: Bảng trung gian phân công lịch làm việc, chia nhân viên vào các ca cụ thể theo từng ngày làm việc (working_date).

Bảng attendance_events: Lưu trữ lịch sử check in/out. Ghi nhận là check-out nếu sự kiện gần nhất trong ca làm việc hiện tại là check-in và ngược lại, mặc định lần đầu luôn là check-in. Đã thiết lập trigger khóa 5 giây ở database để tránh race condition. Ảnh được lưu ở trên Cloudinary.

Bảng shift_timesheets: Lưu trữ dữ liệu chấm công tổng hợp theo từng ca làm việc của nhân viên. Giờ vào là lần check-in đầu tiên và giờ ra được cập nhật là lần check-out cuối cùng trong ca. Hệ thống tự động tính tổng số giờ làm việc thực tế bằng cách ghép cặp các lần check-in/out, tự động xác định trạng thái đi trễ (LATE), làm thiếu giờ (INCOMPLETE) dựa trên giờ cấu hình của bảng shifts, và tự động đánh dấu vắng mặt (ABSENT) qua cron job đối với các ca làm việc đã kết thúc thời gian khá lâu mà nhân viên không có bản ghi nào.
