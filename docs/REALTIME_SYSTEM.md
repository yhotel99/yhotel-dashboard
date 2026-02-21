# 🔥 Hệ thống Realtime Booking

## 📋 Tổng quan

Hệ thống realtime được thiết kế theo kiến trúc chuyên nghiệp với:
- ✅ Mini panel thông báo ở góc màn hình
- ✅ Badge đếm số booking mới trên sidebar
- ✅ Tự động reset khi user vào trang bookings
- ✅ Không cần lưu DB, chỉ dùng state global

## 🏗 Kiến trúc

```
app/layout.tsx
  ↓
<RealtimeProvider>
  ↓
  ├─ <RealtimeContextProvider> (State global)
  ├─ <RealtimeListener> (Lắng nghe Supabase)
  ├─ <NewBookingPanel> (Mini panel)
  └─ children (App content)
```

## 📁 Cấu trúc Files

### 1. Context - State Management
**File:** `contexts/realtime-context.tsx`
- Quản lý state global cho realtime
- `newBookingsCount`: Số booking mới
- `hasNewBooking`: Boolean check có booking mới không
- `latestBookingCode`: Mã booking mới nhất
- `incrementBookingCount()`: Tăng count khi có booking mới
- `resetBookingCount()`: Reset về 0 khi user vào trang bookings

### 2. Hook - Supabase Realtime
**File:** `hooks/use-bookings-realtime.ts`
- Lắng nghe INSERT events từ bảng `bookings`
- Tự động gọi `incrementBookingCount()` khi có booking mới
- Subscribe/unsubscribe channel tự động

### 3. Provider - Wrapper Global
**File:** `components/realtime-provider.tsx`
- Wrap toàn bộ app ở `app/layout.tsx`
- Kết hợp Context + Hook + Panel
- Áp dụng cho mọi page

### 4. Panel - UI Notification
**File:** `components/new-booking-panel.tsx`
- Mini panel hiển thị ở góc dưới bên phải
- Tự động hiện khi có booking mới
- Tự động ẩn sau 10 giây
- Có nút "Xem ngay" để chuyển đến trang bookings
- Có nút đóng (X)

### 5. Badge - Sidebar Indicator
**File:** `components/nav-main.tsx`
- Badge đỏ hiển thị số booking mới
- Chỉ hiện trên menu "Đơn Đặt Phòng"
- Hiển thị "9+" nếu > 9 bookings

### 6. Auto Reset - Bookings Page
**File:** `components/bookings/bookings-content.tsx`
- Tự động reset count về 0 khi user vào trang
- Dùng `useEffect` với `resetBookingCount()`

## 🎯 Cách hoạt động

### Khi có booking mới được tạo:

1. **Supabase Realtime** phát sự kiện INSERT
2. **Hook** (`use-bookings-realtime.ts`) nhận event
3. **Context** cập nhật state:
   - `newBookingsCount++`
   - `latestBookingCode = "BK001"`
4. **UI tự động update**:
   - Panel hiện ở góc màn hình
   - Badge hiện trên sidebar menu

### Khi user click "Xem ngay" hoặc vào trang bookings:

1. **Panel** gọi `resetBookingCount()`
2. **Context** reset state về 0
3. **UI tự động update**:
   - Panel ẩn đi
   - Badge biến mất

## 🧪 Test thử

### Test 1: Realtime notification
1. Mở 2 tab/browser khác nhau
2. Tab 1: Vào trang bookings
3. Tab 2: Tạo booking mới
4. ✅ Tab 1 sẽ thấy panel + badge ngay lập tức

### Test 2: Badge counter
1. Tạo 3 bookings liên tiếp
2. ✅ Badge sẽ hiển thị số "3"
3. Click vào menu "Đơn Đặt Phòng"
4. ✅ Badge biến mất (reset về 0)

### Test 3: Panel auto-hide
1. Tạo 1 booking mới
2. ✅ Panel hiện ra
3. Đợi 10 giây
4. ✅ Panel tự động ẩn

## 🎨 Customization

### Thay đổi thời gian auto-hide panel
```tsx
// components/new-booking-panel.tsx
const timer = setTimeout(() => {
  setIsVisible(false);
}, 10000); // Đổi thành 5000 cho 5 giây
```

### Thay đổi vị trí panel
```tsx
// components/new-booking-panel.tsx
className="fixed bottom-6 right-6" // Đổi thành top-6 left-6
```

### Thay đổi màu badge
```tsx
// components/nav-main.tsx
<Badge variant="destructive"> // Đổi thành "default" hoặc "secondary"
```

## 🔧 Troubleshooting

### Panel không hiện?
- Kiểm tra Supabase Realtime đã enable chưa
- Check console log: "🎉 Booking mới được tạo:"
- Verify `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Badge không cập nhật?
- Đảm bảo `RealtimeProvider` wrap đúng vị trí trong layout
- Check `useRealtimeContext()` có throw error không

### Count không reset?
- Verify `resetBookingCount()` được gọi trong `useEffect`
- Check dependencies array của `useEffect`

## 📚 Dependencies

- `@supabase/ssr`: Supabase client
- `sonner`: Toast notifications (không dùng trong version này)
- `@tabler/icons-react`: Icons
- `tailwindcss`: Styling

## 🚀 Future Enhancements

- [ ] Thêm sound notification
- [ ] Lưu count vào localStorage để persist qua refresh
- [ ] Thêm filter theo loại booking (pending, confirmed, etc.)
- [ ] Realtime cho UPDATE và DELETE events
- [ ] Animation nâng cao cho panel
