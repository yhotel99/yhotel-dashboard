-- Fix auto-cancel: cancel_booking_secure on production checks branch access and
-- fails with BRANCH_ACCESS_DENIED when invoked by pg_cron / website checkout.
-- Use cancel_booking_system for system-initiated cancellations (expiry, customer cancel).

SET search_path = public;

CREATE OR REPLACE FUNCTION public.cancel_booking_system(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM 1
  FROM public.bookings
  WHERE id = p_booking_id
    AND status = 'pending'::public.booking_status
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_CANCELLABLE';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled'::public.booking_status
  WHERE id = p_booking_id;

  UPDATE public.payments
  SET payment_status = 'cancelled'::public.payment_status_enum
  WHERE booking_id = p_booking_id
    AND payment_status = 'pending'::public.payment_status_enum;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'CANCEL_BOOKING_SYSTEM_FAILED: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_booking_system(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_booking_system(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_booking_system(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking_system(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_expired_pending_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_booking_id IN
    SELECT id
    FROM public.bookings
    WHERE status = 'pending'::public.booking_status
      AND deleted_at IS NULL
      AND payment_expires_at IS NOT NULL
      AND payment_expires_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.cancel_booking_system(v_booking_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Backfill payment_expires_at for pending online payments still missing it
UPDATE public.bookings b
SET payment_expires_at = b.created_at + interval '10 minutes'
WHERE b.status = 'pending'::public.booking_status
  AND b.deleted_at IS NULL
  AND b.payment_expires_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.booking_id = b.id
      AND p.payment_method IN ('bank_transfer', 'onepay')
      AND p.payment_status = 'pending'::public.payment_status_enum
  );
