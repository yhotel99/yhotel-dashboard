# Công thức tính các Card Thống kê Dashboard

## 📊 Tổng quan

Dashboard có 4 card chính:
1. 🟩 Tổng thu (Gross Revenue)
2. 🟥 Tổng hoàn tiền (Refund)
3. 📦 Tổng đặt phòng (Total Bookings)
4. 📈 Tỷ lệ lấp đầy (Occupancy Rate)

---

## 1. 🟩 Tổng thu (Gross Revenue)

### Công thức:
```
Tổng thu = Σ (total_amount của tất cả bookings trong kỳ)
```

### Chi tiết:
- **Nguồn dữ liệu**: Bảng `bookings`
- **Điều kiện lọc**:
  - `deleted_at IS NULL` (không bị xóa)
  - `created_at >= fromDate AND created_at <= toDate` (trong kỳ báo cáo)
- **Trường tính**: `total_amount`
- **Không phân biệt**: Trạng thái thanh toán (PAID, PENDING, CONFIRMED...)

### Code:
```typescript
const totalRevenue = currentBookings?.reduce(
  (sum, booking) => {
    const amount = typeof booking.total_amount === "string" 
      ? parseFloat(booking.total_amount) 
      : (booking.total_amount || 0);
    return sum + (isNaN(amount) ? 0 : amount);
  },
  0
) || 0;
```

### Ví dụ:
```
Kỳ báo cáo: 1/3/2026 - 31/3/2026

Bookings trong tháng 3:
- Booking #1: 5,000,000 VNĐ (PAID)
- Booking #2: 3,000,000 VNĐ (PENDING)
- Booking #3: 2,000,000 VNĐ (CONFIRMED)
- Booking #4: 1,500,000 VNĐ (CANCELLED) ← Vẫn tính

Tổng thu = 5,000,000 + 3,000,000 + 2,000,000 + 1,500,000 = 11,500,000 VNĐ
```

### Tăng trưởng:
```
Growth % = ((Tổng thu kỳ này - Tổng thu kỳ trước) / Tổng thu kỳ trước) × 100
```

---

## 2. 🟥 Tổng hoàn tiền (Total Refunded)

### Công thức:
```
Tổng hoàn tiền = Σ (amount của tất cả refund_requests đã hoàn tiền)
```

### Chi tiết:
- **Nguồn dữ liệu**: Bảng `refund_requests`
- **Điều kiện lọc**:
  - `status = 'refunded'` (đã hoàn tiền)
  - `updated_at >= fromDate AND updated_at <= toDate` (trong kỳ báo cáo)
- **Trường tính**: `amount`

### Code:
```typescript
const totalRefunded = currentRefunds?.reduce(
  (sum, refund) => {
    const amount = typeof refund.amount === "string" 
      ? parseFloat(refund.amount) 
      : (refund.amount || 0);
    return sum + (isNaN(amount) ? 0 : amount);
  },
  0
) || 0;
```

### Ví dụ:
```
Kỳ báo cáo: 1/3/2026 - 31/3/2026

Refunds trong tháng 3:
- Refund #1: 1,000,000 VNĐ (REFUNDED)
- Refund #2: 500,000 VNĐ (REFUNDED)
- Refund #3: 2,000,000 VNĐ (PENDING) ← Không tính

Tổng hoàn tiền = 1,000,000 + 500,000 = 1,500,000 VNĐ
```

### Tăng trưởng:
```
Growth % = ((Tổng hoàn tiền kỳ này - Tổng hoàn tiền kỳ trước) / Tổng hoàn tiền kỳ trước) × 100

Lưu ý: Tăng trưởng âm là tốt (ít hoàn tiền hơn)
```

---

## 3. 📦 Tổng đặt phòng (Total Bookings)

### Công thức:
```
Tổng đặt phòng = COUNT(bookings trong kỳ)
```

### Chi tiết:
- **Nguồn dữ liệu**: Bảng `bookings`
- **Điều kiện lọc**:
  - `deleted_at IS NULL` (không bị xóa)
  - `created_at >= fromDate AND created_at <= toDate` (trong kỳ báo cáo)
- **Đếm**: Số lượng records

### Code:
```typescript
const totalBookings = currentBookings?.length || 0;
```

