Chào các bạn nhóm CS, đây là bản tài liệu hướng dẫn chi tiết từ A-Z để thiết lập "đường hầm" ngrok và kết nối hệ thống với HiveMQ Cloud cho đồ án đa ngành của chúng ta. Vì chúng ta làm việc khác mạng Wi-Fi, bộ đôi ngrok (nhận ảnh) và HiveMQ (gửi lệnh) là giải pháp tối ưu để thông suốt dữ liệu.



TÀI LIỆU TÍCH HỢP HỆ THỐNG: NGOK \& HIVEMQ CLOUD

Dự án: Hệ thống chấm công IoT (CE \& CS)

Mục tiêu: Nhận ảnh UXGA từ ESP32-CAM và gửi lệnh điều khiển về ESP32 Controller qua Internet.



1\. Hướng dẫn A-Z cài đặt ngrok cho nhóm CS

Ngrok sẽ biến Server chạy trên máy tính cá nhân của các bạn thành một địa chỉ HTTPS công khai để ESP32-CAM có thể đẩy ảnh lên.



Bước 1: Tải và Đăng ký

Truy cập ngrok.com và tạo một tài khoản miễn phí.



Tải bản cài đặt phù hợp với hệ điều hành (Windows/macOS) và giải nén.



Bước 2: Xác thực (AuthToken)

Sau khi tải về, các bạn mở Terminal/Command Prompt tại thư mục chứa file ngrok và gõ lệnh sau để lưu token (chỉ làm 1 lần duy nhất):

ngrok config add-authtoken <TOKEN\_CUA\_BAN>



Bước 3: Kích hoạt "Đường hầm"

Khởi động Web Server của nhóm (ví dụ Node.js hoặc Python đang chạy ở port 5000).



Trong Terminal, gõ lệnh: ngrok http 5000.



Lấy link: Tìm dòng Forwarding, các bạn sẽ thấy một link có dạng https://abcd-123.ngrok-free.app.



Gửi link này cho thành viên CE để nạp vào code ESP32-CAM.



Lưu ý: Với bản ngrok miễn phí, mỗi lần các bạn tắt đi bật lại thì link sẽ bị thay đổi. Hãy báo ngay cho CE mỗi khi có link mới.



2. Đặc tả định dạng ảnh (Image Format)

Đây là phần quan trọng để các bạn cấu hình hàm nhận ảnh trên Server:



Định dạng file: .jpg (JPEG chuẩn).



Độ phân giải: UXGA (1600x1200) - Mức cao nhất để AI nhận diện nét nhất.



Kiểu dữ liệu (Payload): Raw Binary (Mảng byte thô).



Lưu ý cho CS: Phía CE không gửi chuỗi Base64 hay Multipart-form để tiết kiệm RAM cho ESP32. Các bạn chỉ cần đọc trực tiếp request body dưới dạng buffer và ghi vào file .jpg là xong.



Mime-Type: image/jpeg.



Dung lượng dự kiến: Khoảng 300 KB - 600 KB mỗi tấm ảnh.



3. Thông số hạ tầng HiveMQ Cloud (Cố định)

Sau khi AI nhận diện xong, các bạn cần gửi lệnh "unlock" qua HiveMQ Cloud để mở cửa. Thông số Cluster thực tế như sau:



Thông số	Giá trị thực tế

Cluster URL	2ee617fd7b3842639f968abf50a4670f.s1.eu.hivemq.cloud

WebSocket Port	8884 (Bắt buộc cho Web App)

Username	hcmut\_attendance

Password	(Theo mật khẩu nhóm đã thống nhất)

Topic	bku/attendance/gate/control

Thư viện đề xuất: Sử dụng mqtt.js để kết nối từ trình duyệt Web App qua giao thức wss://.



4. Đặc tả gói tin (Data Formats)

A. Nhận ảnh từ ESP32-CAM (Upstream)

Giao thức: HTTPS POST (qua ngrok).



Định dạng: Binary Image (image/jpeg).



Độ phân giải: UXGA (1600x1200) - Các bạn sẽ nhận được mảng byte ảnh JPEG chất lượng cao nhất để chạy OpenCV.



B. Gửi lệnh điều khiển (Downstream)

Sau khi AI xác định danh tính, hãy Publish một bản tin JSON lên Topic trên HiveMQ:



JSON

{

  "command": "unlock",

  "name": "Ten Nhan Vien",

  "id": "MSSV",

  "status": "success"

}

5. Quy trình vận hành tổng thể

CE: Chụp ảnh UXGA -> Gửi qua link ngrok.



CS: Nhận ảnh qua ngrok -> Chạy AI nhận diện -> Publish JSON lên HiveMQ.



CE: ESP32 Controller nhận JSON -> Quay Servo mở cửa \& Hiện LCD.



Các bạn CS có thể dùng mục Web Client trên HiveMQ Console để test gửi lệnh JSON thủ công xem phía phần cứng đã nhận được chưa.

