-- Set search_path to public schema
SET search_path = public;

-- Create permissions table
create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  name text unique not null, -- e.g., "view:dashboard", "view:users"
  description text,
  created_at timestamptz default now()
);

-- Create role_permissions table
create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  role user_role not null, -- References the user_role enum from profiles
  permission_id uuid not null references permissions(id) on delete cascade,
  created_at timestamptz default now(),
  unique(role, permission_id) -- Ensure one role can't have duplicate permissions
);

-- Create indexes for better query performance
create index if not exists idx_role_permissions_role on role_permissions(role);
create index if not exists idx_role_permissions_permission_id on role_permissions(permission_id);
create index if not exists idx_permissions_name on permissions(name);

-- Enable Row Level Security
alter table permissions enable row level security;
alter table role_permissions enable row level security;

-- RLS Policies for permissions table (read-only for authenticated users)
create policy "Anyone can view permissions"
  on permissions
  for select
  to authenticated
  using (true);

-- RLS Policies for role_permissions table (read-only for authenticated users)
create policy "Anyone can view role_permissions"
  on role_permissions
  for select
  to authenticated
  using (true);


