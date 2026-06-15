-- Per-branch bank accounts (secured table, separate from global settings)

SET search_path = public;

-- ============================================================================
-- 1) branch_bank_accounts table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.branch_bank_accounts (
  branch_id uuid PRIMARY KEY REFERENCES public.branches(id) ON DELETE CASCADE,
  bank_account_number text,
  bank_name text,
  bank_bin text,
  bank_account_owner text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_branch_bank_accounts_updated_at
  BEFORE UPDATE ON public.branch_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Backfill from global settings singleton into every active branch
INSERT INTO public.branch_bank_accounts (
  branch_id,
  bank_account_number,
  bank_name,
  bank_bin,
  bank_account_owner
)
SELECT
  b.id,
  s.bank_account_number,
  s.bank_name,
  s.bank_bin,
  s.bank_account_owner
FROM public.branches b
CROSS JOIN public.settings s
WHERE s.id = '00000000-0000-0000-0000-000000000001'
  AND b.deleted_at IS NULL
ON CONFLICT (branch_id) DO NOTHING;

-- Remove bank columns from global settings (no longer anon-readable bank data)
ALTER TABLE public.settings
  DROP COLUMN IF EXISTS bank_account_number,
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_bin,
  DROP COLUMN IF EXISTS bank_account_owner;

-- ============================================================================
-- 2) Grants & RLS
-- ============================================================================

GRANT SELECT ON TABLE public.branch_bank_accounts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.branch_bank_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.branch_bank_accounts TO service_role;

ALTER TABLE public.branch_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_accounts_authenticated_select" ON public.branch_bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_admin_insert" ON public.branch_bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_admin_update" ON public.branch_bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_admin_delete" ON public.branch_bank_accounts;

-- All authenticated users can read bank accounts (dashboard QR / settings view)
CREATE POLICY "bank_accounts_authenticated_select"
  ON public.branch_bank_accounts FOR SELECT TO authenticated
  USING (true);

-- Only admin can write
CREATE POLICY "bank_accounts_admin_insert"
  ON public.branch_bank_accounts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
        AND p.role = 'admin'
    )
  );

CREATE POLICY "bank_accounts_admin_update"
  ON public.branch_bank_accounts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
        AND p.role = 'admin'
    )
  );

CREATE POLICY "bank_accounts_admin_delete"
  ON public.branch_bank_accounts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
        AND p.role = 'admin'
    )
  );

-- ============================================================================
-- 3) Public QR payload RPC (controlled read for anon — only when display active)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_qr_display_payload(p_branch_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'branch', jsonb_build_object(
      'id', b.id,
      'code', b.code,
      'name', b.name
    ),
    'bank', jsonb_build_object(
      'bank_account_number', a.bank_account_number,
      'bank_name', a.bank_name,
      'bank_bin', a.bank_bin,
      'bank_account_owner', a.bank_account_owner
    ),
    'display', jsonb_build_object(
      'booking_id', q.booking_id,
      'booking_code', q.booking_code,
      'customer_name', q.customer_name,
      'room_name', q.room_name,
      'check_in', q.check_in,
      'check_out', q.check_out,
      'total_amount', q.total_amount,
      'final_amount', q.final_amount,
      'updated_at', q.updated_at,
      'branch_id', q.branch_id
    )
  )
  INTO v_result
  FROM public.branches b
  INNER JOIN public.qr_display_state q ON q.branch_id = b.id
  LEFT JOIN public.branch_bank_accounts a ON a.branch_id = b.id
  WHERE lower(trim(b.code)) = lower(trim(p_branch_code))
    AND b.deleted_at IS NULL
    AND b.is_active = true
  LIMIT 1;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_qr_display_payload(text)
  TO anon, authenticated, service_role;