### Ví dụ:
```
Kỳ báo cáo: 1/3/2026 - 31/3/2026

Bookings được tạo trong tháng 3:
- 15 bookings từ Booking.com
- 10 bookings từ Agoda
- 8 bookings từ Website
- 5 bookings vãng lai

Tổng đặt phòng = 15 + 10 + 8 + 5 = 38 bookings
```

### Tăng trưởng:
```
Growth % = ((Tổng booking kỳ này - Tổng booking kỳ trước) / Tổng booking kỳ trước) × 100
```

---

## 4. 📈 Tỷ lệ lấp đầy (Occupancy Rate)

### Công thức chuẩn ngành khách sạn:
```
Tỷ lệ lấp đầy = (Tổng room-nights đã đặt / Tổng room-nights có thể) × 100

Trong đó:
- Room-nights đã đặt = Σ (số đêm của mỗi booking overlap với kỳ báo cáo)
- Room-nights có thể = Tổng số phòng × Số ngày trong kỳ
```

### Chi tiết:

#### Bước 1: Tính tổng room-nights có thể
```typescript
const periodDays = Math.ceil(
  (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
);

const totalRoomsCount = totalRooms?.length || 1;

const totalPossibleRoomNights = totalRoomsCount × periodDays;
```

#### Bước 2: Tính room-nights đã đặt
```typescript
let currentRoomNights = 0;

for (const booking of bookingsOverlapping) {
  // Chỉ tính bookings có status hợp lệ
  if (booking.status === 'confirmed' || 
      booking.status === 'checked_in' || 
      booking.status === 'checked_out') {
    
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    
    // Tính phần overlap với kỳ báo cáo
    const overlapStart = checkIn > fromDate ? checkIn : fromDate;
    const overlapEnd = checkOut < toDate ? checkOut : toDate;
    
    if (overlapStart < overlapEnd) {
      const nights = Math.ceil(
        (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      currentRoomNights += nights;
    }
  }
}
```

#### Bước 3: Tính tỷ lệ
```typescript
const occupancyRate = totalPossibleRoomNights > 0 
  ? (currentRoomNights / totalPossibleRoomNights) × 100 
  : 0;

// Làm tròn 2 chữ số thập phân
const occupancy = Math.round(occupancyRate * 100) / 100;
```

### Ví dụ chi tiết:

#### Ví dụ 1: Booking nằm hoàn toàn trong kỳ
```
Khách sạn: 10 phòng
Kỳ báo cáo: 1/3 - 10/3 (10 ngày)
Tổng room-nights có thể: 10 × 10 = 100

Booking #1:
- Check-in: 3/3
- Check-out: 7/3
- Overlap: 3/3 - 7/3 = 4 đêm
- Room-nights: 4

Tỷ lệ lấp đầy = (4 / 100) × 100 = 4.00%
```

#### Ví dụ 2: Booking overlap một phần
```
Khách sạn: 10 phòng
Kỳ báo cáo: 1/3 - 10/3 (10 ngày)
Tổng room-nights có thể: 10 × 10 = 100

Booking #1:
- Check-in: 28/2 (trước kỳ)
- Check-out: 5/3
- Overlap: 1/3 - 5/3 = 4 đêm
- Room-nights: 4

Booking #2:
- Check-in: 8/3
- Check-out: 15/3 (sau kỳ)
- Overlap: 8/3 - 10/3 = 2 đêm
- Room-nights: 2

Tổng room-nights: 4 + 2 = 6
Tỷ lệ lấp đầy = (6 / 100) × 100 = 6.00%
```

#### Ví dụ 3: Nhiều bookings
```
Khách sạn: 10 phòng
Kỳ báo cáo: 1/3 - 10/3 (10 ngày)
Tổng room-nights có thể: 10 × 10 = 100

Bookings:
- 5 bookings: 1/3 - 3/3 (2 đêm mỗi booking) = 10 room-nights
- 3 bookings: 5/3 - 8/3 (3 đêm mỗi booking) = 9 room-nights
- 2 bookings: 2/3 - 10/3 (8 đêm mỗi booking) = 16 room-nights

Tổng room-nights: 10 + 9 + 16 = 35
Tỷ lệ lấp đầy = (35 / 100) × 100 = 35.00%
```

