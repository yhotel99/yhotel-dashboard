-- Ensure view:checkout-sessions is granted to staff (and admin/manager).
-- Idempotent: safe if 20260818120000 already applied the same grants.

SET search_path = public;

INSERT INTO public.permissions (name, description)
VALUES (
  'view:checkout-sessions',
  'View online checkout sessions and create bookings from expired sessions'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::user_role, id
FROM public.permissions
WHERE name = 'view:checkout-sessions'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'manager'::user_role, id
FROM public.permissions
WHERE name = 'view:checkout-sessions'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'staff'::user_role, id
FROM public.permissions
WHERE name = 'view:checkout-sessions'
ON CONFLICT (role, permission_id) DO NOTHING;
