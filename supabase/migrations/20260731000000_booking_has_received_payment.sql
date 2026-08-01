-- ============================================================================
-- booking_has_received_payment: check if booking has confirmed payment_log
-- Used by API to decide whether to confirm (instead of cancel) expired bookings
-- that already received payment via SePay webhook.
-- ============================================================================

SET search_path = public;

CREATE OR REPLACE FUNCTION public.booking_has_received_payment(p_booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.payment_logs pl
    WHERE pl.booking_id = p_booking_id
      AND pl.status IN ('success', 'confirmed')
  );
$$;

REVOKE ALL ON FUNCTION public.booking_has_received_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_has_received_payment(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.booking_has_received_payment(uuid) TO authenticated;
