# Tóm tắt thay đổi khi thêm category_code vào rooms

## Cập nhật 2026-07-07: Phân loại phòng động (Hướng D)

Phân loại phòng (`category_code`) không còn hardcode trong `lib/constants.ts`. Danh sách được lưu trong `settings.room_categories` (JSONB) và quản lý qua **Cài đặt → tab Phân loại phòng**.

### Files chính

| File | Vai trò |
|------|---------|
| `supabase/migrations/20260707100000_add_room_categories_to_settings.sql` | Cột JSONB + seed 13 mã |
| `lib/room-categories.ts` | Parse, sort, resolve label |
| `hooks/use-room-categories.ts` | Hook đọc từ `/api/settings` |
| `components/settings-room-categories-section.tsx` | UI quản lý trong Settings |
| `components/room-form.tsx` | Dropdown động |
| `components/rooms/room-detail-dialog.tsx` | Hiển thị label động |

### Cấu trúc JSON mỗi phân loại

```json
{
  "code": "URBAN_COMPACT_TWIN",
  "name": "Urban Compact Twin Single",
  "description": null,
  "sort_order": 2,
  "is_active": true
}
```

### Quy tắc

- Mã (`code`) không đổi sau khi tạo
- Không thể xóa hoặc tắt phân loại đang có phòng sử dụng
- `room_type` (Standard/Deluxe/...) **giữ nguyên** enum cũ

---

## Lịch sử (2026-02-24)

### 1. Database Schema
- Migration thêm cột `category_code` vào bảng `rooms`
- File: `supabase/migrations/20260224000000_add_room_category_code.sql`

### 2. Database Functions & Views
- RPC `get_available_rooms` và view `room_status_view` include `category_code`

### 3. TypeScript Types
- `category_code` trên `Room`, `RoomInput`, `RoomFromRPC`, `RoomStatusViewData`

### 4. Components
- Form tạo/sửa phòng: dropdown phân loại
- Chi tiết phòng: hiển thị phân loại

## Cách áp dụng migration mới

```bash
supabase db push
# hoặc
supabase migration up
```
