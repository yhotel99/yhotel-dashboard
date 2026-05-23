-- Multi-branch: branches table, branch_id columns, backfill, constraints

SET search_path = public;

-- ============================================================================
-- 1) Branches master table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS branches_code_unique_active
  ON public.branches (lower(code))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_branches_is_active
  ON public.branches (is_active)
  WHERE deleted_at IS NULL;

CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Default branch for existing data
INSERT INTO public.branches (id, code, name, is_active)
VALUES (
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'main',
  'Chi nhánh chính',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2) Add branch_id columns (nullable first for backfill)
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.qr_display_state
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- ============================================================================
-- 3) Backfill
-- ============================================================================

DO $$
DECLARE
  v_default uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
BEGIN
  UPDATE public.rooms SET branch_id = v_default WHERE branch_id IS NULL;
  UPDATE public.customers SET branch_id = v_default WHERE branch_id IS NULL;
  UPDATE public.bookings SET branch_id = v_default WHERE branch_id IS NULL;
  UPDATE public.payments p
  SET branch_id = b.branch_id
  FROM public.bookings b
  WHERE p.booking_id = b.id AND p.branch_id IS NULL;
  UPDATE public.payments SET branch_id = v_default WHERE branch_id IS NULL;
  UPDATE public.qr_display_state SET branch_id = v_default WHERE branch_id IS NULL;
  UPDATE public.profiles SET branch_id = v_default
  WHERE role = 'staff' AND branch_id IS NULL;
  UPDATE public.profiles SET branch_id = NULL
  WHERE role IN ('admin', 'manager');
END $$;

-- ============================================================================
-- 4) Optional branch_id (nullable — app/RLS filter when set; no NOT NULL)
-- ============================================================================

-- customers: unique email per branch (when branch_id is set)
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS customers_branch_email_unique
  ON public.customers (branch_id, lower(email))
  WHERE deleted_at IS NULL AND email IS NOT NULL AND trim(email) <> '' AND branch_id IS NOT NULL;

-- rooms: unique room_number per branch (when set)
CREATE UNIQUE INDEX IF NOT EXISTS rooms_branch_room_number_unique
  ON public.rooms (branch_id, room_number)
  WHERE deleted_at IS NULL AND room_number IS NOT NULL AND trim(room_number) <> '' AND branch_id IS NOT NULL;

-- qr_display_state: one active row per branch when branch_id is set
DROP INDEX IF EXISTS qr_display_state_branch_id_unique;
CREATE UNIQUE INDEX IF NOT EXISTS qr_display_state_branch_id_unique
  ON public.qr_display_state (branch_id)
  WHERE branch_id IS NOT NULL;

-- ============================================================================
-- 5) Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles (branch_id);
CREATE INDEX IF NOT EXISTS idx_rooms_branch_id ON public.rooms (branch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_branch_id_created_at ON public.bookings (branch_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON public.customers (branch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_branch_id_created_at ON public.payments (branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vouchers_branch_id ON public.vouchers (branch_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 6) Triggers: sync payments.branch_id from bookings
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_payment_branch_from_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.booking_id IS NOT NULL THEN
    SELECT b.branch_id INTO NEW.branch_id
    FROM public.bookings b
    WHERE b.id = NEW.booking_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_sync_branch ON public.payments;
CREATE TRIGGER trg_payments_sync_branch
  BEFORE INSERT OR UPDATE OF booking_id ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_payment_branch_from_booking();

-- ============================================================================
-- 7) Branch permissions
-- ============================================================================

INSERT INTO public.permissions (name, description)
VALUES
  ('view:branches', 'View branches list'),
  ('manage:branches', 'Create, update, delete branches')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::public.user_role, id FROM public.permissions WHERE name IN ('view:branches', 'manage:branches')
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'manager'::public.user_role, id FROM public.permissions WHERE name = 'view:branches'
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================================
-- 8) Grants
-- ============================================================================

GRANT SELECT ON TABLE public.branches TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.branches TO authenticated, service_role;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
