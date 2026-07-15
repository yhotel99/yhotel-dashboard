-- Permissions for assigning / updating booking creator (created_by)
-- - assign:bookings  → gắn người tạo khi created_by đang trống (admin, manager, staff)
-- - update:booking-creator → đổi / xóa người tạo đã có (admin, manager)

SET search_path = public;

INSERT INTO permissions (name, description)
VALUES
  ('assign:bookings', 'Gắn người tạo vào booking khi chưa có người tạo'),
  ('update:booking-creator', 'Sửa hoặc đổi người tạo của booking đã có')
ON CONFLICT (name) DO NOTHING;

-- Staff: chỉ gắn khi trống
INSERT INTO role_permissions (role, permission_id)
SELECT 'staff'::user_role, id
FROM permissions
WHERE name = 'assign:bookings'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Manager: gắn + sửa
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager'::user_role, id
FROM permissions
WHERE name IN ('assign:bookings', 'update:booking-creator')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Admin: gắn + sửa
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin'::user_role, id
FROM permissions
WHERE name IN ('assign:bookings', 'update:booking-creator')
ON CONFLICT (role, permission_id) DO NOTHING;
