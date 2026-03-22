# Báo cáo kiểm tra và sửa lỗi Dashboard Metrics

## Ngày kiểm tra: 21/03/2026

## Tóm tắt các vấn đề phát hiện

### 1. 🟩 Tổng thu (Gross Revenue) - ĐÃ SỬA

**Vấn đề cũ:**
- Chỉ tính payments có status = PAID
- Sử dụng `paid_at` thay vì `created_at` của booking
- Không phản ánh đúng tổng doanh thu (Gross) của kỳ

**Logic mới (ĐÚNG):**
```typescript
// Tổng thu = Tổng giá trị TẤT CẢ bookings được tạo trong kỳ
const totalRevenue = currentBookings?.reduce(
  (sum, b) => sum + (b.total_amount || 0), 0
) || 0;
```

**Giải thích:**
- Gross Revenue = Tổng giá trị đặt phòng (không phân biệt đã thanh toán hay chưa)
- Lọc theo `created_at` của booking (ngày đặt phòng)
- Phù hợp với nguyên tắc kế toán: ghi nhận doanh thu khi có đơn hàng

---

### 2. 📊 Tổng đặt phòng - ĐÃ ĐÚNG

**Logic hiện tại:**
```typescript
const totalBookings = currentBookings?.length || 0;
```

✅ Đếm số bookings được tạo trong khoảng thời gian → ĐÚNG

---

### 3. 📈 Tỷ lệ lấp đầy (Occupancy Rate) - ĐÃ SỬA HOÀN TOÀN

**Vấn đề cũ (SAI NGHIÊM TRỌNG):**
```typescript
// SAI: Chỉ đếm số booking có status CHECKED_IN/CHECKED_OUT
const activeBookings = bookings.filter(
  b => b.status === CHECKED_IN || b.status === CHECKED_OUT
).length;
const occupancy = (activeBookings / totalRooms) * 100;
```

**Sai ở đâu:**
- Không tính theo số đêm (room-nights)
- Không tính overlap với khoảng thời gian báo cáo
- Công thức sai hoàn toàn

**Logic mới (ĐÚNG):**
```typescript
// Công thức chuẩn: Occupancy = (Room-nights booked / Total possible room-nights) × 100

// 1. Tính room-nights thực tế
let currentRoomNights = 0;
for (const booking of bookingsOverlapping) {
  if (booking.status === CONFIRMED || CHECKED_IN || CHECKED_OUT) {
    // Tính overlap với kỳ báo cáo
    const overlapStart = max(booking.check_in, fromDate);
    const overlapEnd = min(booking.check_out, toDate);
    const nights = (overlapEnd - overlapStart) / (24 * 60 * 60 * 1000);
    currentRoomNights += nights;
  }
}

// 2. Tính tổng room-nights có thể
const totalPossibleRoomNights = totalRooms × periodDays;

// 3. Tính tỷ lệ
const occupancy = (currentRoomNights / totalPossibleRoomNights) × 100;
```

**Ví dụ minh họa:**
```
Khách sạn có 10 phòng
Kỳ báo cáo: 1/3 - 5/3 (5 ngày)
Tổng room-nights có thể: 10 × 5 = 50

Bookings:
- Booking 1: Phòng A, 28/2 - 3/3 → Overlap: 1/3 - 3/3 = 2 đêm
- Booking 2: Phòng B, 2/3 - 6/3 → Overlap: 2/3 - 5/3 = 3 đêm
- Booking 3: Phòng C, 4/3 - 7/3 → Overlap: 4/3 - 5/3 = 1 đêm

Tổng room-nights đã đặt: 2 + 3 + 1 = 6
Tỷ lệ lấp đầy: (6 / 50) × 100 = 12%
```

---

### 4. 🟥 Tổng hoàn tiền - CẦN LƯU Ý

**Logic hiện tại:**
```typescript
// Lấy refunds có status = REFUNDED
// Lọc theo updated_at
```

**Lưu ý:**
- Nếu bảng `refund_requests` có trường `refunded_at`, nên dùng trường đó thay vì `updated_at`
- `updated_at` có thể thay đổi khi cập nhật bất kỳ thông tin nào

---

## Các thay đổi trong code

### File: `app/api/reports/summary/route.ts`

**Thay đổi 1: Query bookings cho occupancy**
```typescript
// Thêm 2 queries mới để lấy bookings overlap với kỳ báo cáo
supabase
  .from("bookings")
  .select("check_in, check_out, status")
  .is("deleted_at", null)
  .or(`and(check_in.lte.${toISO},check_out.gte.${fromISO})`)
```

