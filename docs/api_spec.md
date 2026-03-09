TÀI LIỆU TÍCH HỢP HỆ THỐNG CHẤM CÔNG IOT (BKU)

Dự án: Đồ án đa ngành hướng Công nghệ phần mềm (CE \& CS)

Nền tảng IoT Core: HiveMQ Cloud (AWS Provider)



1\. Quy trình vận hành \& Đường đi của gói tin

Hệ thống vận hành theo một vòng lặp khép kín giữa phần cứng và phần mềm:



Giai đoạn Thu thập (Chụp ảnh): Người dùng đứng trước ESP32-CAM. Chip thực hiện chụp ảnh và đóng gói dữ liệu.



Đường đi 1 (ESP32-CAM -> Server): Gói tin chứa ảnh được gửi qua giao thức HTTP POST trực tiếp đến địa chỉ API của Web App/Server do nhóm CS quản lý.



Giai đoạn Xử lý (AI Recognition): Server nhận ảnh, chạy model nhận diện khuôn mặt để xác định danh tính nhân viên.



Đường đi 2 (Server -> HiveMQ Cloud): Sau khi có kết quả, Server đóng vai trò là MQTT Publisher, gửi một bản tin JSON lên HiveMQ Cloud qua Topic bku/attendance/gate/control.



Đường đi 3 (HiveMQ Cloud -> ESP32 Controller): ESP32 Controller (đang ở trạng thái Subscribe) nhận bản tin từ Cloud gần như tức thì, thực hiện mở cửa và hiện thông báo lên LCD.



2\. Đặc tả gói tin (Data Formats)

A. Gói tin gửi từ ESP32-CAM (Upstream)

Để các bạn CS dễ dàng xử lý bằng các thư viện AI như OpenCV, gói tin gửi đi nên ở dạng Binary Image:



Giao thức: HTTP POST.



Content-Type: multipart/form-data hoặc image/jpeg.



Dữ liệu: Toàn bộ mảng byte của ảnh JPEG. Việc gửi ảnh thô giúp Server không mất thời gian giải mã chuỗi phức tạp.



B. Gói tin điều khiển từ Server (Downstream)

Gói tin từ Server gửi xuống thiết bị điều khiển của Kiên phải tuân thủ cấu trúc JSON để dễ bóc tách bằng thư viện ArduinoJson:



Topic: bku/attendance/gate/control



Định dạng mẫu:



JSON

{

&nbsp; "command": "unlock",

&nbsp; "name": "Nguyen Van A",

&nbsp; "id": "211xxxx",

&nbsp; "status": "success"

}

3\. Thông số kết nối HiveMQ (Thực tế)

Các bạn CS cần cấu hình Web App kết nối theo các thông số sau:



Cluster URL: 2ee617fd7b3842639f968abf50a4670f.s1.eu.hivemq.cloud



Cổng MQTT (Dành cho ESP32): 8883 (TLS)



Cổng WebSocket (Dành cho Web App): 8884



TLS WebSocket URL: wss://2ee617fd7b3842639f968abf50a4670f.s1.eu.hivemq.cloud:8884/mqtt



Thông tin đăng nhập: Sử dụng Credentials hcmut\_attendance đã được kích hoạt quyền PUBLISH\_SUBSCRIBE.



4\. Hướng dẫn cho nhóm CS (Web App)

Thư viện: Khuyên dùng mqtt.js để kết nối từ trình duyệt.



Kết nối: Web App phải sử dụng cổng 8884 và giao thức WSS vì HiveMQ Cloud bắt buộc kết nối bảo mật.



Config: Các bạn có thể dùng mục Web Client trực tiếp trên console HiveMQ để gửi thử gói tin JSON và xem Kiên đã nhận được chưa.

