-- Add reporting_status to payments for revenue reporting inclusion/exclusion.
-- Rule:
-- - payment_status = paid   => reporting_status = included
-- - payment_status != paid  => reporting_status = excluded
-- - when cancelling booking, keep paid but exclude from reporting

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS reporting_status text NOT NULL DEFAULT 'excluded';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_reporting_status_check'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_reporting_status_check
      CHECK (reporting_status IN ('included', 'excluded'));
  END IF;
END $$;

UPDATE public.payments p
SET reporting_status = CASE
  WHEN p.payment_status = 'paid'::public.payment_status_enum
       AND b.status <> 'cancelled'::public.booking_status THEN 'included'
  ELSE 'excluded'
END
FROM public.bookings b
WHERE b.id = p.booking_id;

CREATE OR REPLACE FUNCTION public.cancel_booking_secure(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1 FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled'::public.booking_status
  WHERE id = p_booking_id;

  UPDATE public.payments
  SET payment_status = 'cancelled'::public.payment_status_enum,
      reporting_status = 'excluded'
  WHERE booking_id = p_booking_id
    AND payment_status = 'pending'::public.payment_status_enum;

  UPDATE public.payments
  SET reporting_status = 'excluded'
  WHERE booking_id = p_booking_id
    AND payment_status = 'paid'::public.payment_status_enum;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'CANCEL_BOOKING_FAILED: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_booking_secure(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1 FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE id = p_booking_id
      AND status IN ('pending'::public.booking_status, 'awaiting_payment'::public.booking_status)
  ) THEN
    RAISE EXCEPTION 'Booking cannot be confirmed in current status';
  END IF;

  UPDATE public.bookings
  SET status = 'confirmed'::public.booking_status
  WHERE id = p_booking_id;

  UPDATE public.payments
  SET payment_status = 'paid'::public.payment_status_enum,
      paid_at = now(),
      reporting_status = 'included'
  WHERE booking_id = p_booking_id
    AND payment_status = 'pending'::public.payment_status_enum;

  UPDATE public.payments
  SET reporting_status = 'included'
  WHERE booking_id = p_booking_id
    AND payment_status = 'paid'::public.payment_status_enum;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'CONFIRM_BOOKING_FAILED: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking_secure(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_secure(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.confirm_booking_secure(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.confirm_booking_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_booking_secure(uuid) TO service_role;
