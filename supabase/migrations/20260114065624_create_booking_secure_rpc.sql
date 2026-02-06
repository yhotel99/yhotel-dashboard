-- Migration: Create secure booking RPC function
-- This function returns JSON instead of throwing business errors
-- Database-level validation ensures data integrity

-- Drop existing function if it exists (to allow changing return type)
-- CASCADE will drop all overloads and dependent objects
DROP FUNCTION IF EXISTS public.create_booking_secure CASCADE;

-- Create function with JSON return type
CREATE OR REPLACE FUNCTION public.create_booking_secure(
  p_customer_id uuid,
  p_room_id uuid,
  p_check_in timestamptz,
  p_check_out timestamptz,
  p_number_of_nights integer,
  p_total_amount numeric,
  p_payment_method text,
  p_total_guests integer DEFAULT 1,
  p_notes text DEFAULT NULL,
  p_advance_payment numeric DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking_id uuid;
  v_booking_code text;
  v_room_charge numeric;
BEGIN
  /* ---------- BUSINESS VALIDATION ---------- */
  IF p_number_of_nights <= 0 THEN
    RETURN json_build_object(
      'ok', false,
      'error_code', 'INVALID_NIGHTS'
    );
  END IF;

  IF p_check_out <= p_check_in THEN
    RETURN json_build_object(
      'ok', false,
      'error_code', 'INVALID_DATE_RANGE'
    );
  END IF;

  IF p_total_amount < 0 OR p_advance_payment < 0 THEN
    RETURN json_build_object(
      'ok', false,
      'error_code', 'INVALID_AMOUNT'
    );
  END IF;

  IF p_advance_payment > p_total_amount THEN
    RETURN json_build_object(
      'ok', false,
      'error_code', 'ADVANCE_EXCEEDS_TOTAL'
    );
  END IF;

  /* ---------- INSERT BOOKING ---------- */
  v_booking_code :=
    'YH' ||
    to_char(now(), 'YYYYMMDD') ||
    upper(substr(md5(random()::text), 1, 6));

  INSERT INTO bookings (
    customer_id,
    room_id,
    check_in,
    check_out,
    number_of_nights,
    total_guests,
    status,
    notes,
    total_amount,
    advance_payment,
    booking_code,
    created_at
  )
  VALUES (
    p_customer_id,
    p_room_id,
    p_check_in,
    p_check_out,
    p_number_of_nights,
    p_total_guests,
    'pending',
    p_notes,
    p_total_amount,
    p_advance_payment,
    v_booking_code,
    now()
  )
  RETURNING id INTO v_booking_id;

  /* ---------- PAYMENTS ---------- */
  IF COALESCE(p_advance_payment, 0) > 0 THEN
    INSERT INTO payments (
      booking_id,
      amount,
      payment_type,
      payment_method,
      payment_status,
      created_at
    )
    VALUES (
      v_booking_id,
      p_advance_payment,
      'advance_payment',
      p_payment_method,
      'pending',
      now()
    );
  END IF;

  v_room_charge := p_total_amount - COALESCE(p_advance_payment, 0);

  IF v_room_charge > 0 THEN
    INSERT INTO payments (
      booking_id,
      amount,
      payment_type,
      payment_method,
      payment_status,
      created_at
    )
    VALUES (
      v_booking_id,
      v_room_charge,
      'room_charge',
      p_payment_method,
      'pending',
      now()
    );
  END IF;

  RETURN json_build_object(
    'ok', true,
    'booking_id', v_booking_id
  );

EXCEPTION
  WHEN exclusion_violation THEN
    RETURN json_build_object(
      'ok', false,
      'error_code', 'ROOM_NOT_AVAILABLE'
    );

  WHEN OTHERS THEN
    -- SYSTEM ERROR ONLY
    RAISE;
END;
$$;

