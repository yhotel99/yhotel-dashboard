# Pricing theo thứ (Weekday Rates)

Tính năng này cho phép **tăng giá theo từng ngày trong tuần** khi tính tổng tiền booking, dựa trên **giá phòng gốc** (`rooms.price_per_night`).

> **Quan trọng:** Giá trong DB **không bị thay đổi**. Hệ thống chỉ áp dụng phần trăm tăng giá khi *tính toán tổng tiền* (total/final) cho booking.

---

## Quy tắc mặc định

- **Thứ 6**: +15%
- **Thứ 7**: +20%
- **Chủ nhật → Thứ 5**: +0%

Nếu booking có nhiều đêm, hệ thống sẽ tính theo **từng ngày** trong khoảng \([check-in, check-out)\):

- Mỗi ngày lấy **giá gốc** \(basePrice) và cộng thêm theo % của ngày đó.
- Nếu trong booking có cả ngày thường và cuối tuần, tổng tiền sẽ tự động phản ánh đúng phần ngày cuối tuần được cộng %.

---

## Mapping index ngày trong tuần

Cấu hình `pricing_weekday_rates` dùng chung chuẩn với `Date.getDay()` của JavaScript:

| Index | Day | Rate (default) |
|------:|-----|----------------|
| 0 | Sunday | 0% |
| 1 | Monday | 0% |
| 2 | Tuesday | 0% |
| 3 | Wednesday | 0% |
| 4 | Thursday | 0% |
| 5 | Friday | 15% |
| 6 | Saturday | 20% |

Ví dụ default array:

```txt
[0, 0, 0, 0, 0, 15, 20]
```

---

## Cấu hình trong Settings

### Trường lưu trong DB

- **Table**: `settings` (singleton row)
- **Column**: `pricing_weekday_rates` (JSONB)
- **Default**: `[0,0,0,0,0,15,20]`

Migration:

- `supabase/migrations/20260317120000_add_pricing_weekday_rates_to_settings.sql`

### UI trong Settings

Trong `SettingsForm` có màn chỉnh 7 ngày và nút:

- **Đặt lại mặc định**: set về `[0,0,0,0,0,15,20]`
- **Thiết lập nhanh Lễ/Tết**: set 1 lần cho tất cả ngày lên:
  - +20%
  - +25%
  - +30%

> Đây là “set nhanh” trên cấu hình, không update giá phòng trong bảng `rooms`.

---

## Cách hệ thống tính tổng tiền

Logic tính nằm ở:

- `lib/pricing.ts`
  - `normalizeWeekdayRates(input)`
  - `calculateTotalWithWeekdayRates({ basePrice, checkInDate, checkOutDate, weekdayRates })`

Nguyên tắc:

- Input ngày dùng format **YYYY-MM-DD**
- Vòng lặp theo ngày: từ check-in đến trước check-out
- Mỗi ngày:
  - `weekday = date.getDay()`
  - `percent = weekdayRates[weekday]`
  - `dailyPrice = basePrice + basePrice * percent / 100`
- Tổng = sum(dailyPrice)

---

## Nơi áp dụng trong luồng booking

Hiện tại hệ thống áp dụng khi tính tổng tiền cho các UI tạo booking:

- **Đặt nhanh**: `components/rooms/quick-booking-dialog.tsx`
- **Tạo booking 1 phòng**: `components/bookings/create-booking-dialog.tsx`
- **Tạo booking nhiều phòng**: `components/bookings/create-multi-booking-dialog.tsx`

Các màn này đọc cấu hình từ Settings qua:

- `hooks/use-settings.ts` → GET `/api/settings`

---

## Ghi chú kỹ thuật

- `pricing_weekday_rates` là **% tăng giá** (0–100) áp dụng lên **giá gốc**.
- DB giữ nguyên `rooms.price_per_night`; booking có thể lưu `total_amount/final_amount` theo giá đã tính.
- Nếu Settings không có cấu hình hợp lệ, hệ thống fallback về default `[0,0,0,0,0,15,20]`.

