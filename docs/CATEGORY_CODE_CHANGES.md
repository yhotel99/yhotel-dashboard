# Tóm tắt thay đổi khi thêm category_code vào rooms

## ✅ Đã hoàn thành

### 1. Database Schema
- ✅ Migration thêm cột `category_code` vào bảng `rooms`
- ✅ Tạo index cho `category_code`
- ✅ Update data hiện tại với mapping 6 loại phòng
- File: `supabase/migrations/20260224000000_add_room_category_code.sql`

### 2. Database Functions & Views
- ✅ Update RPC `get_available_rooms` để include `category_code`
- File: `supabase/migrations/20260224000001_update_get_available_rooms_add_category.sql`

- ✅ Update view `room_status_view` để include `category_code`
- File: `supabase/migrations/20260224000002_update_room_status_view_add_category.sql`

### 3. TypeScript Types
- ✅ Thêm `category_code` vào type `Room`
- ✅ Thêm `category_code` vào type `RoomInput`
- ✅ Thêm `category_code` vào type `RoomFromRPC`
- ✅ Thêm `category_code` vào type `RoomStatusViewData`
- File: `lib/types.ts`

### 4. Constants
- ✅ Thêm `ROOM_CATEGORY_CODE` với 6 loại phòng
- ✅ Thêm `roomCategoryCodeLabels` mapping
- File: `lib/constants.ts`

### 5. Components - Forms
- ✅ Thêm field `category_code` vào `RoomForm` (create/edit)
- ✅ Thêm vào schema validation
- ✅ Thêm vào defaultValues
- File: `components/room-form.tsx`

- ✅ Thêm `category_code` vào defaultValues trong edit page
- File: `app/dashboard/rooms/edit/[id]/page.tsx`

### 6. Components - Display
- ✅ Hiển thị category trong `RoomDetailDialog`
- File: `components/rooms/room-detail-dialog.tsx`

### 7. Actions
- ✅ Update `getAvailableRoomsAction` để map `category_code`
- ✅ `createRoom` và `updateRoom` đã tự động xử lý qua `RoomInput` type
- File: `actions/rooms.ts`

## 📋 Các component KHÔNG cần thay đổi

### Components chỉ hiển thị thông tin cơ bản
- ❌ `components/rooms/room-card.tsx` - Chỉ hiển thị name, type, price
- ❌ `components/rooms/quick-booking-dialog.tsx` - Chỉ cần room_id và price
- ❌ `components/rooms/checkout-dialog.tsx` - Chỉ hiển thị thông tin booking
- ❌ `components/rooms/update-room-status-dialog.tsx` - Chỉ update status
- ❌ `components/bookings/*` - Các dialog booking chỉ cần room_id

### RPC Functions không cần thay đổi
- ❌ `create_booking_secure` - Chỉ nhận room_id
- ❌ `create_multi_booking_secure` - Chỉ nhận room_id
- ❌ `search_payments` - Chỉ lấy room name
- ❌ `search_bookings` - Không trả về room details

## 🚀 Cách áp dụng

```bash
# Chạy migrations
supabase db push

# Hoặc nếu đang dev local
supabase migration up
```

## 📊 Mapping Category Codes

| Category Code | Label (Tiếng Việt) |
|--------------|-------------------|
| URBAN_COMPACT_QUEEN | Urban Compact Queen |
| URBAN_COMPACT_TWIN | Urban Compact Twin Single |
| URBAN_BALCONY_QUEEN | Urban Balcony Queen |
| DELUXE_BALCONY_QUEEN | Deluxe Balcony Queen |
| PREMIUM_CITY_VIEW | Premium City View Queen |
| EXEC_BALCONY_SUITE | Executive Balcony Suite |

## ✨ Tính năng mới

1. Khi tạo/edit phòng: Có dropdown chọn phân loại phòng
2. Trong chi tiết phòng: Hiển thị phân loại
3. Trong dialog đặt phòng: Category_code được fetch cùng room data
4. Data được lưu dưới dạng code (VD: "URBAN_COMPACT_QUEEN")
5. Hiển thị dưới dạng label (VD: "Urban Compact Queen")