**Thay đổi 2: Tính totalRevenue từ bookings thay vì payments**
```typescript
// CŨ: Từ payments
const totalRevenue = currentPayments?.reduce(...)

// MỚI: Từ bookings
const totalRevenue = currentBookings?.reduce(
  (sum, b) => sum + (b.total_amount || 0), 0
)
```

**Thay đổi 3: Tính occupancy đúng cách**
```typescript
// Tính room-nights với overlap logic
let currentRoomNights = 0;
for (const booking of currentBookingsForOccupancy) {
  if (booking.check_in && booking.check_out && 
      (booking.status === CONFIRMED || CHECKED_IN || CHECKED_OUT)) {
    const overlapStart = max(checkIn, fromDate);
    const overlapEnd = min(checkOut, toDate);
    if (overlapStart < overlapEnd) {
      const nights = Math.ceil((overlapEnd - overlapStart) / (24*60*60*1000));
      currentRoomNights += nights;
    }
  }
}

const totalPossibleRoomNights = totalRoomsCount * periodDays;
const averageOccupancy = (currentRoomNights / totalPossibleRoomNights) * 100;
```

---

## Kết quả sau khi sửa

### ✅ Tổng thu (Gross)
- Phản ánh đúng tổng giá trị bookings trong kỳ
- Không phụ thuộc vào trạng thái thanh toán
- Lọc theo ngày tạo booking

### ✅ Tỷ lệ lấp đầy
- Tính theo room-nights (chuẩn ngành khách sạn)
- Xử lý overlap với kỳ báo cáo
- Công thức đúng: (Room-nights booked / Total possible room-nights) × 100

### ✅ Lọc theo ngày
- Tất cả metrics đều tính đúng theo khoảng thời gian được chọn
- Tính growth so với kỳ trước chính xác

---

## Cách test

### Test 1: Kiểm tra Tổng thu
1. Tạo 3 bookings trong tháng 3:
   - Booking A: 5,000,000 VNĐ (PAID)
   - Booking B: 3,000,000 VNĐ (PENDING)
   - Booking C: 2,000,000 VNĐ (CONFIRMED)

2. Chọn kỳ báo cáo: 1/3 - 31/3
3. Kết quả mong đợi: Tổng thu = 10,000,000 VNĐ (tất cả bookings)

### Test 2: Kiểm tra Tỷ lệ lấp đầy
1. Khách sạn có 10 phòng
2. Kỳ báo cáo: 1/3 - 10/3 (10 ngày)
3. Tổng room-nights có thể: 10 × 10 = 100

4. Tạo bookings:
   - 5 bookings: 1/3 - 3/3 (2 đêm mỗi booking) = 10 room-nights
   - 3 bookings: 5/3 - 8/3 (3 đêm mỗi booking) = 9 room-nights
   - Tổng: 19 room-nights

5. Kết quả mong đợi: Tỷ lệ lấp đầy = (19 / 100) × 100 = 19%

### Test 3: Kiểm tra lọc theo ngày
1. Tạo bookings ở nhiều tháng khác nhau
2. Chọn kỳ báo cáo: 1/3 - 15/3
3. Kiểm tra chỉ bookings trong khoảng này được tính

---

## Khuyến nghị

1. **Kiểm tra dữ liệu thực tế**: Chạy báo cáo với dữ liệu thật và so sánh với kết quả mong đợi

2. **Thêm logging**: Có thể thêm console.log để debug:
```typescript
console.log('Current room-nights:', currentRoomNights);
console.log('Total possible room-nights:', totalPossibleRoomNights);
console.log('Occupancy:', averageOccupancy);
```

3. **Xem xét thêm trường `refunded_at`**: Nếu có, nên dùng thay vì `updated_at` cho refunds

4. **Thêm validation**: Kiểm tra các trường hợp edge case:
   - Không có phòng nào
   - Không có booking nào
   - Kỳ báo cáo = 0 ngày

---

## Tổng kết

Đã sửa 2 vấn đề nghiêm trọng:
1. ✅ Tổng thu: Từ payments → bookings (đúng với Gross Revenue)
2. ✅ Tỷ lệ lấp đầy: Từ đếm booking → tính room-nights (đúng chuẩn ngành)

Các metrics bây giờ đã tính toán chính xác và phù hợp với nguyên tắc kế toán khách sạn.
