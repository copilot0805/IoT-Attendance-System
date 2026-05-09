
# 🧠 TÀI LIỆU LOGIC NGHIỆP VỤ CHẤM CÔNG (BUSINESS LOGIC)

Tài liệu này mô tả chi tiết cách hệ thống xử lý dữ liệu quẹt thẻ, bắt cặp In/Out, tính toán giờ làm và chốt sổ tự động.

---

## 1. QUY TẮC THỜI GIAN CA LÀM VIỆC 
Hệ thống áp dụng các vùng đệm thời gian (Buffer) thực tế để hỗ trợ nhân viên đi sớm/về trễ:

* **BUFFER_BEFORE (30 phút):** Nhân viên được phép Check-in sớm tối đa 30 phút trước giờ bắt đầu ca. *(VD: Ca 08:00, cho phép quẹt từ 07:30).*
* **BUFFER_AFTER (60 phút):** Nhân viên được phép Check-out trễ tối đa 60 phút sau khi ca kết thúc. *(VD: Ca 17:00, cho phép quẹt đến 18:00).*
* **MAX_LATE (2 tiếng):** Giới hạn "vớt" Check-out. Nếu nhân viên quên Check-out và quẹt thẻ trễ quá 2 tiếng so với giờ tan ca (VD: 19:00 quẹt cho ca 17:00), hệ thống sẽ **TỪ CHỐI** để tránh phát sinh chi phí tăng ca.
* **Xử lý Ca Đêm (Night Shift):** Hệ thống tự động nhận diện ca qua ngày (VD: 22:00 - 06:00). Nếu giờ kết thúc nhỏ hơn giờ bắt đầu, hệ thống ngầm cộng thêm 1 ngày vào giờ kết thúc (do Date khởi tạo dựa vào working_date là ngày bắt đầu ca nên phải cộng 1 ngày cho thời gian kết thúc).

---

## 2. LOGIC BẮT CẶP IN / OUT
Mỗi lần nhân viên quét mặt thành công trong khung giờ hợp lệ, hệ thống sẽ tự động quyết định đó là lượt VÀO hay RA dựa trên lịch sử trước đó:
1. **Lượt quẹt đầu tiên:** Mặc định là `CHECK_IN`.
2. **Lượt quẹt tiếp theo:** * Nếu log gần nhất là `CHECK_IN` -> Lượt này là `CHECK_OUT`.
   * Nếu log gần nhất là `CHECK_OUT` -> Lượt này là `CHECK_IN` (Hỗ trợ ca gãy, nhân viên ra ngoài có việc rồi quay lại).

---

## 3. TÍNH TOÁN BẢNG CÔNG & TRẠNG THÁI
Dữ liệu thô từ log quẹt thẻ sẽ được tổng hợp vào bảng `shift_timesheets`:

* **Tính Giờ Làm (Working Hours):** Cộng dồn tất cả các khoảng thời gian giữa các cặp `[CHECK_IN - CHECK_OUT]` hợp lệ nằm gọn trong khung giờ ca. Trừ đi thời gian đi trễ/về sớm.
* **Ân hạn đi trễ (Grace Period):** Hệ thống cho phép nhân viên đi trễ **5 phút** mà không bị phạt.
* **Phân loại Trạng thái (Status):**
  * `WORKING`: Đã Check-in và ca làm việc vẫn đang diễn ra.
  * `PRESENT`: Có đủ lượt In/Out, thời gian In hợp lệ (<= 5 phút trễ).
  * `LATE`: Lượt Check-in đầu tiên trễ hơn giờ quy định + 5 phút ân hạn.
  * `INCOMPLETE`: Đã Check-in nhưng thiếu Check-out khi ca làm việc kết thúc.
  * `ABSENT`: Không có sự kiện nào.


---

## 4. CƠ CHẾ CHỐT SỔ TỰ ĐỘNG
Để khép kín chu trình quản lý mà không cần Admin can thiệp, hệ thống có một tiến trình chạy ngầm (Cronjob).

* **Thời gian kích hoạt:** Đúng **12:00 Trưa mỗi ngày**. (Sử dụng 12h trưa để đảm bảo các ca làm đêm qua 6h sáng đã đóng sổ an toàn).
* **Nhiệm vụ 1 (Xử lý quên quẹt thẻ):** Quét toàn bộ những người có trạng thái `WORKING` của ngày hôm qua (Có In mà không có Out). Chuyển trạng thái thành `INCOMPLETE`.
* **Nhiệm vụ 2 (Đánh vắng mặt):** Quét toàn bộ danh sách phân ca (`user_shifts`) của ngày hôm qua. So khớp với bảng công. Nếu ai không có bất kỳ dòng dữ liệu chấm công nào -> Tự động chèn một dòng `ABSENT` (Vắng mặt không phép).