-- Restore payment status updates in confirm_booking_secure / cancel_booking_secure.
-- Regression introduced in 20260521120000_branch_rpc_updates.sql (branch guard added,
-- payment + reporting_status logic accidentally removed).

CREATE OR REPLACE FUNCTION public.cancel_booking_secure(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  SELECT b.branch_id INTO v_branch_id
  FROM public.bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF NOT public.can_access_branch(v_branch_id) THEN
    RAISE EXCEPTION 'BRANCH_ACCESS_DENIED';
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  SELECT b.branch_id INTO v_branch_id
  FROM public.bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF NOT public.can_access_branch(v_branch_id) THEN
    RAISE EXCEPTION 'BRANCH_ACCESS_DENIED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE id = p_booking_id
      AND status IN (
        'pending'::public.booking_status,
        'awaiting_payment'::public.booking_status
      )
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
