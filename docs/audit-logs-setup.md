# Cài đặt Audit Logs

## Bước 1: Chạy Database Migrations

Chạy các migrations để tạo bảng audit_logs và thêm permissions:

```bash
# Nếu dùng Supabase CLI
supabase db push

# Hoặc chạy từng migration thủ công trong Supabase Dashboard
# 1. supabase/migrations/20260221000000_create_audit_logs_table.sql
# 2. supabase/migrations/20260221000001_add_audit_logs_permissions.sql
```

## Bước 2: Kiểm tra Permissions

Đảm bảo các permissions đã được tạo:

```sql
SELECT * FROM permissions WHERE name LIKE '%audit-logs%';
```

Kết quả mong đợi:
- view:audit-logs
- create:audit-logs
- delete:audit-logs

## Bước 3: Kiểm tra Role Permissions

```sql
SELECT r.role, p.name 
FROM role_permissions r
JOIN permissions p ON r.permission_id = p.id
WHERE p.name LIKE '%audit-logs%';
```

Kết quả mong đợi:
- admin có tất cả permissions (view, create, delete)
- manager có view permission

## Bước 4: Truy cập trang Audit Logs

Sau khi chạy migrations, truy cập:
- URL: `/dashboard/audit-logs`
- Menu sidebar: "Nhật Ký Hệ Thống"

## Bước 5: Tích hợp vào code

Xem hướng dẫn chi tiết trong `docs/audit-logging-guide.md`

### Ví dụ nhanh:

```typescript
import { logBookingUpdate } from '@/lib/audit-helpers';

// Trong API route
await logBookingUpdate(
  bookingId,
  userId,
  userEmail,
  oldData,
  newData
);
```

## Troubleshooting

### Lỗi: Table audit_logs không tồn tại
- Chạy lại migration: `supabase db push`

### Lỗi: Permission denied
- Kiểm tra RLS policies trong bảng audit_logs
- Đảm bảo user đã đăng nhập

### Không thấy menu "Nhật Ký Hệ Thống"
- Kiểm tra permissions của user trong database
- Đảm bảo role của user có permission "view:audit-logs"

## Cấu trúc Files

```
app/dashboard/audit-logs/
  └── page.tsx                    # Trang audit logs

components/
  ├── audit-log-viewer.tsx        # Component hiển thị logs
  └── audit-logs/
      └── audit-logs-content.tsx  # Content với filters

lib/
  └── audit-helpers.ts            # Helper functions

services/
  └── audit-logs.ts               # Service layer

supabase/migrations/
  ├── 20260221000000_create_audit_logs_table.sql
  └── 20260221000001_add_audit_logs_permissions.sql
```
