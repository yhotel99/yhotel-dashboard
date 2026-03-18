-- Create vouchers table + permissions for voucher management
-- Date: 2026-03-18

SET search_path = public;

-- ============================================================================
-- 1) Vouchers table
-- ============================================================================

create table if not exists vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,

  -- discount
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric not null check (discount_value > 0),

  -- validity
  start_at timestamptz,
  end_at timestamptz,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Uniqueness and indexes
create unique index if not exists vouchers_code_unique on vouchers (lower(code)) where deleted_at is null;
create index if not exists idx_vouchers_is_active on vouchers (is_active) where deleted_at is null;
create index if not exists idx_vouchers_created_at on vouchers (created_at desc) where deleted_at is null;

-- ============================================================================
-- 2) Permissions: vouchers
-- ============================================================================

insert into permissions (name, description)
values
  ('view:vouchers', 'View vouchers management page and list vouchers'),
  ('create:vouchers', 'Create vouchers'),
  ('update:vouchers', 'Update vouchers'),
  ('delete:vouchers', 'Delete vouchers')
on conflict (name) do nothing;

-- Grant view to all roles
insert into role_permissions (role, permission_id)
select 'admin'::user_role, id from permissions where name = 'view:vouchers'
on conflict (role, permission_id) do nothing;

insert into role_permissions (role, permission_id)
select 'manager'::user_role, id from permissions where name = 'view:vouchers'
on conflict (role, permission_id) do nothing;

insert into role_permissions (role, permission_id)
select 'staff'::user_role, id from permissions where name = 'view:vouchers'
on conflict (role, permission_id) do nothing;

-- Grant mutations to admin + manager
insert into role_permissions (role, permission_id)
select 'admin'::user_role, id
from permissions
where name in ('create:vouchers','update:vouchers','delete:vouchers')
on conflict (role, permission_id) do nothing;

insert into role_permissions (role, permission_id)
select 'manager'::user_role, id
from permissions
where name in ('create:vouchers','update:vouchers','delete:vouchers')
on conflict (role, permission_id) do nothing;

