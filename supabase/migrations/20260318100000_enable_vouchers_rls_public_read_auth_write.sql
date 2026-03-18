-- Enable RLS for vouchers:
-- - Public (anon) can read non-deleted vouchers
-- - Authenticated users can create/update/delete vouchers

SET search_path = public;

alter table public.vouchers enable row level security;

-- Drop existing policies (safe for re-run)
drop policy if exists "Public can view vouchers" on public.vouchers;
drop policy if exists "Authenticated can view vouchers" on public.vouchers;
drop policy if exists "Authenticated can insert vouchers" on public.vouchers;
drop policy if exists "Authenticated can update vouchers" on public.vouchers;
drop policy if exists "Authenticated can delete vouchers" on public.vouchers;
drop policy if exists "Admin/Manager can insert vouchers" on public.vouchers;
drop policy if exists "Admin/Manager can update vouchers" on public.vouchers;
drop policy if exists "Admin/Manager can delete vouchers" on public.vouchers;

-- Public read (no login required)
create policy "Public can view vouchers"
  on public.vouchers
  for select
  to anon
  using (deleted_at is null);

-- Authenticated read (optional, keeps behavior consistent)
create policy "Authenticated can view vouchers"
  on public.vouchers
  for select
  to authenticated
  using (deleted_at is null);

-- Authenticated write (login required)
create policy "Authenticated can insert vouchers"
  on public.vouchers
  for insert
  to authenticated
  with check (true);

create policy "Authenticated can update vouchers"
  on public.vouchers
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated can delete vouchers"
  on public.vouchers
  for delete
  to authenticated
  using (true);

