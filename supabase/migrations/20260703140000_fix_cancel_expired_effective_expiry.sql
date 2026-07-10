-- Fix auto-cancel when payment_expires_at is NULL but online payment window elapsed.
-- Bookings created with pay_at_hotel then PATCHed to bank_transfer/onepay were skipped.

SET search_path = public;

-- Backfill missing expiry for pending online payments
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
    SELECT b.id
    FROM public.bookings b
    WHERE b.status = 'pending'::public.booking_status
      AND b.deleted_at IS NULL
      AND (
        (b.payment_expires_at IS NOT NULL AND b.payment_expires_at <= now())
        OR (
          b.payment_expires_at IS NULL
          AND b.created_at + interval '10 minutes' <= now()
          AND EXISTS (
            SELECT 1
            FROM public.payments p
            WHERE p.booking_id = b.id
              AND p.payment_method IN ('bank_transfer', 'onepay')
              AND p.payment_status = 'pending'::public.payment_status_enum
          )
        )
      )
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.cancel_booking_system(v_booking_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_expired_pending_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_expired_pending_bookings() TO service_role;
