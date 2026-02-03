# Tài Liệu Hướng Dẫn Sử Dụng Hệ Thống YHotel Dashboard

## Mục Lục

1. [Giới Thiệu](#giới-thiệu)
2. [Đăng Nhập Hệ Thống](#đăng-nhập-hệ-thống)
3. [Tổng Quan Dashboard](#tổng-quan-dashboard)
4. [Quản Lý Phòng Khách Sạn](#quản-lý-phòng-khách-sạn)
5. [Quản Lý Đặt Chỗ](#quản-lý-đặt-chỗ)
6. [Quản Lý Đơn Đặt Phòng](#quản-lý-đơn-đặt-phòng)
7. [Quản Lý Khách Hàng](#quản-lý-khách-hàng)
8. [Quản Lý Thanh Toán](#quản-lý-thanh-toán)
9. [Lịch Sử Webhook](#lịch-sử-webhook)
10. [Quản Lý Hoàn Tiền](#quản-lý-hoàn-tiền)
11. [Bộ Sưu Tập Ảnh](#bộ-sưu-tập-ảnh)
12. [Quản Lý Blog](#quản-lý-blog)
13. [Quản Lý Người Dùng](#quản-lý-người-dùng)
14. [Cài Đặt Hệ Thống](#cài-đặt-hệ-thống)
15. [Câu Hỏi Thường Gặp](#câu-hỏi-thường-gặp)

---

## Giới Thiệu

**YHotel Dashboard** là hệ thống quản lý khách sạn toàn diện, giúp bạn quản lý các hoạt động kinh doanh của khách sạn một cách hiệu quả. Hệ thống bao gồm các tính năng chính:

- Quản lý phòng khách sạn
- Quản lý đặt chỗ và đơn đặt phòng
- Quản lý khách hàng
- Quản lý thanh toán và hoàn tiền
- Báo cáo và thống kê
- Quản lý nội dung blog
- Quản lý người dùng và phân quyền

---

## Đăng Nhập Hệ Thống

### Cách Đăng Nhập

1. Truy cập vào trang đăng nhập của hệ thống
2. Nhập **Email** và **Mật khẩu** của bạn
3. Nhấn nút **"Login"** để đăng nhập
4. Sau khi đăng nhập thành công, bạn sẽ được chuyển đến trang Dashboard

### Lưu Ý

- Email và mật khẩu là bắt buộc
- Đảm bảo bạn có quyền truy cập vào hệ thống
- Nếu quên mật khẩu, liên hệ quản trị viên để được hỗ trợ

---

## Tổng Quan Dashboard

Trang Dashboard cung cấp cái nhìn tổng quan về hoạt động kinh doanh của khách sạn với các thông tin:

### Các Chỉ Số Chính

- **Tổng Doanh Thu**: Tổng doanh thu trong khoảng thời gian được chọn
- **Tổng Số Đặt Phòng**: Tổng số đơn đặt phòng
- **Tỷ Lệ Lấp Đầy Trung Bình**: Tỷ lệ phòng được đặt trung bình
- **Tổng Hoàn Tiền**: Tổng số tiền đã hoàn lại cho khách hàng

### Biểu Đồ và Thống Kê

1. **Biểu Đồ Doanh Thu và Đặt Phòng Theo Tháng**
   - Xem xu hướng doanh thu và số lượng đặt phòng theo tháng
   - Có thể chọn xem 6 tháng hoặc 12 tháng gần nhất

2. **Thống Kê Theo Loại Phòng**
   - Biểu đồ tròn hiển thị số lượng phòng theo từng loại (Standard, Deluxe, Superior, Family)
   - Giúp nắm bắt được loại phòng nào đang phổ biến

3. **Thống Kê Theo Nguồn Khách Hàng**
   - Phân tích khách hàng đến từ các nguồn khác nhau (Booking.com, Agoda, Website, Vãng lai)
   - Giúp đánh giá hiệu quả của các kênh marketing

4. **Thống Kê Trạng Thái Phòng**
   - Xem số lượng phòng theo từng trạng thái (Available, Occupied, Maintenance, etc.)

5. **Danh Sách Thanh Toán Gần Đây**
   - Hiển thị các giao dịch thanh toán mới nhất
   - Có thể xuất dữ liệu ra file CSV

### Lọc Dữ Liệu

- Chọn khoảng thời gian để xem báo cáo bằng **Date Range Picker**
- Chọn loại báo cáo muốn xem
- Chọn khoảng thời gian cho biểu đồ tháng (6 tháng hoặc 12 tháng)

---

## Quản Lý Phòng Khách Sạn

### Xem Danh Sách Phòng

1. Vào menu **"Phòng Khách Sạn"** từ sidebar
2. Xem danh sách tất cả các phòng với thông tin:
   - Tên phòng
   - Loại phòng
   - Giá mỗi đêm
   - Số khách tối đa
   - Trạng thái phòng
   - Các tiện ích

### Xem Chi Tiết Phòng

1. Nhấn vào phòng muốn xem chi tiết
2. Xem thông tin đầy đủ:
   - Thông tin cơ bản (tên, loại, giá, số khách)
   - Mô tả chi tiết
   - Danh sách tiện ích
   - Hình ảnh phòng
   - Lịch sử đặt phòng

### Tạo Phòng Mới

1. Nhấn nút **"Thêm Phòng"** hoặc **"Tạo Phòng"**
2. Điền các thông tin:
   - **Tên phòng**: Tên hiển thị của phòng
   - **Loại phòng**: Chọn loại (Standard, Deluxe, Superior, Family)
   - **Giá mỗi đêm**: Giá thuê phòng cho một đêm
   - **Số khách tối đa**: Số lượng khách tối đa có thể ở
   - **Mô tả**: Mô tả chi tiết về phòng
   - **Tiện ích**: Chọn các tiện ích có sẵn (WiFi, Bãi đỗ xe, Cà phê, Bữa sáng, Giặt ủi, Hỗ trợ Taxi)
   - **Hình ảnh**: Upload hình ảnh phòng
3. Nhấn **"Lưu"** để tạo phòng mới

### Chỉnh Sửa Phòng

1. Tìm phòng cần chỉnh sửa trong danh sách
2. Nhấn nút **"Chỉnh sửa"** (biểu tượng bút chì)
3. Cập nhật thông tin cần thiết
4. Nhấn **"Lưu"** để cập nhật

### Xóa Phòng

1. Tìm phòng cần xóa
2. Nhấn nút **"Xóa"** (biểu tượng thùng rác)
3. Xác nhận việc xóa trong hộp thoại

### Đặt Phòng Nhanh

1. Từ danh sách phòng, nhấn nút **"Đặt Phòng"** trên phòng muốn đặt
2. Chọn khách hàng
3. Chọn ngày check-in và check-out
4. Nhập số lượng khách
5. Chọn phương thức thanh toán
6. Nhấn **"Xác nhận"** để tạo đơn đặt phòng

### Kiểm Tra Phòng Trống

- Sử dụng bộ lọc để xem phòng theo trạng thái
- Xem lịch đặt phòng để biết phòng nào còn trống trong khoảng thời gian cụ thể

---

## Quản Lý Đặt Chỗ

Trang **"Đặt Chỗ"** cung cấp cái nhìn tổng quan về trạng thái các phòng trong khách sạn, giúp bạn theo dõi và quản lý phòng một cách trực quan.

### Xem Trạng Thái Phòng

1. Vào menu **"Đặt Chỗ"** từ sidebar
2. Xem danh sách tất cả các phòng được nhóm theo tầng
3. Mỗi phòng hiển thị:
   - Tên phòng và loại phòng
   - Trạng thái hiện tại (Trống, Sắp check-in, Đang ở, Sắp check-out, Quá hạn check-out)
   - Thông tin đặt phòng hiện tại (nếu có)
   - Thời gian đã ở / thời gian đã đặt (nếu đang ở)

### Lọc Phòng Theo Trạng Thái

1. Sử dụng các nút lọc ở đầu trang để xem phòng theo trạng thái:
   - **Tất cả**: Hiển thị tất cả phòng
   - **Trống**: Phòng đang trống, sẵn sàng đón khách
   - **Sắp check-in**: Phòng có đặt phòng sắp đến ngày check-in
   - **Đang ở**: Phòng đang có khách ở
   - **Sắp check-out**: Phòng có khách sắp đến ngày check-out
   - **Quá hạn check-out**: Phòng có khách quá hạn check-out

### Tìm Kiếm Phòng

1. Sử dụng ô tìm kiếm ở đầu trang
2. Nhập tên phòng hoặc loại phòng để lọc kết quả

### Chế Độ Hiển Thị

- **Grid**: Hiển thị phòng dạng lưới (mặc định)
- **List**: Hiển thị phòng dạng danh sách

### Đặt Phòng Nhanh Từ Trang Đặt Chỗ

1. Nhấn vào phòng muốn đặt
2. Chọn **"Đặt phòng"** từ menu
3. Điền thông tin đặt phòng trong hộp thoại
4. Xác nhận để tạo đơn đặt phòng

### Thay Đổi Trạng Thái Phòng

1. Nhấn vào phòng muốn thay đổi trạng thái
2. Chọn **"Thay đổi trạng thái"** từ menu
3. Chọn trạng thái mới:
   - **Sẵn sàng**: Phòng sẵn sàng đón khách
   - **Sạch**: Phòng đã được dọn dẹp
   - **Chưa dọn**: Phòng chưa được dọn dẹp
   - **Bảo trì**: Phòng đang bảo trì
4. Xác nhận thay đổi

### Checkout Phòng

1. Nhấn vào phòng đang có khách ở
2. Chọn **"Checkout"** từ menu
3. Xác nhận checkout để đánh dấu khách đã trả phòng

---

## Quản Lý Đơn Đặt Phòng

### Xem Danh Sách Đơn Đặt Phòng

1. Vào menu **"Đơn Đặt Phòng"** từ sidebar
2. Xem danh sách tất cả đơn đặt phòng với thông tin:
   - Mã đơn
   - Khách hàng
   - Phòng
   - Ngày check-in/check-out
   - Trạng thái
   - Tổng tiền

### Lọc và Tìm Kiếm

- Sử dụng ô tìm kiếm để tìm đơn theo mã booking, tên khách hàng, tên phòng
- Sử dụng bộ lọc để tìm đơn theo:
  - Trạng thái (Pending, Confirmed, Checked-in, Checked-out, Cancelled)
  - Khoảng thời gian
  - Khách hàng
  - Phòng

### Kiểm Tra Phòng Trống

1. Nhấn nút **"Kiểm Tra Phòng Trống"** ở đầu trang
2. Chọn khoảng thời gian muốn kiểm tra (ngày check-in và check-out)
3. Hệ thống sẽ hiển thị danh sách phòng còn trống trong khoảng thời gian đó

### Xem Chi Tiết Đơn Đặt Phòng

1. Nhấn vào đơn đặt phòng muốn xem
2. Xem thông tin chi tiết:
   - Thông tin khách hàng
   - Thông tin phòng
   - Lịch trình check-in/check-out
   - Thông tin thanh toán
   - Ghi chú

### Chỉnh Sửa Đơn Đặt Phòng

1. Nhấn nút **"Chỉnh sửa"** trên đơn đặt phòng
2. Cập nhật thông tin cần thiết
3. Lưu ý: Không thể chỉnh sửa đơn đã check-in hoặc check-out

### Thay Đổi Trạng Thái Đơn Đặt Phòng

1. Nhấn nút **"Thay đổi trạng thái"**
2. Chọn trạng thái mới:
   - **Pending**: Đang chờ xác nhận
   - **Confirmed**: Đã xác nhận
   - **Checked-in**: Đã nhận phòng
   - **Checked-out**: Đã trả phòng
   - **Cancelled**: Đã hủy
3. Nhập ngày check-in/check-out thực tế nếu cần
4. Xác nhận thay đổi

### Hủy Đơn Đặt Phòng

1. Nhấn nút **"Hủy đơn"**
2. Xác nhận việc hủy đơn
3. Lưu ý: Đơn đã check-in hoặc check-out không thể hủy

### Chuyển Phòng

1. Nhấn nút **"Chuyển phòng"**
2. Chọn phòng mới
3. Xác nhận việc chuyển phòng
4. Hệ thống sẽ tự động kiểm tra phòng mới có trống không

### Đánh Dấu Tiền Đặt Cọc

1. Nhấn nút **"Đánh dấu tiền đặt cọc"**
2. Nhập số tiền đặt cọc đã nhận
3. Xác nhận

### Tạo Yêu Cầu Hoàn Tiền

1. Từ đơn đặt phòng, nhấn **"Tạo yêu cầu hoàn tiền"**
2. Điền thông tin yêu cầu hoàn tiền
3. Xác nhận tạo yêu cầu

---

## Quản Lý Khách Hàng

### Xem Danh Sách Khách Hàng

1. Vào menu **"Khách Hàng"** từ sidebar
2. Xem danh sách tất cả khách hàng với thông tin:
   - Tên
   - Email
   - Số điện thoại
   - Loại khách hàng (Regular, VIP, Blacklist)
   - Nguồn khách hàng

### Tạo Khách Hàng Mới

1. Nhấn nút **"Thêm Khách Hàng"** hoặc **"Tạo Khách Hàng"**
2. Điền thông tin:
   - **Tên**: Tên đầy đủ của khách hàng
   - **Email**: Địa chỉ email
   - **Số điện thoại**: Số điện thoại liên hệ
   - **Loại khách hàng**: Chọn loại (Thường, VIP, Blacklist)
   - **Nguồn khách hàng**: Chọn nguồn (Booking.com, Agoda, Website, Vãng lai)
   - **Địa chỉ**: Địa chỉ của khách hàng (tùy chọn)
   - **Ghi chú**: Ghi chú về khách hàng (tùy chọn)
3. Nhấn **"Lưu"** để tạo khách hàng mới

### Chỉnh Sửa Thông Tin Khách Hàng

1. Tìm khách hàng cần chỉnh sửa
2. Nhấn nút **"Chỉnh sửa"**
3. Cập nhật thông tin
4. Nhấn **"Lưu"** để cập nhật

### Xem Chi Tiết Khách Hàng

1. Nhấn vào khách hàng muốn xem
2. Xem thông tin chi tiết:
   - Thông tin cá nhân
   - Lịch sử đặt phòng
   - Lịch sử thanh toán
   - Ghi chú

### Xem Lịch Sử Đặt Phòng Của Khách Hàng

1. Từ danh sách khách hàng, nhấn nút **"Xem đặt phòng"** trên khách hàng muốn xem
2. Hệ thống sẽ chuyển đến trang hiển thị tất cả đơn đặt phòng của khách hàng đó

### Khóa Khách Hàng

1. Tìm khách hàng cần khóa
2. Nhấn nút **"Xóa"** (thực chất là khóa khách hàng)
3. Xác nhận việc khóa
4. Lưu ý: Không thể khóa khách hàng đã có đơn đặt phòng đang hoạt động

---

## Quản Lý Thanh Toán

### Xem Danh Sách Thanh Toán

1. Vào menu **"Thanh Toán"** từ sidebar
2. Xem danh sách tất cả giao dịch thanh toán với thông tin:
   - Mã thanh toán
   - Đơn đặt phòng liên quan
   - Khách hàng
   - Số tiền
   - Loại thanh toán (Tiền đặt cọc, Tiền phòng)
   - Phương thức thanh toán
   - Trạng thái (Pending, Completed, Failed, Refunded)

### Lọc Thanh Toán

- Lọc theo:
  - Trạng thái
  - Phương thức thanh toán
  - Loại thanh toán
  - Khoảng thời gian
  - Khách hàng

### Xem Chi Tiết Thanh Toán

1. Nhấn vào giao dịch thanh toán muốn xem
2. Xem thông tin chi tiết:
   - Thông tin đơn đặt phòng
   - Thông tin khách hàng
   - Chi tiết thanh toán
   - Lịch sử cập nhật

### Cập Nhật Trạng Thái Thanh Toán

1. Nhấn nút **"Cập nhật trạng thái"** trên giao dịch
2. Chọn trạng thái mới
3. Xác nhận cập nhật

---

## Lịch Sử Webhook

### Xem Lịch Sử Webhook

1. Vào menu **"Lịch Sử Webhook"** từ sidebar
2. Xem danh sách tất cả các webhook đã nhận với thông tin:
   - Thời gian nhận
   - Loại sự kiện
   - Trạng thái
   - Dữ liệu webhook

### Xem Chi Tiết Webhook

1. Nhấn vào webhook muốn xem
2. Xem thông tin chi tiết:
   - Headers
   - Body
   - Response
   - Trạng thái xử lý

---

## Quản Lý Hoàn Tiền

### Xem Danh Sách Yêu Cầu Hoàn Tiền

1. Vào menu **"Hoàn Tiền"** từ sidebar
2. Xem danh sách tất cả yêu cầu hoàn tiền với thông tin:
   - Mã yêu cầu
   - Đơn đặt phòng liên quan
   - Khách hàng
   - Số tiền yêu cầu hoàn
   - Lý do hoàn tiền
   - Trạng thái (Pending, Approved, Rejected, Completed)

### Tạo Yêu Cầu Hoàn Tiền

1. Nhấn nút **"Tạo Yêu Cầu Hoàn Tiền"**
2. Chọn đơn đặt phòng
3. Điền thông tin:
   - Số tiền yêu cầu hoàn
   - Lý do hoàn tiền
   - Ghi chú
4. Nhấn **"Gửi yêu cầu"**

### Xử Lý Yêu Cầu Hoàn Tiền

1. Nhấn vào yêu cầu hoàn tiền cần xử lý
2. Xem thông tin chi tiết
3. Chọn hành động:
   - **Duyệt**: Duyệt yêu cầu hoàn tiền
   - **Từ chối**: Từ chối yêu cầu với lý do
   - **Hoàn tiền**: Đánh dấu đã hoàn tiền thành công

---

## Bộ Sưu Tập Ảnh

### Xem Bộ Sưu Tập Ảnh

1. Vào menu **"Bộ Sưu Tập Ảnh"** từ sidebar
2. Xem tất cả hình ảnh đã upload

### Upload Ảnh Mới

1. Nhấn nút **"Tải ảnh lên"**
2. Trong hộp thoại, chọn một hoặc nhiều file ảnh từ máy tính (có thể chọn nhiều file cùng lúc)
3. Xem preview các ảnh đã chọn
4. Có thể xóa ảnh khỏi danh sách preview trước khi upload
5. Nhấn **"Tải lên"** để bắt đầu upload
6. Theo dõi tiến trình upload cho từng ảnh
7. Sau khi upload thành công, ảnh sẽ được lưu và có thể sử dụng trong các phần khác của hệ thống

### Xem Ảnh Với Zoom

1. Nhấn vào ảnh muốn xem
2. Ảnh sẽ được hiển thị với khả năng zoom để xem chi tiết

### Xóa Ảnh

1. Di chuột qua ảnh cần xóa
2. Nhấn nút **"Xóa"** (biểu tượng thùng rác) xuất hiện ở góc trên bên phải
3. Xác nhận việc xóa trong hộp thoại
4. Lưu ý: Hành động này không thể hoàn tác

---

## Quản Lý Blog

### Xem Danh Sách Blog

1. Vào menu **"Blog"** từ sidebar
2. Xem danh sách tất cả bài viết blog với thông tin:
   - Tiêu đề
   - Tác giả
   - Ngày đăng
   - Trạng thái (Draft, Published, Archived)

### Tạo Bài Viết Blog Mới

1. Nhấn nút **"Tạo Bài Viết"** hoặc **"Thêm Blog"**
2. Hệ thống sẽ chuyển đến trang tạo blog mới
3. Điền thông tin:
   - **Tiêu đề**: Tiêu đề bài viết
   - **Mô tả ngắn**: Mô tả tóm tắt
   - **Nội dung**: Nội dung chi tiết (sử dụng trình soạn thảo)
   - **Hình ảnh đại diện**: Chọn ảnh từ bộ sưu tập hoặc upload mới
   - **Trạng thái**: Chọn trạng thái (Nháp, Đã xuất bản, Lưu trữ)
   - **Tags**: Thêm tags cho bài viết
4. Nhấn **"Lưu"** hoặc **"Xuất bản"** để lưu bài viết

### Chỉnh Sửa Bài Viết

1. Tìm bài viết cần chỉnh sửa trong danh sách
2. Nhấn nút **"Chỉnh sửa"**
3. Hệ thống sẽ chuyển đến trang chỉnh sửa blog
4. Cập nhật nội dung
5. Nhấn **"Lưu"** để cập nhật

### Xóa Bài Viết

1. Tìm bài viết cần xóa
2. Nhấn nút **"Xóa"**
3. Xác nhận việc xóa

### Thay Đổi Trạng Thái Bài Viết

- **Nháp**: Bài viết chưa được xuất bản
- **Đã xuất bản**: Bài viết đã được công khai
- **Lưu trữ**: Bài viết đã được lưu trữ

---

## Quản Lý Người Dùng

### Xem Danh Sách Người Dùng

1. Vào menu **"Người Dùng"** từ sidebar
2. Xem danh sách tất cả người dùng trong hệ thống với thông tin:
   - Tên
   - Email
   - Vai trò
   - Trạng thái

### Tạo Người Dùng Mới

1. Nhấn nút **"Thêm Người Dùng"** hoặc **"Tạo Người Dùng"**
2. Điền thông tin:
   - **Tên**: Tên đầy đủ
   - **Email**: Địa chỉ email (dùng để đăng nhập)
   - **Mật khẩu**: Mật khẩu đăng nhập
   - **Vai trò**: Chọn vai trò (Admin, Manager, Staff, etc.)
   - **Quyền truy cập**: Cấu hình quyền truy cập các module
3. Nhấn **"Lưu"** để tạo người dùng

### Chỉnh Sửa Người Dùng

1. Tìm người dùng cần chỉnh sửa
2. Nhấn nút **"Chỉnh sửa"**
3. Cập nhật thông tin:
   - Thông tin cá nhân (tên, email, số điện thoại)
   - Vai trò (role)
   - Trạng thái (status)
4. Nhấn **"Lưu"** để cập nhật

### Quản Lý Phân Quyền

Hệ thống sử dụng hệ thống phân quyền chi tiết:
- Mỗi module có các quyền: View, Create, Update, Delete
- Quản trị viên có thể cấu hình quyền cho từng người dùng
- Người dùng chỉ thấy các menu và tính năng mà họ có quyền truy cập

**Lưu ý**: Hệ thống không hỗ trợ xóa người dùng. Thay vào đó, bạn có thể thay đổi trạng thái của người dùng để vô hiệu hóa tài khoản.

---

## Cài Đặt Hệ Thống

### Truy Cập Cài Đặt

1. Vào menu **"Cài Đặt"** từ sidebar (nếu có quyền)
2. Xem và cấu hình các thiết lập hệ thống

### Các Thiết Lập Có Thể

Trang cài đặt được chia thành các tab:

1. **Thông tin Website**
   - **Tiêu đề website**: Tiêu đề hiển thị trên website
   - **Mô tả website**: Mô tả về website
   - **Hero Images**: Quản lý hình ảnh hero (có thể thêm nhiều ảnh)

2. **Thông tin Liên Hệ**
   - **Email liên hệ**: Địa chỉ email liên hệ
   - **Số điện thoại**: Số điện thoại liên hệ
   - **Địa chỉ**: Địa chỉ khách sạn
   - **Giờ làm việc**: Giờ làm việc của khách sạn

3. **Mạng Xã Hội**
   - Thêm và quản lý các liên kết mạng xã hội (Facebook, Instagram, Twitter, v.v.)
   - Mỗi mạng xã hội có thể thêm URL tương ứng

4. **Thông tin Ngân Hàng**
   - **Số tài khoản**: Số tài khoản ngân hàng
   - **Tên ngân hàng**: Tên ngân hàng
   - **BIN**: Mã BIN của ngân hàng
   - **Chủ tài khoản**: Tên chủ tài khoản

### Lưu Cài Đặt

1. Sau khi cập nhật các thiết lập, nhấn nút **"Lưu"** ở cuối trang
2. Hệ thống sẽ lưu tất cả các thay đổi
3. Các thiết lập sẽ được áp dụng ngay lập tức

---

## Câu Hỏi Thường Gặp

### Làm thế nào để đặt phòng cho khách hàng?

1. Vào menu **"Đơn Đặt Phòng"**
2. Nhấn **"Tạo Đơn Đặt Phòng"**
3. Chọn khách hàng (hoặc tạo mới)
4. Chọn phòng và ngày check-in/check-out
5. Điền thông tin và xác nhận

### Làm thế nào để kiểm tra phòng còn trống?

1. Vào menu **"Đặt Chỗ"** hoặc **"Phòng Khách Sạn"**
2. Sử dụng tính năng **"Kiểm Tra Phòng Trống"**
3. Chọn khoảng thời gian muốn kiểm tra
4. Hệ thống sẽ hiển thị danh sách phòng còn trống

### Làm thế nào để xem báo cáo doanh thu?

1. Vào trang **"Tổng Quan"** (Dashboard)
2. Xem các chỉ số và biểu đồ doanh thu
3. Sử dụng bộ lọc thời gian để xem báo cáo theo khoảng thời gian cụ thể
4. Có thể xuất dữ liệu ra file CSV

### Làm thế nào để hoàn tiền cho khách hàng?

1. Vào menu **"Hoàn Tiền"**
2. Nhấn **"Tạo Yêu Cầu Hoàn Tiền"**
3. Chọn đơn đặt phòng liên quan
4. Điền thông tin và gửi yêu cầu
5. Sau khi duyệt, đánh dấu đã hoàn tiền thành công

### Tôi không thấy một số menu, tại sao?

Hệ thống sử dụng phân quyền. Bạn chỉ thấy các menu và tính năng mà bạn có quyền truy cập. Liên hệ quản trị viên để được cấp quyền nếu cần.

### Làm thế nào để thay đổi trạng thái đơn đặt phòng?

1. Vào menu **"Đơn Đặt Phòng"**
2. Tìm đơn cần thay đổi
3. Nhấn nút **"Thay đổi trạng thái"**
4. Chọn trạng thái mới và xác nhận

### Làm thế nào để upload ảnh cho phòng?

1. Vào menu **"Bộ Sưu Tập Ảnh"** để upload ảnh trước
2. Hoặc khi tạo/chỉnh sửa phòng, sử dụng tính năng upload ảnh trực tiếp
3. Chọn ảnh từ máy tính hoặc từ bộ sưu tập đã có

---

## Hỗ Trợ

Nếu bạn gặp vấn đề hoặc có câu hỏi, vui lòng:

1. Kiểm tra lại tài liệu này
2. Liên hệ quản trị viên hệ thống
3. Kiểm tra quyền truy cập của bạn

---

**Phiên bản tài liệu**: 1.0  
**Cập nhật lần cuối**: 2024

