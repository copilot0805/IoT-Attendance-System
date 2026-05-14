
# 🧠 TÀI LIỆU LOGIC NGHIỆP VỤ CHẤM CÔNG (BUSINESS LOGIC) - PHIÊN BẢN V2

Tài liệu này mô tả chi tiết cách hệ thống xử lý chấm công, tính toán giờ làm và chốt sổ tự động theo kiến trúc **First-Appearance (Ghi nhận lần đầu)** và **Auto-Checkout (Tự động hoàn tất)**, tối ưu cho hệ thống sử dụng một camera.

---

## 1. QUY TẮC THỜI GIAN CA LÀM VIỆC 
Hệ thống áp dụng các vùng đệm thời gian (Buffer) thực tế để hỗ trợ nhân viên và đảm bảo dữ liệu chính xác:

* **BUFFER_BEFORE (30 phút):** Nhân viên được phép điểm danh sớm tối đa 30 phút trước giờ bắt đầu ca. *(VD: Ca làm việc lúc 08:00, hệ thống bắt đầu nhận diện và ghi nhận công từ 07:30).*
* **Ân hạn đi trễ (Grace Period - 5 phút):** Hệ thống cho phép nhân viên đi trễ tối đa **5 phút** so với giờ bắt đầu ca chính thức mà không bị tính trạng thái `LATE`.
* **Xử lý Ca Đêm (Night Shift):** Hệ thống tự động nhận diện các ca làm việc xuyên đêm (giờ kết thúc nhỏ hơn giờ bắt đầu). Trong trường hợp này, hệ thống sẽ ngầm cộng thêm 1 ngày vào mốc thời gian kết thúc ca để đảm bảo các phép tính thời gian diễn ra chính xác.

---

## 2. CƠ CHẾ GHI NHẬN LẦN ĐẦU (FIRST-APPEARANCE)
Để giải quyết bài toán thiếu dữ liệu hướng di chuyển (In/Out) trên một camera, hệ thống áp dụng logic tập trung vào sự xuất hiện:

1.  **Lần đầu xuất hiện:** Khi nhân viên quẹt mặt thành công lần đầu tiên trong khung giờ ca trực (bao gồm vùng đệm), hệ thống sẽ khởi tạo một bản ghi công duy nhất trong bảng `shift_timesheets`. Đây là mốc thời gian quan trọng nhất để xác định trạng thái chuyên cần.
2.  **Các lần xuất hiện sau:** Mọi lượt quét mặt tiếp theo trong cùng một ca làm việc chỉ đóng vai trò kích hoạt lệnh mở cửa (Open Door) và lưu nhật ký truy cập thô (`attendance_events`) để phục vụ việc hậu kiểm, không làm thay đổi hay ghi đè dữ liệu tính công đã khởi tạo.

---

## 3. TỰ ĐỘNG TÍNH CÔNG (AUTO-CHECKOUT)
Hệ thống chuyển từ cơ chế đợi check out sang cơ chế tự động hoàn tất giờ công dựa trên quy định ca làm việc nhằm đảm bảo tính nhất quán của dữ liệu:

* **Công thức tính giờ công (Working Hours):** * **Trường hợp Đúng giờ/Đến sớm:** Nếu nhân viên điểm danh trong khoảng cho phép (từ mốc Early Buffer đến hết 5 phút ân hạn), hệ thống tính trọn vẹn số giờ của ca đó để đảm bảo quyền lợi: 
      `Working Hours = (Giờ kết thúc ca - Giờ bắt đầu ca) / 3,600,000`
    * **Trường hợp Đi trễ:** Nếu điểm danh sau 5 phút ân hạn, giờ công sẽ được tính thực tế từ lúc quẹt thẻ: 
      `Working Hours = (Giờ kết thúc ca - Giờ quẹt mặt thực tế) / 3,600,000`
    *(Kết quả được làm tròn đến 2 chữ số thập phân).*

* **Mốc Checkout:** Cột `last_check_out` trong bảng công được mặc định gán bằng giờ kết thúc ca làm việc theo lịch ngay khi ghi nhận lượt điểm danh đầu tiên. Điều này giúp bảng công luôn ở trạng thái hoàn tất mà không cần lượt quẹt thẻ ra.

* **Phân loại Trạng thái (Status):**
    * `PRESENT`: Điểm danh hợp lệ (bao gồm cả trường hợp đến sớm hoặc trong 5 phút ân hạn). Hệ thống ghi nhận làm đủ giờ theo định mức ca.
    * `LATE`: Điểm danh sau mốc ân hạn 5 phút. Hệ thống tự động trừ giờ công dựa trên thời gian đến muộn thực tế.
    * `ABSENT`: Nhân viên có lịch trực nhưng không có bất kỳ lượt quẹt mặt nào trong suốt ca làm việc (được xác định và chèn tự động bởi Cronjob).

---

## 4. CƠ CHẾ CHỐT SỔ TỰ ĐỘNG (CRONJOB)
Hệ thống sử dụng một tiến trình chạy ngầm để khép kín chu trình quản lý dữ liệu:

* **Thời gian kích hoạt:** Đúng **12:00 Trưa mỗi ngày** (Xử lý dữ liệu cho ngày hôm trước để đảm bảo các ca làm việc muộn hoặc ca đêm đã kết thúc hoàn toàn).
* **Nhiệm vụ Duy nhất:** Hệ thống thực hiện lệnh `LEFT JOIN` giữa danh sách phân ca (`user_shifts`) và bảng công thực tế (`shift_timesheets`). 
* **Hành động:** Nếu nhân viên có lịch trực nhưng không tồn tại bản ghi điểm danh nào trong bảng công, hệ thống sẽ tự động chèn một bản ghi mới với trạng thái `ABSENT` và số giờ công bằng `0`.
* **Tính an toàn:** Sử dụng ràng buộc `ON CONFLICT (user_id, shift_id, working_date) DO NOTHING` để đảm bảo không phát sinh dữ liệu trùng lặp trong trường hợp hệ thống chạy lại lệnh chốt sổ.