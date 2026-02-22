# Troubleshooting Audit Logs - Lỗi 502

## Vấn đề: Error 502 sau khi `supabase db reset`

### Nguyên nhân

Lỗi 502 thường xảy ra do:
1. Migration bị lỗi syntax
2. Enum type `user_role` chưa tồn tại khi chạy migration permissions
3. RLS policies không đúng
4. Foreign key constraints bị vi phạm

### Giải pháp

#### Bước 1: Kiểm tra logs

```bash
# Xem logs của Supabase
supabase logs db

# Hoặc xem logs chi tiết
docker logs supabase_db_yhotel-dashboard
```

#### Bước 2: Kiểm tra migrations đã chạy

```bash
# Xem danh sách migrations đã apply
supabase migration list
```

#### Bước 3: Test migrations thủ công

Chạy script test trong Supabase SQL Editor:

```bash
# Copy nội dung file này và chạy trong SQL Editor
scripts/test-audit-logs-migration.sql
```

#### Bước 4: Reset và chạy lại từng bước

```bash
# Reset database
supabase db reset

# Nếu vẫn lỗi, thử chạy từng migration
supabase migration up --version 20260221000000
supabase migration up --version 20260221000001
```

#### Bước 5: Kiểm tra enum user_role

Nếu lỗi liên quan đến `user_role`, chạy query này:

```sql
-- Kiểm tra enum user_role có tồn tại không
SELECT typname, enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE typname = 'user_role';
```

Nếu không có, tạo enum:

```sql
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff');
```

#### Bước 6: Kiểm tra bảng permissions

```sql
-- Kiểm tra bảng permissions có tồn tại không
SELECT * FROM permissions LIMIT 5;

-- Nếu không có, chạy migration tạo bảng permissions trước
```

### Các lỗi thường gặp

#### Lỗi: "type user_role does not exist"

**Giải pháp:** Enum `user_role` phải được tạo trước khi chạy migration permissions.

Kiểm tra file migration tạo enum (thường trong `remote_schema.sql` hoặc migration tạo bảng profiles).

#### Lỗi: "relation permissions does not exist"

**Giải pháp:** Bảng `permissions` phải được tạo trước migration audit-logs permissions.

Đảm bảo migration `20260112065753_create_table_permission.sql` đã chạy thành công.

#### Lỗi: "permission denied for table audit_logs"

**Giải pháp:** RLS policies chưa đúng.

Chạy lại migration `20260221000000_create_audit_logs_table.sql` với policies đã được cập nhật.

### Kiểm tra sau khi fix

```bash
# 1. Chạy script kiểm tra
npm run check:audit-logs

# 2. Truy cập trang audit logs
# http://localhost:3000/dashboard/audit-logs

# 3. Kiểm tra không có lỗi 502
```

### Nếu vẫn lỗi

1. Xóa 2 migrations audit-logs:
   ```bash
   rm supabase/migrations/20260221000000_create_audit_logs_table.sql
   rm supabase/migrations/20260221000001_add_audit_logs_permissions.sql
   ```

2. Reset database:
   ```bash
   supabase db reset
   ```

3. Tạo lại migrations bằng Supabase SQL Editor:
   - Chạy SQL từ file `20260221000000_create_audit_logs_table.sql`
   - Chạy SQL từ file `20260221000001_add_audit_logs_permissions.sql`

4. Tạo migration mới từ changes:
   ```bash
   supabase db diff -f create_audit_logs_system
   ```

### Liên hệ

Nếu vẫn gặp vấn đề, cung cấp:
- Output của `supabase logs db`
- Output của `supabase migration list`
- Screenshot lỗi 502
