# Fix Lỗi 502 - Audit Logs

## Tóm tắt

Lỗi 502 "An invalid response was received from the upstream server" xảy ra khi:
1. Database migrations chưa chạy
2. Bảng `audit_logs` chưa được tạo
3. API route gặp lỗi khi query database

## Các bước fix nhanh

### 1. Kiểm tra bảng audit_logs

```bash
npm run check:audit-logs
```

**Kết quả mong đợi:**
```
✅ Table audit_logs exists!
✅ Found 3 audit-logs permissions
✅ Audit logs system is ready!
```

### 2. Nếu bảng chưa tồn tại

```bash
# Chạy migrations
supabase db push

# Hoặc reset database (cẩn thận: xóa tất cả data)
supabase db reset
```

### 3. Kiểm tra Supabase đang chạy

```bash
# Kiểm tra status
supabase status

# Nếu không chạy, start lại
supabase start
```

### 4. Kiểm tra logs để tìm lỗi cụ thể

```bash
# Xem logs database
supabase logs db

# Xem logs API
supabase logs api
```

## Lỗi cụ thể và cách fix

### Lỗi: "relation audit_logs does not exist"

**Nguyên nhân:** Migration chưa chạy

**Fix:**
```bash
supabase db push
```

### Lỗi: "permission denied for table audit_logs"

**Nguyên nhân:** RLS policies chưa đúng

**Fix:** Chạy lại migration:
```sql
-- Trong Supabase SQL Editor
DROP POLICY IF EXISTS "Allow authenticated users to read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow service role full access to audit logs" ON audit_logs;

-- Tạo lại policies
CREATE POLICY "Allow authenticated users to read audit logs"
  ON audit_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert audit logs"
  ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow service role full access to audit logs"
  ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Lỗi: "type user_role does not exist"

**Nguyên nhân:** Enum chưa được tạo

**Fix:**
```sql
-- Kiểm tra enum
SELECT typname FROM pg_type WHERE typname = 'user_role';

-- Nếu không có, tạo enum (nhưng thường đã có trong remote_schema)
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff');
```

### Lỗi 502 khi truy cập /dashboard/audit-logs

**Nguyên nhân:** API route `/api/audit-logs` gặp lỗi

**Fix:**

1. Kiểm tra browser console (F12) để xem error message cụ thể

2. Kiểm tra Network tab để xem response từ API

3. Nếu thấy "TABLE_NOT_FOUND", chạy:
   ```bash
   supabase db push
   ```

4. Nếu thấy "Unauthorized", kiểm tra authentication:
   ```bash
   # Đăng xuất và đăng nhập lại
   ```

## Test sau khi fix

### 1. Test API trực tiếp

```bash
# Lấy access token từ browser (F12 > Application > Local Storage)
# Hoặc dùng Supabase anon key

curl http://localhost:3000/api/audit-logs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test trong browser

1. Mở http://localhost:3000/dashboard/audit-logs
2. Mở F12 Console
3. Không có lỗi = thành công!

### 3. Test insert log

```typescript
// Trong browser console hoặc test file
const response = await fetch('/api/audit-logs', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});
console.log(await response.json());
```

## Checklist hoàn chỉnh

- [ ] Supabase đang chạy (`supabase status`)
- [ ] Migrations đã chạy (`supabase migration list`)
- [ ] Bảng audit_logs tồn tại (`npm run check:audit-logs`)
- [ ] Permissions đã được tạo (3 permissions)
- [ ] RLS policies đã được tạo (3 policies)
- [ ] User đã đăng nhập
- [ ] User có permission `view:audit-logs`
- [ ] API `/api/audit-logs` trả về 200 OK
- [ ] Trang `/dashboard/audit-logs` load thành công

## Nếu vẫn lỗi

1. **Xem logs chi tiết:**
   ```bash
   supabase logs db --follow
   ```

2. **Reset hoàn toàn:**
   ```bash
   supabase db reset
   npm run check:audit-logs
   ```

3. **Kiểm tra .env.local:**
   ```bash
   # Đảm bảo có đủ biến môi trường
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

4. **Restart dev server:**
   ```bash
   # Ctrl+C để stop
   npm run dev
   ```

## Liên hệ support

Nếu vẫn gặp vấn đề, cung cấp:
- Output của `npm run check:audit-logs`
- Screenshot lỗi 502
- Browser console logs (F12)
- Output của `supabase logs db`
