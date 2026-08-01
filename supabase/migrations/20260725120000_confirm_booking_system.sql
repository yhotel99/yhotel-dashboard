-- System-initiated confirm (no branch access check — for SePay / payment webhooks)
-- Mirrors cancel_booking_system + payment updates from confirm_booking_secure.

SET search_path = public;

CREATE OR REPLACE FUNCTION public.confirm_booking_system(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM 1
  FROM public.bookings
  WHERE id = p_booking_id
    AND deleted_at IS NULL
    AND status IN (
      'pending'::public.booking_status,
      'awaiting_payment'::public.booking_status
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_CONFIRMABLE';
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
    RAISE EXCEPTION 'CONFIRM_BOOKING_SYSTEM_FAILED: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_booking_system(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_booking_system(uuid) TO service_role;
