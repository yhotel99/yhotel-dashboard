# Hướng dẫn sử dụng YHotel Dashboard

Tài liệu này dành cho **nhân viên lễ tân**, **quản lý** và **tài khoản toàn quyền (quản trị viên)**. Đọc phần vai trò của bạn trước, rồi làm theo quy trình nghiệp vụ khi cần.

**Cập nhật:** 16/09/2026

---

## Mục lục

1. [Đăng nhập và tài khoản](#1-đăng-nhập-và-tài-khoản)
2. [Ba vai trò — ai được làm gì](#2-ba-vai-trò--ai-được-làm-gì)
3. [Chi nhánh](#3-chi-nhánh)
4. [Nhân viên — việc hằng ngày](#4-nhân-viên--việc-hằng-ngày)
5. [Quản lý](#5-quản-lý)
6. [Toàn quyền (quản trị viên)](#6-toàn-quyền-quản-trị-viên)
7. [Quy trình nghiệp vụ](#7-quy-trình-nghiệp-vụ)
8. [Câu hỏi thường gặp](#8-câu-hỏi-thường-gặp)

---

## 1. Đăng nhập và tài khoản

1. Mở trang dashboard của khách sạn.
2. Nhập **Email** và **Mật khẩu**.
3. Bấm **Login**.

Sau khi đăng nhập:

- **Nhân viên** vào thẳng trang **Đặt chỗ** (sơ đồ phòng).
- **Quản lý** và **toàn quyền** vào trang **Tổng quan**.

### Menu tài khoản (góc dưới sidebar)

Bấm tên của bạn để:

- Xem **Account** (thông tin cá khoản).
- **Tạo mã QR thanh toán** — tạo QR chuyển khoản nhanh.
- **Settings** — chỉ hiện với quản lý và toàn quyền.
- **Log out** — đăng xuất.

Nếu quên mật khẩu: liên hệ quản lý hoặc quản trị viên. Hệ thống không có nút tự đặt lại mật khẩu trên màn hình đăng nhập.

---

## 2. Ba vai trò — ai được làm gì

Hệ thống có đúng 3 vai trò. Menu bên trái **chỉ hiện những mục bạn được phép**. Không thấy một mục nào đó thường là do vai trò, không phải lỗi.

| Vai trò trên hệ thống | Tên hiển thị | Dùng cho |
| --- | --- | --- |
| `staff` | Nhân viên | Lễ tân, vận hành phòng mỗi ngày |
| `manager` | Quản lý | Điều hành chi nhánh, xem báo cáo, duyệt hoàn tiền |
| `admin` | Quản trị viên | Toàn quyền: người dùng, chi nhánh, cài đặt hệ thống |

### Bảng quyền theo menu

| Menu | Nhân viên | Quản lý | Toàn quyền |
| --- | --- | --- | --- |
| Tổng quan (báo cáo) | — | Có | Có |
| Quản lý ca | — | Có (cần quyền HR, xem mục 5) | Có (cần quyền HR) |
| Báo cáo (analytics) | — | Có | Có |
| Chi nhánh | — | Xem | Xem + thêm/sửa/xóa |
| Phòng | — | Có | Có |
| Đặt chỗ | Có | Có | Có |
| Đơn đặt phòng | Có | Có | Có |
| Phiên online | Có | Có | Có |
| Khách hàng | Có | Có | Có |
| Thanh toán | — | Có | Có |
| Voucher | Xem, áp mã khi đặt phòng | Xem + tạo/sửa/xóa | Xem + tạo/sửa/xóa |
| Hoàn tiền (danh sách duyệt) | Tạo yêu cầu từ đơn đặt phòng | Có | Có |
| Webhook (lịch sử thanh toán ngân hàng) | — | Có | Có |
| Thư viện ảnh | — | Có | Có |
| Blog | — | Có | Có |
| Người dùng | — | — | Có |
| Nhật ký (audit) | — | Có | Có |
| Settings | — | Có | Có |
| Đối soát Excel | — | Có | Có |
| Tạo mã QR thanh toán | Có | Có | Có |

---

## 3. Chi nhánh

YHotel có thể có nhiều chi nhánh.

- **Nhân viên** gắn với **một chi nhánh**. Chỉ thấy phòng, booking, khách của chi nhánh đó. Không có bộ lọc đổi chi nhánh trên thanh công cụ.
- **Quản lý** và **toàn quyền** xem được tất cả chi nhánh. Trên thanh công cụ phía trên có bộ chọn chi nhánh:
  - **Tất cả chi nhánh** — xem tổng hợp.
  - Chọn một chi nhánh — lọc dữ liệu theo chi nhánh đó.

Khi tạo booking hoặc khách hàng, quản lý / toàn quyền chọn chi nhánh trên form. Nhân viên thì hệ thống tự gắn chi nhánh của mình.

---

## 4. Nhân viên — việc hằng ngày

Phần này là checklist lễ tân. Chi tiết từng bước nằm ở [mục 7](#7-quy-trình-nghiệp-vụ).

### Màn hình chính: Đặt chỗ

Sidebar → **Đặt chỗ**. Đây là sơ đồ phòng theo tầng.

Mỗi thẻ phòng cho biết:

| Màu / trạng thái | Ý nghĩa |
| --- | --- |
| Đang trống | Có thể nhận khách |
| Sắp nhận (cam) | Đã có booking sắp check-in |
| Đang sử dụng (xanh) | Khách đang ở |
| Sắp trả (xanh dương) | Gần giờ trả phòng |
| Quá giờ trả (đỏ) | Khách quá hạn checkout — ưu tiên xử lý |

Phòng còn có trạng thái dọn:

- **Sẵn sàng** / **Đã dọn**
- **Chưa dọn**
- **Bảo trì** (không đặt được)

**Việc cần làm trên sơ đồ:**

1. Lọc theo trạng thái (Sắp nhận, Đang sử dụng, Sắp trả, Quá giờ trả) hoặc tìm số phòng.
2. Bấm phòng **trống** để **đặt phòng nhanh**.
3. Menu ba chấm trên thẻ phòng: đánh dấu **Chưa dọn** hoặc **Làm sạch**.
4. Phòng đang có khách: bấm để **checkout** khi khách trả phòng.
5. Nút **Kanban**: xem lịch 30 ngày tới (phòng trống + khách sắp nhận).

### Đơn đặt phòng

Sidebar → **Đơn đặt phòng**.

- Tìm theo mã booking, tên khách, phòng.
- Lọc trạng thái: Chờ xác nhận → Đã xác nhận → Đã check-in → Đã check-out / Đã hủy.
- **Tạo đơn** khi đặt nhiều phòng hoặc cần nhập đầy đủ (voucher, cọc, ghi chú).
- **Kiểm tra phòng trống** trước khi nhận walk-in.

Chuỗi trạng thái **chỉ đi một chiều**:

```
Chờ xác nhận → Đã xác nhận → Đã check-in → Đã check-out
                    ↓
                 Đã hủy
```

Không sửa / không hủy đơn đã check-out hoặc đã hủy.

Menu ba chấm trên mỗi đơn:

- Xem chi tiết
- Giấy đăng ký / In PDF
- Hiển thị mã QR (lên màn QR chi nhánh)
- Chỉnh sửa (khi chưa checkout / chưa hủy)
- Thay đổi trạng thái (check-in, checkout, xác nhận)
- Đánh dấu đặt cọc (khi đơn còn chờ xác nhận và có số tiền cọc)
- Yêu cầu hoàn tiền
- Hủy booking (có thể gửi email hủy)

Khi **xác nhận** đơn, hệ thống có thể gửi email xác nhận cho khách nếu đơn có email.

### Khách hàng

Sidebar → **Khách hàng**.

- Thêm khách: họ tên, email, SĐT, quốc tịch, CCCD, ngày sinh, loại khách, **nguồn**.
- Loại khách: **Thường**, **Khách VIP**, **Blacklist**.
- Nguồn: Website, Agoda, Expedia, Trip, Booking, Traveloka, Facebook, Tiktok, Hotline/zalo, Khác.
- Có thể tạo khách ngay trong form đặt phòng nếu chưa có trong hệ thống.
- Khách gắn với chi nhánh nhà, nhưng **có thể đặt phòng ở chi nhánh khác** (tìm khách khi tạo booking).

### Phiên online

Sidebar → **Phiên online**.

Đây là các phiên khách giữ phòng và thanh toán QR / chuyển khoản **trước khi** hệ thống tạo booking.

- **Đang chờ**: khách chưa thanh toán hoặc đang thanh toán.
- **Hết hạn**: mã hết hạn. Nếu khách vẫn chuyển tiền sau đó, dùng **Tạo booking thủ công**.
- **Đã tạo booking**: xong, không làm gì thêm.
- **Thất bại**: thanh toán lỗi.

Nếu báo “phòng đang được khách giữ để thanh toán online”: đợi hết phiên hoặc chọn phòng khác. Đó không phải lỗi hệ thống.

### Voucher (nhân viên)

Bạn **xem** danh sách voucher và **nhập mã** khi tạo đơn. Không tạo / sửa / xóa voucher. Nhờ quản lý nếu cần mã mới.

### Việc không làm được (và nên báo quản lý)

- Sửa giá phòng, thêm phòng, bảo trì dài hạn.
- Duyệt hoàn tiền, xem sổ thanh toán tổng.
- Tạo tài khoản đồng nghiệp.
- Đổi cài đặt website / tài khoản ngân hàng.

---

## 5. Quản lý

Quản lý làm được toàn bộ việc của nhân viên, cộng thêm điều hành và báo cáo. **Không** quản lý danh sách người dùng (chỉ toàn quyền).

### Sau khi đăng nhập

Vào **Tổng quan**: doanh thu, số đơn, công suất, hoàn tiền, biểu đồ theo tháng, nguồn khách, loại phòng. Lọc theo khoảng ngày và chi nhánh.

**Báo cáo** (sidebar): KPI sâu hơn — công suất, aging, heatmap, lọc loại phòng / nguồn / tầng.

Báo cáo doanh thu **không tính** đơn Chờ xác nhận và Đã hủy. Chỉ tính Đã xác nhận, Đã check-in, Đã check-out.

### Phòng

Sidebar → **Phòng**.

- Thêm / sửa phòng: số phòng, tầng, loại (Standard, Deluxe, Superior, Family), giá/đêm, số khách tối đa, tiện nghi, ảnh, chi nhánh.
- Đặt trạng thái **Bảo trì** khi phòng không nhận khách.
- Không xóa phòng nếu còn lịch sử booking gắn với phòng đó.

### Tài chính

- **Thanh toán**: cọc, tiền phòng, dịch vụ thêm; trạng thái Chờ / Đã thanh toán / Thất bại / Đã hoàn / Đã hủy. Phương thức: Chuyển khoản, Thanh toán tại khách sạn, OnePay, Thanh toán trên nền tảng khác.
- **Hoàn tiền**: duyệt, từ chối, hoặc đánh dấu đã hoàn.
- **Webhook**: đối chiếu giao dịch ngân hàng (SePay) với mã booking. Dùng khi khách chuyển khoản nhưng đơn chưa nhảy trạng thái.
- **Voucher**: tạo mã giảm `%` hoặc số tiền cố định, hạn dùng, bật/tắt.
- **Đối soát Excel**: menu **Thanh toán** → **Đối soát Excel**. Upload file hóa đơn checkout để đối soát. Nhân viên không vào được trang này.

### Nội dung website

- **Thư viện ảnh**: tải ảnh (có thể nhiều file), xóa ảnh (không hoàn tác).
- **Blog**: nháp / đã xuất bản / lưu trữ.

### Chi nhánh

Xem danh sách chi nhánh. **Không** tạo hoặc xóa chi nhánh — việc đó thuộc toàn quyền.

### Nhật ký

Sidebar → **Nhật ký**. Xem ai đã tạo/sửa booking, khách, v.v. Không xóa nhật ký trừ khi là toàn quyền.

### Settings (menu tài khoản)

- **Chung**: tiêu đề, mô tả website, ảnh hero, thông tin liên hệ.
- **Giá**: hệ số giá theo thứ trong tuần, khoảng ngày lễ / phụ thu.
- **Hạng phòng web**: hạng phòng hiển thị trên website đặt phòng.
- **Mạng xã hội**: link Facebook, Instagram, …
- **Tài khoản ngân hàng**: STK theo chi nhánh (ảnh hưởng QR thanh toán).

### Quản lý ca

Hiện trên sidebar với quản lý và toàn quyền, nhưng **chỉ dùng được** nếu email PMS trùng tài khoản HR có quyền `ADMIN` hoặc `BRANCH_ADMIN`. Nếu báo “Không có quyền quản lý ca HR”, nhờ IT gán quyền bên hệ thống HR Connect.

### Người dùng

Quản lý **không** thấy menu Người dùng. Muốn thêm lễ tân mới: nhờ toàn quyền.

---

## 6. Toàn quyền (quản trị viên)

Toàn quyền = mọi việc của quản lý, cộng:

### Người dùng

Sidebar → **Người dùng**.

**Tạo tài khoản mới** (chỉ tạo được Quản lý hoặc Nhân viên, không tự tạo thêm Quản trị viên từ form tạo):

1. Tên, email (dùng để đăng nhập), mật khẩu (tối thiểu 6 ký tự), SĐT.
2. Vai trò: **Quản lý** hoặc **Nhân viên**.
3. **Nhân viên bắt buộc chọn chi nhánh.**
4. Quản lý có thể không gắn chi nhánh cố định (xem tất cả chi nhánh).
5. Trạng thái: Hoạt động / Vô hiệu hóa / Tạm khóa.

**Sửa tài khoản:** có thể đổi vai trò (kể cả thành Quản trị viên), chi nhánh, trạng thái. **Không xóa user** — hãy **Vô hiệu hóa** khi nghỉ việc.

Không giao tài khoản toàn quyền cho lễ tân.

### Chi nhánh

Thêm / sửa / ngưng hoạt động chi nhánh. Chi nhánh ngưng sẽ không còn trong bộ lọc đặt phòng.

### Cài đặt hệ thống

Giống quản lý (Settings), cộng quyền quản trị hạ tầng: đừng đổi STK ngân hàng hay giá web nếu chưa thống nhất với kế toán / marketing.

### Nhật ký

Xem và (nếu được cấp) xóa nhật ký kiểm toán khi cần dọn dữ liệu.

---

## 7. Quy trình nghiệp vụ

### 7.1 Đặt phòng walk-in (khách đến quầy)

1. **Đặt chỗ** → tìm phòng trống, hoặc **Đơn đặt phòng** → **Kiểm tra phòng trống** (chọn ngày nhận / trả).
2. Nếu khách chưa có trong hệ thống: tạo khách (đủ tên, SĐT/email, nguồn).
3. Tạo đơn:
   - Từ thẻ phòng trống: **đặt phòng nhanh**, hoặc
   - **Đơn đặt phòng** → tạo đơn (một hoặc nhiều phòng).
4. Chọn ngày, số khách, tiền cọc (nếu có), phương thức thanh toán, voucher (nếu có).
5. Xác nhận đơn. Gửi email nếu khách có email.
6. Check-in khi khách nhận phòng (trạng thái **Đã check-in**).
7. In **Giấy đăng ký / PDF** nếu cần.
8. Checkout khi trả phòng. Đánh dấu phòng **Chưa dọn**, rồi **Làm sạch** khi housekeeping xong.

### 7.2 Booking từ OTA (Agoda, Booking, Traveloka, Expedia, Trip, …)

1. Tạo hoặc tìm khách, chọn **Nguồn** đúng kênh OTA.
2. Tạo đơn, phương thức thường là **Thanh toán trên nền tảng khác** nếu OTA đã thu tiền.
3. Xác nhận → check-in / checkout như trên.

### 7.3 Thanh toán chuyển khoản / QR

1. Trên đơn: **Hiển thị mã QR** để hiện trên màn hình chi nhánh (`/qr/...`), hoặc dùng **Tạo mã QR thanh toán** trong menu tài khoản.
2. Khách chuyển khoản theo nội dung có **mã booking**.
3. Webhook ngân hàng (quản lý xem ở menu **Webhook**) sẽ khớp mã và cập nhật thanh toán.
4. Nếu khách đặt online: theo dõi **Phiên online**. Hết hạn mà vẫn có tiền: **Tạo booking thủ công** từ phiên đó.

### 7.4 Check-in / Check-out

1. Mở đơn → **Thay đổi trạng thái**.
2. Chỉ được chuyển bước kế tiếp (ví dụ Đã xác nhận → Đã check-in).
3. Checkout cũng làm được từ thẻ phòng trên **Đặt chỗ**.

### 7.5 Hủy và hoàn tiền

1. Đơn chưa checkout: menu → **Hủy booking**. Chọn có gửi email hủy hay không.
2. Cần trả tiền: **Yêu cầu hoàn tiền** trên đơn.
3. Quản lý vào **Hoàn tiền**: Duyệt / Từ chối / Đã hoàn tiền.

### 7.6 Gắn người tạo đơn (hoa hồng / báo cáo lễ tân)

Trên chi tiết booking, nhân viên/quản lý có quyền **gắn người tạo** nếu đơn chưa có. Quản lý và toàn quyền còn **đổi** người tạo khi đã gắn nhầm. Dùng cho báo cáo thực thu theo lễ tân.

### 7.7 Kanban 30 ngày

Từ **Đặt chỗ** bấm **Kanban**.

- Cột phòng trống: khoảng ngày còn trống trong 30 ngày.
- Các cột theo ngày check-in: khách sắp đến.
- Bấm card để xem chi tiết, QR, thông tin chuyển khoản.
- Tự làm mới định kỳ; có ô tìm kiếm mã / tên khách / phòng.

---

## 8. Câu hỏi thường gặp

**Không thấy menu Tổng quan / Phòng / Thanh toán?**  
Đúng với tài khoản nhân viên. Liên hệ quản trị viên nếu bạn cần quyền quản lý.

**Phòng báo không trống dù trên sơ đồ thấy trống?**  
Có thể đang bị **phiên online** giữ, hoặc đã có booking chồng ngày. Đổi ngày, đổi phòng, hoặc đợi hết phiên QR.

**Khách đã chuyển khoản nhưng đơn vẫn “chờ”?**  
Kiểm tra nội dung CK có đúng mã booking không. Quản lý xem **Webhook**. Nếu phiên online hết hạn, tạo booking thủ công từ phiên đó.

**Đặt được khách của chi nhánh khác không?**  
Có. Tìm khách khi tạo booking. Chi nhánh của **đơn** là nơi khách ở; chi nhánh trên hồ sơ khách là chi nhánh nhà.

**Làm sao xem nguồn khách Agoda / Tiktok / Hotline?**  
Khi tạo hoặc sửa khách, chọn **Nguồn**. Quản lý xem phân bổ nguồn trên **Tổng quan**.

**Tài khoản nhân viên nghỉ việc?**  
Toàn quyền vào **Người dùng** → đổi trạng thái **Vô hiệu hóa**. Không xóa tài khoản.

**Đổi mật khẩu?**  
Nhờ quản lý hoặc toàn quyền (họ có quyền cập nhật mật khẩu user). Tự đổi trong Account nếu hộp thoại tài khoản cho phép.

---

## Hỗ trợ

1. Đọc lại đúng mục vai trò của bạn trong tài liệu này.
2. Hỏi quản lý tại chi nhánh.
3. Việc liên quan tài khoản, chi nhánh, quyền hạn: nhờ **quản trị viên**.

Tài liệu kỹ thuật cho IT: [TAI_LIEU_KY_THUAT.md](./TAI_LIEU_KY_THUAT.md).
