-- Supabase Data API (PostgREST): from 2026-05-30 new projects require explicit GRANTs
-- on public objects for anon / authenticated / service_role. This migration adds
-- grants for tables (and one RPC) introduced after remote_schema or missing them.
-- RLS remains the real access control; privileges must allow the role to reach the table.

-- ---------------------------------------------------------------------------
-- Tables: align with existing RLS (broad table privileges, RLS restricts)
-- ---------------------------------------------------------------------------
-- Note: public.branches grants live in 20260521100000_create_branches.sql

-- Website / dashboard settings (anon read + authenticated write via RLS)
grant select on table public.settings to anon;
grant select, insert, update, delete on table public.settings to authenticated;
grant select, insert, update, delete on table public.settings to service_role;

-- RBAC metadata (authenticated read in RLS; service_role for seeds / tooling)
grant select on table public.permissions to authenticated;
grant select on table public.role_permissions to authenticated;
grant select, insert, update, delete on table public.permissions to service_role;
grant select, insert, update, delete on table public.role_permissions to service_role;

-- Multi-room junction (policies use role "public" / broad access)
grant select, insert, update, delete on table public.booking_rooms to anon;
grant select, insert, update, delete on table public.booking_rooms to authenticated;
grant select, insert, update, delete on table public.booking_rooms to service_role;

-- Audit trail
grant select, insert on table public.audit_logs to authenticated;
grant select, insert, update, delete on table public.audit_logs to service_role;

-- Vouchers (anon read non-deleted rows via RLS)
grant select on table public.vouchers to anon;
grant select, insert, update, delete on table public.vouchers to authenticated;
grant select, insert, update, delete on table public.vouchers to service_role;

-- QR display singleton (Realtime + dashboard)
grant select on table public.qr_display_state to anon, authenticated;
grant insert, update, delete on table public.qr_display_state to authenticated;
grant select, insert, update, delete on table public.qr_display_state to service_role;

-- ---------------------------------------------------------------------------
-- RPC: SECURITY DEFINER upsert (callers still need EXECUTE)
-- ---------------------------------------------------------------------------

grant execute on function public.upsert_qr_display_state(
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  numeric,
  numeric
) to anon, authenticated, service_role;
