-- Enable RLS for settings:
-- - Public (anon) can read settings (for website / public pages)
-- - Authenticated users can create/update/delete settings

SET search_path = public;

alter table public.settings enable row level security;

-- Drop existing policies (safe for re-run)
drop policy if exists "Public can view settings" on public.settings;
drop policy if exists "Authenticated can view settings" on public.settings;
drop policy if exists "Authenticated can insert settings" on public.settings;
drop policy if exists "Authenticated can update settings" on public.settings;
drop policy if exists "Authenticated can delete settings" on public.settings;

-- Public read (no login required)
create policy "Public can view settings"
  on public.settings
  for select
  to anon
  using (true);

-- Authenticated read (optional)
create policy "Authenticated can view settings"
  on public.settings
  for select
  to authenticated
  using (true);

-- Authenticated write (login required)
create policy "Authenticated can insert settings"
  on public.settings
  for insert
  to authenticated
  with check (true);

create policy "Authenticated can update settings"
  on public.settings
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated can delete settings"
  on public.settings
  for delete
  to authenticated
  using (true);

