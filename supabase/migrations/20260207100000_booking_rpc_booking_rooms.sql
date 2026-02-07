-- Migration: RPC cancel / confirm / check_in / check_out
-- Chỉ cập nhật bảng bookings (và payments nếu cần).
-- booking_rooms được đồng bộ tự động bởi trigger trg_sync_booking_rooms_status
-- (AFTER UPDATE OF status ON bookings → sync status sang booking_rooms).

-- ============================================================================
-- 1. cancel_booking_secure
-- ============================================================================
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

  -- Trigger sync_booking_rooms_status sẽ cập nhật booking_rooms.status = 'cancelled'

  UPDATE public.payments
  SET payment_status = 'cancelled'::public.payment_status_enum
  WHERE booking_id = p_booking_id
    AND payment_status = 'pending'::public.payment_status_enum;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'CANCEL_BOOKING_FAILED: %', SQLERRM;
END;
$$;

-- ============================================================================
-- 2. confirm_booking_secure
-- ============================================================================
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
    SELECT 1 FROM public.bookings
    WHERE id = p_booking_id
      AND status IN ('pending'::public.booking_status, 'awaiting_payment'::public.booking_status)
  ) THEN
    RAISE EXCEPTION 'Booking cannot be confirmed in current status';
  END IF;

  UPDATE public.bookings
  SET status = 'confirmed'::public.booking_status
  WHERE id = p_booking_id;

  -- Trigger sync_booking_rooms_status sẽ cập nhật booking_rooms.status = 'confirmed'

  UPDATE public.payments
  SET payment_status = 'paid'::public.payment_status_enum,
      paid_at = now()
  WHERE booking_id = p_booking_id
    AND payment_status = 'pending'::public.payment_status_enum;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'CONFIRM_BOOKING_FAILED: %', SQLERRM;
END;
$$;

-- ============================================================================
-- 3. check_in_booking_secure
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_in_booking_secure(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1 FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  UPDATE public.bookings
  SET status = 'checked_in'::public.booking_status,
      actual_check_in = now()
  WHERE id = p_booking_id;

  -- Trigger sync_booking_rooms_status sẽ cập nhật booking_rooms.status = 'checked_in'

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'CHECK_IN_BOOKING_FAILED: %', SQLERRM;
END;
$$;

-- ============================================================================
-- 4. check_out_booking_secure
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_out_booking_secure(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1 FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  UPDATE public.bookings
  SET status = 'checked_out'::public.booking_status,
      actual_check_out = now()
  WHERE id = p_booking_id;

  -- Trigger sync_booking_rooms_status sẽ cập nhật booking_rooms.status = 'checked_out'

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'CHECK_OUT_BOOKING_FAILED: %', SQLERRM;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.cancel_booking_secure(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_secure(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.confirm_booking_secure(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.confirm_booking_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_booking_secure(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.check_in_booking_secure(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.check_in_booking_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_booking_secure(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.check_out_booking_secure(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.check_out_booking_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_out_booking_secure(uuid) TO service_role;
