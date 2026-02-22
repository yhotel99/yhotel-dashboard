# RLS Policies - Giải thích và Đánh giá

## Tổng quan

Migration `20260221000003_add_main_tables_rls_policies.sql` thêm RLS policies cho các bảng chính.

## Các bảng và Đánh giá

### ✅ Hợp lý - Full CRUD cho authenticated users

#### 1. **bookings** - Đơn đặt phòng
- **Policies:** SELECT, INSERT, UPDATE, DELETE
- **Lý do:** Staff cần full access để quản lý bookings
- **Hợp lý:** ✅ Đúng

#### 2. **booking_rooms** - Junction table (booking ↔ rooms)
- **Policies:** SELECT, INSERT, UPDATE, DELETE
- **Lý do:** Junction table phụ thuộc bookings, cần cùng quyền
- **Hợp lý:** ✅ Đúng

#### 3. **customers** - Khách hàng
- **Policies:** SELECT, INSERT, UPDATE, DELETE
- **Lý do:** Staff cần quản lý thông tin khách hàng
- **Hợp lý:** ✅ Đúng

#### 4. **rooms** - Phòng khách sạn
- **Policies:** SELECT, INSERT, UPDATE, DELETE
- **Lý do:** Staff cần quản lý phòng (thêm, sửa, xóa)
- **Hợp lý:** ✅ Đúng

#### 5. **room_images** - Junction table (room ↔ images)
- **Policies:** SELECT, INSERT, UPDATE, DELETE
- **Lý do:** Quản lý ảnh phòng
- **Hợp lý:** ✅ Đúng

#### 6. **images** - Ảnh (shared resource)
- **Policies:** SELECT, INSERT, UPDATE, DELETE
- **Lý do:** Upload và quản lý ảnh cho rooms, blogs, etc.
- **Hợp lý:** ✅ Đúng

#### 7. **payments** - Thanh toán
- **Policies:** SELECT, INSERT, UPDATE, DELETE
- **Lý do:** Staff cần quản lý payments (mark as paid, update status)
- **Hợp lý:** ✅ Đúng

#### 8. **refund_requests** - Yêu cầu hoàn tiền
- **Policies:** SELECT, INSERT, UPDATE, DELETE
- **Lý do:** Staff cần xử lý refund requests
- **Hợp lý:** ✅ Đúng

### ⚠️ Đặc biệt - READ ONLY

#### 9. **payment_logs** - Webhook logs
- **Policies:** 
  - SELECT cho authenticated users
  - INSERT chỉ cho service_role
- **Lý do:** 
  - Logs từ payment gateway webhooks
  - Users chỉ cần XEM để debug
  - Không được phép sửa/xóa logs
- **Hợp lý:** ✅ Đúng - Bảo vệ tính toàn vẹn của logs

### 📊 VIEW - Không cần policies

#### 10. **room_status_view** - View (không phải table)
- **Xử lý:** Set security_barrier = true
- **Lý do:** 
  - Views kế thừa RLS từ underlying tables
  - Không thể set policies trực tiếp trên views
  - Security barrier đảm bảo RLS được apply đúng
- **Hợp lý:** ✅ Đúng

## Lưu ý quan trọng

### 1. Không check roles/permissions
```sql
-- Chỉ check authenticated, không check role
USING (true)
```

**Lý do:**
- Hệ thống đã có permissions system riêng (bảng `permissions`, `role_permissions`)
- RLS chỉ đảm bảo user đã đăng nhập
- Business logic check permissions ở application layer

### 2. Payment Logs - READ ONLY
```sql
-- Users chỉ được đọc
CREATE POLICY "Allow authenticated users to read payment_logs"
  ON payment_logs FOR SELECT TO authenticated USING (true);

-- Service role mới được insert (từ webhooks)
CREATE POLICY "Allow service role to insert payment_logs"
  ON payment_logs FOR INSERT TO service_role WITH CHECK (true);
```

**Lý do:**
- Logs không được phép sửa/xóa để đảm bảo audit trail
- Chỉ webhooks (service_role) mới được tạo logs mới

### 3. Views và RLS
```sql
-- Views không support RLS policies trực tiếp
ALTER VIEW room_status_view SET (security_barrier = true);
```

**Lý do:**
- PostgreSQL views kế thừa RLS từ base tables
- Security barrier đảm bảo RLS được enforce trước khi view được evaluate

## Bảng không cần RLS (đã có)

- ✅ `profiles` - Đã có RLS trong remote_schema.sql
- ✅ `permissions` - Đã có RLS (read-only)
- ✅ `role_permissions` - Đã có RLS (read-only)
- ✅ `settings` - Đã có RLS
- ✅ `audit_logs` - Đã có RLS trong migration này
- ✅ `blogs` - Đã có RLS trong migration trước

## Kiểm tra sau khi apply

```sql
-- Kiểm tra tất cả tables có RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Kiểm tra policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Apply migration

```bash
supabase db push
```

## Rollback (nếu cần)

```sql
-- Disable RLS và drop policies
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to read bookings" ON bookings;
-- ... (repeat for all tables)
```

## Kết luận

✅ Tất cả các bảng đều hợp lý với policies phù hợp:
- Full CRUD cho các bảng nghiệp vụ chính
- READ ONLY cho payment_logs (audit trail)
- Security barrier cho views
- Không conflict với permissions system hiện tại
