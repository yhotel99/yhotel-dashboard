# Tính năng Kanban - Phòng sắp nhận + Phòng trống

## Tổng quan
Tính năng Kanban mới được thêm vào trang `/dashboard/reservation/kanban` để hiển thị các phòng sắp nhận trong 30 ngày tới theo dạng kanban board, kèm theo cột hiển thị phòng trống.

## Tính năng chính

### 1. Hiển thị theo ngày + Cột phòng trống
- **Cột phòng trống**: Hiển thị các phòng có sẵn trong 30 ngày với thông tin chi tiết về khoảng thời gian trống
- **Các cột ngày**: Booking được nhóm theo ngày check-in
- Hiển thị đặc biệt cho "Hôm nay" và "Ngày mai"
- Sắp xếp theo thứ tự thời gian

### 2. Thông tin phòng trống
Mỗi card phòng trống hiển thị:
- Tên phòng và loại phòng
- Tổng số ngày trống trong 30 ngày
- Khoảng trống dài nhất (từ ngày - đến ngày)
- Tất cả các khoảng trống (nếu có nhiều khoảng)
- Giá phòng/đêm
- Màu xanh lá để dễ phân biệt

### 3. Thông tin booking card
Mỗi card booking hiển thị:
- Mã booking (#BOOKING_CODE)
- Trạng thái booking (confirmed/pending)
- Tên khách hàng và số điện thoại
- Tên phòng (hỗ trợ cả single room và multi-room booking)
- Badge "Nhiều phòng" cho multi-room booking
- Ngày check-out, số khách, số đêm
- Tổng tiền (ưu tiên final_amount)
- Ghi chú (nếu có)

### 4. Chi tiết booking
- Click vào booking card để xem chi tiết đầy đủ
- Dialog hiển thị thông tin khách hàng, phòng, thanh toán
- Hỗ trợ hiển thị multi-room booking từ bảng booking_rooms
- QR code thanh toán và thông tin chuyển khoản

### 5. Tìm kiếm và lọc
- Tìm kiếm theo mã booking, tên khách hàng, tên phòng
- Làm mới dữ liệu real-time cho cả booking và phòng trống
- Auto refresh: booking (30s), phòng trống (60s)

### 6. Navigation
- Link từ trang "Đặt chỗ" sang "Kanban"
- Link ngược từ "Kanban" về "Sơ đồ phòng"
- Không hiển thị trong sidebar (chỉ truy cập qua button)

## Cấu trúc file

### Backend
- `app/api/upcoming-checkins/route.ts` - API endpoint cho booking
- `app/api/available-rooms-30days/route.ts` - API endpoint cho phòng trống
- `services/reservation.ts` - Service layer với functions:
  - `getUpcomingCheckinsWithPagination` - Lấy booking sắp tới
  - `getAvailableRoomsIn30Days` - Tính toán phòng trống và khoảng thời gian

### Frontend
- `app/dashboard/reservation/kanban/page.tsx` - Server component page
- `components/reservation/kanban-content.tsx` - Client component chính
- `hooks/use-upcoming-checkins.ts` - SWR hook cho booking data
- `hooks/use-available-rooms.ts` - SWR hook cho available rooms data

### Navigation
- `lib/constants.ts` - Đã xóa SIDEBAR_URLS.RESERVATION_KANBAN khỏi navigation

## Cách sử dụng

1. Truy cập `/dashboard/reservation/kanban` hoặc click "Kanban" từ trang đặt chỗ
2. **Cột phòng trống**: Xem các phòng có sẵn với thông tin khoảng thời gian trống
3. **Cột booking**: Xem các booking được sắp xếp theo ngày check-in
4. Click vào booking card để xem chi tiết đầy đủ
5. Sử dụng tìm kiếm để lọc booking
6. Click refresh để cập nhật dữ liệu mới nhất

## Logic tính toán phòng trống

### Thuật toán
1. Lấy tất cả phòng có status "available"
2. Lấy tất cả booking trong 30 ngày từ bảng `booking_rooms`
3. Với mỗi phòng, tính các khoảng trống:
   - Từ hôm nay đến booking đầu tiên
   - Giữa các booking (từ check-out booking trước đến check-in booking sau)
   - Từ booking cuối cùng đến ngày thứ 30
4. Chỉ hiển thị phòng có ít nhất 1 khoảng trống

### Thông tin hiển thị
- **Tổng ngày trống**: Tổng tất cả các khoảng trống
- **Khoảng dài nhất**: Khoảng trống có nhiều ngày nhất
- **Tất cả khoảng trống**: Danh sách chi tiết nếu có nhiều khoảng

## Quyền truy cập
- Sử dụng cùng quyền với trang "reservations"
- Chỉ hiển thị booking có trạng thái "confirmed" và "pending"
- Chỉ hiển thị phòng có status "available"
- Chỉ tính toán trong 30 ngày tới

## Responsive Design
- Kanban board có thể scroll ngang trên mobile
- Cột phòng trống: width 320px, màu xanh lá
- Cột booking: width 320px mỗi cột
- Cards responsive với thông tin đầy đủ

## Performance
- Booking: Pagination với limit 100 items, refresh 30s
- Phòng trống: Tính toán server-side, refresh 60s
- SWR caching và revalidation
- Optimized queries với proper indexing
- Sử dụng booking_rooms table cho multi-room booking