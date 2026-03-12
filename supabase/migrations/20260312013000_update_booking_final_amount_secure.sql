-- Migration: Add transactional RPC to update final_amount and sync room_charge payment
-- - Function: update_booking_final_amount_secure
-- - Cập nhật final_amount, total_guests, notes trong bookings
-- - Đồng bộ lại payment room_charge (pending) theo final_amount - advance_payment

DROP FUNCTION IF EXISTS public.update_booking_final_amount_secure(
  uuid,
  numeric,
  integer,
  text
) CASCADE;

CREATE OR REPLACE FUNCTION public.update_booking_final_amount_secure(
  p_booking_id uuid,
  p_final_amount numeric,
  p_total_guests integer DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking           bookings%ROWTYPE;
  v_updated_booking   bookings%ROWTYPE;
  v_room_charge_id    uuid;
  v_room_charge_amt   numeric;
  v_payment_method    text;
BEGIN
  -- Lock booking row for update to ensure consistency
  SELECT *
  INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error_code', 'BOOKING_NOT_FOUND');
  END IF;

  -- Only allow changes for pending bookings
  IF v_booking.status <> 'pending' THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_STATUS');
  END IF;

  -- Basic validations
  IF p_final_amount IS NULL OR p_final_amount <= 0 THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_AMOUNT');
  END IF;

  IF p_final_amount < COALESCE(v_booking.advance_payment, 0) THEN
    RETURN json_build_object('ok', false, 'error_code', 'ADVANCE_EXCEEDS_TOTAL');
  END IF;

  -- Update booking with new final_amount (and optional fields)
  UPDATE bookings
  SET
    final_amount = p_final_amount,
    total_guests = COALESCE(p_total_guests, total_guests),
    notes        = COALESCE(p_notes, notes),
    updated_at   = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_updated_booking;

  -- Recalculate pending room_charge payment based on new final_amount
  v_room_charge_amt := p_final_amount - COALESCE(v_booking.advance_payment, 0);

  -- Find existing pending room_charge payment, if any
  SELECT id
  INTO v_room_charge_id
  FROM payments
  WHERE booking_id = p_booking_id
    AND payment_type = 'room_charge'
    AND payment_status = 'pending'
  LIMIT 1;

  IF v_room_charge_id IS NOT NULL THEN
    IF v_room_charge_amt > 0 THEN
      -- Update existing room_charge pending payment
      UPDATE payments
      SET
        amount = v_room_charge_amt,
        updated_at = now()
      WHERE id = v_room_charge_id;
    ELSE
      -- No room charge left -> delete pending room_charge payment
      DELETE FROM payments
      WHERE id = v_room_charge_id;
    END IF;
  ELSE
    -- No existing pending room_charge payment
    IF v_room_charge_amt > 0 THEN
      -- Try to reuse existing payment_method from any payment of this booking
      SELECT payment_method
      INTO v_payment_method
      FROM payments
      WHERE booking_id = p_booking_id
      ORDER BY created_at DESC
      LIMIT 1;

      IF v_payment_method IS NULL THEN
        v_payment_method := 'pay_at_hotel';
      END IF;

      INSERT INTO payments (
        id,
        booking_id,
        amount,
        payment_type,
        payment_method,
        payment_status,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        p_booking_id,
        v_room_charge_amt,
        'room_charge',
        v_payment_method,
        'pending',
        now()
      );
    END IF;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'booking', row_to_json(v_updated_booking)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Let the error surface but keep a structured shape if needed
    RAISE;
END;
$$;