### Điều kiện lọc bookings:
- **Nguồn dữ liệu**: Bảng `bookings`
- **Điều kiện**:
  - `deleted_at IS NULL`
  - `check_in <= toDate AND check_out >= fromDate` (overlap với kỳ)
  - `status IN ('confirmed', 'checked_in', 'checked_out')` (trạng thái hợp lệ)

### Tăng trưởng:
```
Growth % = ((Tỷ lệ lấp đầy kỳ này - Tỷ lệ lấp đầy kỳ trước) / Tỷ lệ lấp đầy kỳ trước) × 100
```

---

## 📊 Tính toán kỳ trước (Previous Period)

Để tính tăng trưởng, cần tính các chỉ số cho kỳ trước:

### Công thức xác định kỳ trước:
```typescript
// Tính số ngày của kỳ hiện tại
const periodDays = Math.ceil(
  (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
);

// Kỳ trước = lùi lại số ngày tương đương
const prevFromDate = new Date(fromDate);
prevFromDate.setDate(prevFromDate.getDate() - periodDays);

const prevToDate = new Date(fromDate);
```

### Ví dụ:
```
Kỳ hiện tại: 1/3/2026 - 31/3/2026 (31 ngày)

Kỳ trước:
- prevFromDate = 1/3 - 31 ngày = 29/1/2026
- prevToDate = 1/3/2026

Kỳ trước: 29/1/2026 - 1/3/2026 (31 ngày)
```

---

## 🎯 Công thức tăng trưởng (Growth Rate)

### Công thức chung:
```
Growth % = ((Giá trị kỳ này - Giá trị kỳ trước) / Giá trị kỳ trước) × 100
```

### Làm tròn:
```typescript
const growth = Math.round(growthRate * 100) / 100; // 2 chữ số thập phân
```

### Xử lý trường hợp đặc biệt:
```typescript
// Nếu kỳ trước = 0, không tính được growth
const growth = prevValue > 0 
  ? ((currentValue - prevValue) / prevValue) × 100 
  : 0;

// Nếu kết quả là NaN hoặc Infinity
const finalGrowth = isNaN(growth) || !isFinite(growth) ? 0 : growth;
```

### Ví dụ:
```
Tổng thu kỳ này: 10,000,000 VNĐ
Tổng thu kỳ trước: 8,000,000 VNĐ

Growth = ((10,000,000 - 8,000,000) / 8,000,000) × 100
       = (2,000,000 / 8,000,000) × 100
       = 0.25 × 100
       = 25.00%
```

---

## 📝 Tóm tắt công thức

| Card | Công thức | Nguồn dữ liệu | Điều kiện |
|------|-----------|---------------|-----------|
| **Tổng thu** | `Σ booking.total_amount` | `bookings` | `created_at` trong kỳ |
| **Tổng hoàn tiền** | `Σ refund.amount` | `refund_requests` | `status = 'refunded'`, `updated_at` trong kỳ |
| **Tổng đặt phòng** | `COUNT(bookings)` | `bookings` | `created_at` trong kỳ |
| **Tỷ lệ lấp đầy** | `(room-nights / possible-nights) × 100` | `bookings` + `rooms` | Overlap với kỳ, status hợp lệ |

---

## ⚠️ Lưu ý quan trọng

1. **Tổng thu (Gross)**: 
   - Tính TẤT CẢ bookings, không phân biệt đã thanh toán hay chưa
   - Đây là doanh thu gộp (Gross Revenue)

2. **Tỷ lệ lấp đầy**:
   - Phải tính overlap với kỳ báo cáo
   - Chỉ tính bookings có status hợp lệ (confirmed, checked_in, checked_out)
   - Đơn vị tính: room-nights (phòng × đêm)

3. **Làm tròn**:
   - Tất cả % làm tròn 2 chữ số thập phân
   - Sử dụng `Math.round(value * 100) / 100`

4. **Xử lý null/undefined**:
   - Luôn có giá trị mặc định (|| 0)
   - Kiểm tra NaN trước khi tính toán

5. **Múi giờ**:
   - Sử dụng ISO string cho tất cả date comparisons
   - Đảm bảo consistency giữa client và server
