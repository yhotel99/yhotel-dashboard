# Tài Liệu Tích Hợp Voucher - Hệ Thống Đặt Phòng

## Tổng Quan

Tài liệu này hướng dẫn cách tích hợp hệ thống voucher vào website đặt phòng. Hệ thống voucher cho phép khách hàng nhập mã giảm giá khi đặt phòng để được giảm giá theo phần trăm hoặc số tiền cố định.

## Mục Lục

1. [Cấu Trúc Dữ Liệu](#cấu-trúc-dữ-liệu)
2. [API Endpoints](#api-endpoints)
3. [Quy Trình Tích Hợp](#quy-trình-tích-hợp)
4. [Ví Dụ Code](#ví-dụ-code)
5. [Xử Lý Lỗi](#xử-lý-lỗi)

---

## Cấu Trúc Dữ Liệu

### Voucher Object

```typescript
{
  id: string;                    // ID duy nhất của voucher
  code: string;                  // Mã voucher (VD: "SUMMER2024")
  name: string;                  // Tên voucher
  description: string | null;    // Mô tả voucher
  discount_type: "percent" | "fixed";  // Loại giảm giá
  discount_value: number;        // Giá trị giảm (% hoặc số tiền)
  start_at: string | null;       // Thời gian bắt đầu (ISO 8601)
  end_at: string | null;         // Thời gian kết thúc (ISO 8601)
  is_active: boolean;            // Trạng thái kích hoạt
  created_at: string;            // Ngày tạo
  updated_at: string;            // Ngày cập nhật
}
```

### Booking với Voucher

Khi tạo booking có áp dụng voucher, cần truyền các trường sau:

```typescript
{
  customer_id: string;           // ID khách hàng
  room_id: string;               // ID phòng
  check_in: string;              // Ngày check-in (YYYY-MM-DD)
  check_out: string;             // Ngày check-out (YYYY-MM-DD)
  total_guests: number;          // Số khách
  total_amount: number;          // Tổng tiền trước giảm giá
  voucher_code: string;          // Mã voucher (tùy chọn)
  advance_payment: number;       // Tiền đặt cọc
  payment_method: string;        // Phương thức thanh toán
  notes: string | null;          // Ghi chú
}
```

---

## API Endpoints

### 1. Lấy Danh Sách Voucher

**Endpoint:** `GET /api/vouchers`

**Query Parameters:**
- `search` (optional): Tìm kiếm theo mã hoặc tên voucher
- `page` (optional, default: 1): Số trang
- `limit` (optional, default: 10): Số lượng voucher mỗi trang

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "SUMMER2024",
      "name": "Giảm giá mùa hè",
      "description": "Giảm 20% cho đơn hàng trên 1 triệu",
      "discount_type": "percent",
      "discount_value": 20,
      "start_at": "2024-06-01T00:00:00Z",
      "end_at": "2024-08-31T23:59:59Z",
      "is_active": true,
      "created_at": "2024-05-01T10:00:00Z",
      "updated_at": "2024-05-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### 2. Lấy Chi Tiết Voucher

**Endpoint:** `GET /api/vouchers/:id`

**Response:**
```json
{
  "id": "uuid",
  "code": "SUMMER2024",
  "name": "Giảm giá mùa hè",
  "discount_type": "percent",
  "discount_value": 20,
  "is_active": true,
  ...
}
```

### 3. Kiểm Tra và Áp Dụng Voucher

**Chức năng:** Validate voucher và tính toán số tiền giảm giá

**Server Action:** `validateVoucherForBooking`

**Input:**
```typescript
{
  code: string;          // Mã voucher
  totalAmount: number;   // Tổng tiền booking
}
```

**Response Success:**
```typescript
{
  ok: true,
  data: {
    voucher: Voucher,      // Thông tin voucher
    discount: number,      // Số tiền được giảm
    finalAmount: number    // Số tiền sau giảm giá
  }
}
```

**Response Error:**
```typescript
{
  ok: false,
  message: string  // Thông báo lỗi
}
```

**Các trường hợp lỗi:**
- "Vui lòng nhập mã voucher" - Mã voucher trống
- "Voucher không tồn tại hoặc đã bị tắt" - Voucher không hợp lệ
- "Voucher chưa đến thời gian hiệu lực" - Chưa đến ngày bắt đầu
- "Voucher đã hết hạn" - Đã quá ngày kết thúc

### 4. Tạo Booking với Voucher

**Endpoint:** Sử dụng API tạo booking hiện có

**Server Action:** `createBooking`

**Input:**
```typescript
{
  customer_id: string,
  room_id: string,
  check_in: string,
  check_out: string,
  total_guests: number,
  total_amount: number,
  voucher_code: string,      // Truyền mã voucher vào đây
  advance_payment: number,
  payment_method: string,
  notes: string | null
}
```

**Lưu ý:** Backend sẽ tự động:
1. Validate voucher
2. Tính toán `final_amount` (số tiền sau giảm giá)
3. Lưu thông tin voucher vào booking (`voucher_id`, `voucher_code`, `voucher_discount`)

---

## Quy Trình Tích Hợp

### Bước 1: Hiển Thị Form Nhập Voucher

Trong trang đặt phòng, thêm một input để khách hàng nhập mã voucher:

```jsx
<div className="voucher-section">
  <label>Mã giảm giá (tùy chọn)</label>
  <input 
    type="text" 
    placeholder="Nhập mã voucher"
    value={voucherCode}
    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
  />
  <button onClick={handleApplyVoucher}>Áp dụng</button>
</div>
```

### Bước 2: Validate Voucher

Khi khách hàng nhập mã và nhấn "Áp dụng", gọi API để validate:

```typescript
async function handleApplyVoucher() {
  if (!voucherCode.trim()) {
    alert("Vui lòng nhập mã voucher");
    return;
  }

  const result = await validateVoucherForBooking({
    code: voucherCode,
    totalAmount: totalAmount
  });

  if (result.ok) {
    // Hiển thị thông tin giảm giá
    setDiscount(result.data.discount);
    setFinalAmount(result.data.finalAmount);
    setVoucherApplied(true);
    alert(`Áp dụng voucher thành công! Giảm ${formatCurrency(result.data.discount)}`);
  } else {
    // Hiển thị lỗi
    alert(result.message);
    setVoucherApplied(false);
  }
}
```

### Bước 3: Hiển Thị Thông Tin Giảm Giá

Sau khi áp dụng voucher thành công, hiển thị chi tiết:

```jsx
<div className="price-summary">
  <div className="price-row">
    <span>Tổng tiền phòng:</span>
    <span>{formatCurrency(totalAmount)}</span>
  </div>
  
  {voucherApplied && (
    <div className="price-row discount">
      <span>Giảm giá ({voucherCode}):</span>
      <span>-{formatCurrency(discount)}</span>
    </div>
  )}
  
  <div className="price-row total">
    <span>Tổng thanh toán:</span>
    <span>{formatCurrency(finalAmount)}</span>
  </div>
</div>
```

### Bước 4: Gửi Booking với Voucher

Khi khách hàng xác nhận đặt phòng, truyền mã voucher vào request:

```typescript
async function handleBooking() {
  const bookingData = {
    customer_id: customerId,
    room_id: roomId,
    check_in: checkInDate,
    check_out: checkOutDate,
    total_guests: guestCount,
    total_amount: totalAmount,
    voucher_code: voucherApplied ? voucherCode : null,  // Chỉ gửi nếu đã validate
    advance_payment: advancePayment,
    payment_method: paymentMethod,
    notes: notes
  };

  const result = await createBooking(bookingData);
  
  if (result.ok) {
    // Chuyển đến trang xác nhận
    router.push(`/booking-confirmation/${result.data.bookingId}`);
  } else {
    alert(result.message);
  }
}
```

---

## Ví Dụ Code

### React Component Hoàn Chỉnh

```typescript
import { useState, useEffect } from 'react';

export function BookingForm() {
  const [totalAmount, setTotalAmount] = useState(0);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherApplied, setVoucherApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Tính tổng tiền dựa trên số đêm và giá phòng
  useEffect(() => {
    const nights = calculateNights(checkIn, checkOut);
    const total = nights * roomPrice;
    setTotalAmount(total);
    setFinalAmount(total);
  }, [checkIn, checkOut, roomPrice]);

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      alert("Vui lòng nhập mã voucher");
      return;
    }

    setLoading(true);
    try {
      const result = await validateVoucherForBooking({
        code: voucherCode,
        totalAmount: totalAmount
      });

      if (result.ok) {
        setDiscount(result.data.discount);
        setFinalAmount(result.data.finalAmount);
        setVoucherApplied(true);
        alert(`Áp dụng voucher thành công! Giảm ${formatCurrency(result.data.discount)}`);
      } else {
        alert(result.message);
        setVoucherApplied(false);
        setDiscount(0);
        setFinalAmount(totalAmount);
      }
    } catch (error) {
      alert("Có lỗi xảy ra khi kiểm tra voucher");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherCode('');
    setVoucherApplied(false);
    setDiscount(0);
    setFinalAmount(totalAmount);
  };

  const handleSubmitBooking = async () => {
    const bookingData = {
      customer_id: customerId,
      room_id: roomId,
      check_in: checkIn,
      check_out: checkOut,
      total_guests: guestCount,
      total_amount: totalAmount,
      voucher_code: voucherApplied ? voucherCode : null,
      advance_payment: advancePayment,
      payment_method: paymentMethod,
      notes: notes
    };

    const result = await createBooking(bookingData);
    
    if (result.ok) {
      router.push(`/booking-confirmation/${result.data.bookingId}`);
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="booking-form">
      {/* Form fields cho customer, room, dates, etc. */}
      
      {/* Voucher Section */}
      <div className="voucher-section">
        <label>Mã giảm giá</label>
        <div className="voucher-input-group">
          <input 
            type="text" 
            placeholder="Nhập mã voucher"
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
            disabled={voucherApplied}
          />
          {!voucherApplied ? (
            <button 
              onClick={handleApplyVoucher}
              disabled={loading || !voucherCode.trim()}
            >
              {loading ? 'Đang kiểm tra...' : 'Áp dụng'}
            </button>
          ) : (
            <button onClick={handleRemoveVoucher}>
              Xóa
            </button>
          )}
        </div>
        {voucherApplied && (
          <p className="voucher-success">
            ✓ Voucher đã được áp dụng
          </p>
        )}
      </div>

      {/* Price Summary */}
      <div className="price-summary">
        <div className="price-row">
          <span>Tổng tiền phòng:</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
        
        {voucherApplied && discount > 0 && (
          <div className="price-row discount">
            <span>Giảm giá ({voucherCode}):</span>
            <span className="text-green">-{formatCurrency(discount)}</span>
          </div>
        )}
        
        <div className="price-row total">
          <span>Tổng thanh toán:</span>
          <span className="font-bold">{formatCurrency(finalAmount)}</span>
        </div>
      </div>

      <button onClick={handleSubmitBooking}>
        Xác nhận đặt phòng
      </button>
    </div>
  );
}
```

### Utility Functions

```typescript
// Format tiền tệ
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

// Tính số đêm
function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
```

---

## Xử Lý Lỗi

### Các Lỗi Thường Gặp

1. **Voucher không tồn tại**
   - Message: "Voucher không tồn tại hoặc đã bị tắt"
   - Xử lý: Hiển thị thông báo và cho phép nhập lại

2. **Voucher chưa có hiệu lực**
   - Message: "Voucher chưa đến thời gian hiệu lực"
   - Xử lý: Hiển thị ngày bắt đầu hiệu lực nếu có

3. **Voucher đã hết hạn**
   - Message: "Voucher đã hết hạn"
   - Xử lý: Hiển thị thông báo và gợi ý voucher khác

4. **Mã voucher trùng lặp khi tạo**
   - Message: "Mã voucher đã tồn tại trong hệ thống"
   - Xử lý: Chỉ áp dụng cho admin dashboard

### Best Practices

1. **Validate phía client trước**
   - Kiểm tra mã voucher không rỗng
   - Kiểm tra định dạng nếu có quy tắc

2. **Debounce khi gọi API**
   - Tránh gọi API quá nhiều lần khi user đang nhập

3. **Cache voucher đã validate**
   - Lưu kết quả validate để tránh gọi lại khi user quay lại form

4. **Clear voucher khi thay đổi booking**
   - Nếu user thay đổi phòng hoặc ngày, cần validate lại voucher

5. **Hiển thị loading state**
   - Disable button và hiển thị loading khi đang validate

6. **Xử lý timeout**
   - Set timeout cho API call và hiển thị lỗi nếu quá lâu

---

## Tính Năng Nâng Cao (Tùy Chọn)

### 1. Hiển Thị Danh Sách Voucher Khả Dụng

```typescript
async function getAvailableVouchers() {
  const response = await fetch('/api/vouchers?limit=100');
  const data = await response.json();
  
  // Lọc voucher còn hiệu lực
  const now = new Date();
  const available = data.data.filter(v => {
    if (!v.is_active) return false;
    if (v.start_at && new Date(v.start_at) > now) return false;
    if (v.end_at && new Date(v.end_at) < now) return false;
    return true;
  });
  
  return available;
}
```

### 2. Auto-apply Best Voucher

```typescript
async function findBestVoucher(totalAmount: number) {
  const vouchers = await getAvailableVouchers();
  let bestVoucher = null;
  let maxDiscount = 0;

  for (const voucher of vouchers) {
    const result = await validateVoucherForBooking({
      code: voucher.code,
      totalAmount
    });

    if (result.ok && result.data.discount > maxDiscount) {
      maxDiscount = result.data.discount;
      bestVoucher = voucher;
    }
  }

  return bestVoucher;
}
```

### 3. Voucher Suggestions

Hiển thị gợi ý voucher dựa trên:
- Tổng tiền booking
- Loại phòng
- Thời gian đặt
- Khách hàng thân thiết

---

## Kiểm Thử

### Test Cases

1. **Áp dụng voucher hợp lệ (percent)**
   - Input: code="SUMMER20", totalAmount=1000000
   - Expected: discount=200000, finalAmount=800000

2. **Áp dụng voucher hợp lệ (fixed)**
   - Input: code="SAVE100K", totalAmount=1000000
   - Expected: discount=100000, finalAmount=900000

3. **Voucher không tồn tại**
   - Input: code="INVALID"
   - Expected: Error message

4. **Voucher đã hết hạn**
   - Input: code expired voucher
   - Expected: Error message

5. **Tạo booking với voucher**
   - Input: booking data + valid voucher code
   - Expected: Booking created with voucher info saved

---

## Liên Hệ & Hỗ Trợ

Nếu có vấn đề trong quá trình tích hợp, vui lòng liên hệ team phát triển để được hỗ trợ.

**Lưu ý:** Tài liệu này được tạo dựa trên cấu trúc hiện tại của hệ thống. Vui lòng cập nhật nếu có thay đổi về API hoặc logic xử lý.
