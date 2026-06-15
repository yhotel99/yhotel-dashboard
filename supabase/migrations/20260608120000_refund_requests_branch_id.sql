-- refund_requests: denormalize branch_id from booking (same pattern as payments)

ALTER TABLE public.refund_requests
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Backfill from linked booking
UPDATE public.refund_requests r
SET branch_id = b.branch_id
FROM public.bookings b
WHERE r.booking_id = b.id
  AND r.branch_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_refund_requests_branch_id_updated_at
  ON public.refund_requests (branch_id, updated_at DESC)
  WHERE status = 'refunded';

-- Keep branch_id in sync when booking_id is set/changed
CREATE OR REPLACE FUNCTION public.sync_refund_request_branch_from_booking()
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

DROP TRIGGER IF EXISTS trg_refund_requests_sync_branch ON public.refund_requests;
CREATE TRIGGER trg_refund_requests_sync_branch
  BEFORE INSERT OR UPDATE OF booking_id ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_refund_request_branch_from_booking();

-- RLS: use branch_id directly (fallback join kept for legacy null rows)
DROP POLICY IF EXISTS "refund_requests_select_branch" ON public.refund_requests;
DROP POLICY IF EXISTS "refund_requests_insert_branch" ON public.refund_requests;
DROP POLICY IF EXISTS "refund_requests_update_branch" ON public.refund_requests;
DROP POLICY IF EXISTS "refund_requests_delete_branch" ON public.refund_requests;

CREATE POLICY "refund_requests_select_branch"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (
    public.can_access_branch(branch_id)
    OR (
      branch_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = booking_id AND public.can_access_branch(b.branch_id)
      )
    )
  );

CREATE POLICY "refund_requests_insert_branch"
  ON public.refund_requests FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.can_access_branch(b.branch_id)
    )
  );

CREATE POLICY "refund_requests_update_branch"
  ON public.refund_requests FOR UPDATE TO authenticated
  USING (
    public.can_access_branch(branch_id)
    OR (
      branch_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = booking_id AND public.can_access_branch(b.branch_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.can_access_branch(b.branch_id)
    )
  );

CREATE POLICY "refund_requests_delete_branch"
  ON public.refund_requests FOR DELETE TO authenticated
  USING (
    public.can_access_branch(branch_id)
    OR (
      branch_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = booking_id AND public.can_access_branch(b.branch_id)
      )
    )
  );
