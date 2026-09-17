-- Permission to cancel bookings that are already checked_out (admin + manager only)

SET search_path = public;

INSERT INTO public.permissions (name, description)
VALUES (
  'manage:post-checkout-bookings',
  'Hủy booking đã check-out'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::user_role, id
FROM public.permissions
WHERE name = 'manage:post-checkout-bookings'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'manager'::user_role, id
FROM public.permissions
WHERE name = 'manage:post-checkout-bookings'
ON CONFLICT (role, permission_id) DO NOTHING;
