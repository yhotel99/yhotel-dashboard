-- Fix: create_multi_booking_secure used p_total_amount (nonexistent) instead of v_total_amount
CREATE OR REPLACE FUNCTION public.create_multi_booking_secure(
  p_customer_id uuid,
  p_room_items jsonb,
  p_check_in timestamptz,
  p_check_out timestamptz,
  p_number_of_nights integer,
  p_total_guests integer DEFAULT 1,
  p_notes text DEFAULT NULL,
  p_payment_method text DEFAULT 'pay_at_hotel',
  p_advance_payment numeric DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking_id uuid;
  v_booking_code text;
  v_total_amount numeric := 0;
  v_room_charge numeric;
  v_item jsonb;
  v_room_id uuid;
  v_amount numeric;
BEGIN
  IF p_number_of_nights <= 0 THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_NIGHTS');
  END IF;
  IF p_check_out <= p_check_in THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_DATE_RANGE');
  END IF;
  IF p_room_items IS NULL OR jsonb_array_length(p_room_items) < 1 THEN
    RETURN json_build_object('ok', false, 'error_code', 'NO_ROOMS');
  END IF;
  IF p_advance_payment < 0 THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_AMOUNT');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_room_items)
  LOOP
    v_total_amount := v_total_amount + (v_item->>'amount')::numeric;
  END LOOP;

  IF v_total_amount <= 0 THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_AMOUNT');
  END IF;
  IF p_advance_payment > v_total_amount THEN
    RETURN json_build_object('ok', false, 'error_code', 'ADVANCE_EXCEEDS_TOTAL');
  END IF;

  v_booking_code := 'YH' || to_char(now(), 'YYYYMMDD') || upper(substr(md5(random()::text), 1, 6));

  INSERT INTO bookings (customer_id, room_id, check_in, check_out, number_of_nights, total_guests, status, notes, total_amount, advance_payment, booking_code, created_at)
  VALUES (p_customer_id, NULL, p_check_in, p_check_out, p_number_of_nights, p_total_guests, 'pending', p_notes, v_total_amount, p_advance_payment, v_booking_code, now())
  RETURNING id INTO v_booking_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_room_items)
  LOOP
    v_room_id := (v_item->>'room_id')::uuid;
    v_amount := (v_item->>'amount')::numeric;
    IF v_room_id IS NOT NULL AND v_amount > 0 THEN
      INSERT INTO booking_rooms (booking_id, room_id, check_in, check_out, number_of_nights, amount, status, created_at)
      VALUES (v_booking_id, v_room_id, p_check_in, p_check_out, p_number_of_nights, v_amount, 'pending', now());
    END IF;
  END LOOP;

  IF COALESCE(p_advance_payment, 0) > 0 THEN
    INSERT INTO payments (booking_id, amount, payment_type, payment_method, payment_status, created_at)
    VALUES (v_booking_id, p_advance_payment, 'advance_payment', p_payment_method, 'pending', now());
  END IF;

  v_room_charge := v_total_amount - COALESCE(p_advance_payment, 0);
  IF v_room_charge > 0 THEN
    INSERT INTO payments (booking_id, amount, payment_type, payment_method, payment_status, created_at)
    VALUES (v_booking_id, v_room_charge, 'room_charge', p_payment_method, 'pending', now());
  END IF;

  RETURN json_build_object('ok', true, 'booking_id', v_booking_id, 'booking_code', v_booking_code);

EXCEPTION
  WHEN exclusion_violation THEN
    RETURN json_build_object('ok', false, 'error_code', 'ROOM_NOT_AVAILABLE');
  WHEN OTHERS THEN RAISE;
END;
$$;
