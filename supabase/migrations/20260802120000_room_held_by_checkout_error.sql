-- ============================================================================
-- Distinguish checkout payment hold from normal room conflict.
-- create_booking_secure / create_multi_booking_secure previously mapped all
-- exclusion_violation → ROOM_NOT_AVAILABLE (confusing for front desk).
-- ============================================================================

SET search_path = public;

CREATE OR REPLACE FUNCTION public.map_booking_exclusion_error(
  p_sqlerrm text,
  p_room_id uuid DEFAULT NULL,
  p_check_in timestamptz DEFAULT NULL,
  p_check_out timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_hold_expires_at timestamptz;
BEGIN
  IF p_sqlerrm LIKE '%ROOM_HELD_BY_CHECKOUT%' THEN
    IF p_room_id IS NOT NULL
       AND p_check_in IS NOT NULL
       AND p_check_out IS NOT NULL
    THEN
      SELECT cs.expires_at
      INTO v_hold_expires_at
      FROM public.checkout_session_rooms csr
      JOIN public.checkout_sessions cs ON cs.id = csr.session_id
      WHERE csr.room_id = p_room_id
        AND csr.status = 'holding'
        AND cs.status = 'pending'
        AND cs.expires_at > now()
        AND tstzrange(csr.check_in, csr.check_out, '[)')
            && tstzrange(p_check_in, p_check_out, '[)')
      ORDER BY cs.expires_at ASC
      LIMIT 1;
    END IF;

    RETURN json_build_object(
      'ok', false,
      'error_code', 'ROOM_HELD_BY_CHECKOUT',
      'hold_expires_at', v_hold_expires_at
    );
  END IF;

  RETURN json_build_object('ok', false, 'error_code', 'ROOM_NOT_AVAILABLE');
END;
$$;

GRANT EXECUTE ON FUNCTION public.map_booking_exclusion_error(text, uuid, timestamptz, timestamptz)
  TO authenticated, service_role;

-- ============================================================================
-- create_booking_secure (same as 20260725130000 + hold-aware exclusion mapping)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_booking_secure(
  p_customer_id uuid,
  p_room_id uuid,
  p_check_in timestamptz,
  p_check_out timestamptz,
  p_number_of_nights integer,
  p_total_amount numeric,
  p_payment_method text DEFAULT 'pay_at_hotel',
  p_total_guests integer DEFAULT 1,
  p_notes text DEFAULT NULL,
  p_advance_payment numeric DEFAULT 0,
  p_final_amount numeric DEFAULT NULL,
  p_voucher_code text DEFAULT NULL,
  p_branch_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_booking_code text;
  v_room_charge numeric;
  v_final_amount numeric;
  v_discount numeric := 0;
  v_voucher_id uuid := NULL;
  v_voucher vouchers%ROWTYPE;
  v_now timestamptz := now();
  v_user_id uuid := auth.uid();
  v_branch_id uuid;
  v_room_branch uuid;
  v_payment_expires_at timestamptz := NULL;
BEGIN
  v_branch_id := public.resolve_booking_branch_id(p_branch_code, p_room_id, p_customer_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = p_customer_id AND c.deleted_at IS NULL
  ) THEN
    RETURN json_build_object('ok', false, 'error_code', 'CUSTOMER_NOT_FOUND');
  END IF;

  SELECT r.branch_id INTO v_room_branch FROM public.rooms r WHERE r.id = p_room_id;
  IF v_room_branch IS NULL OR v_room_branch <> v_branch_id THEN
    RETURN json_build_object('ok', false, 'error_code', 'ROOM_BRANCH_MISMATCH');
  END IF;

  IF p_number_of_nights <= 0 THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_NIGHTS');
  END IF;
  IF p_check_out <= p_check_in THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_DATE_RANGE');
  END IF;
  IF p_total_amount < 0 OR p_advance_payment < 0 THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_AMOUNT');
  END IF;

  IF p_payment_method IN ('bank_transfer', 'onepay') AND v_user_id IS NULL THEN
    v_payment_expires_at := v_now + interval '10 minutes';
  END IF;

  IF p_voucher_code IS NOT NULL AND btrim(p_voucher_code) <> '' THEN
    SELECT *
    INTO v_voucher
    FROM public.vouchers
    WHERE deleted_at IS NULL
      AND is_active = true
      AND lower(code) = lower(btrim(p_voucher_code))
      AND (start_at IS NULL OR start_at <= v_now)
      AND (end_at IS NULL OR end_at >= v_now)
      AND (branch_id IS NULL OR branch_id = v_branch_id)
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error_code', 'INVALID_VOUCHER');
    END IF;

    v_voucher_id := v_voucher.id;

    IF v_voucher.discount_type = 'percent' THEN
      v_discount := round((p_total_amount * COALESCE(v_voucher.discount_value, 0)) / 100.0, 2);
    ELSE
      v_discount := round(COALESCE(v_voucher.discount_value, 0), 2);
    END IF;

    IF v_discount < 0 THEN v_discount := 0; END IF;
    IF v_discount > p_total_amount THEN v_discount := p_total_amount; END IF;
    v_final_amount := p_total_amount - v_discount;
  ELSE
    v_final_amount := COALESCE(p_final_amount, p_total_amount);
  END IF;

  IF v_final_amount < 0 THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_AMOUNT');
  END IF;
  IF p_advance_payment > v_final_amount THEN
    RETURN json_build_object('ok', false, 'error_code', 'ADVANCE_EXCEEDS_TOTAL');
  END IF;

  v_booking_code := 'YH' || to_char(v_now, 'YYYYMMDD') || upper(substr(md5(random()::text), 1, 6));

  INSERT INTO public.bookings (
    customer_id, room_id, check_in, check_out, number_of_nights, total_guests,
    status, notes, total_amount, final_amount, advance_payment, booking_code,
    voucher_id, voucher_code, voucher_discount, payment_expires_at,
    created_by, branch_id, created_at
  )
  VALUES (
    p_customer_id, p_room_id, p_check_in, p_check_out, p_number_of_nights, p_total_guests,
    'pending', p_notes, p_total_amount, v_final_amount, p_advance_payment, v_booking_code,
    v_voucher_id,
    CASE WHEN p_voucher_code IS NULL OR btrim(p_voucher_code) = '' THEN NULL ELSE btrim(p_voucher_code) END,
    CASE WHEN v_discount > 0 THEN v_discount ELSE NULL END,
    v_payment_expires_at,
    v_user_id, v_branch_id, v_now
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_rooms (
    booking_id, room_id, check_in, check_out, number_of_nights, amount, status, created_at
  )
  VALUES (
    v_booking_id, p_room_id, p_check_in, p_check_out, p_number_of_nights, p_total_amount, 'pending', v_now
  );

  IF COALESCE(p_advance_payment, 0) > 0 THEN
    INSERT INTO public.payments (booking_id, amount, payment_type, payment_method, payment_status, branch_id, created_at)
    VALUES (v_booking_id, p_advance_payment, 'advance_payment', p_payment_method, 'pending', v_branch_id, v_now);
  END IF;

  v_room_charge := v_final_amount - COALESCE(p_advance_payment, 0);
  IF v_room_charge > 0 THEN
    INSERT INTO public.payments (booking_id, amount, payment_type, payment_method, payment_status, branch_id, created_at)
    VALUES (v_booking_id, v_room_charge, 'room_charge', p_payment_method, 'pending', v_branch_id, v_now);
  END IF;

  RETURN json_build_object(
    'ok', true,
    'booking_id', v_booking_id,
    'branch_id', v_branch_id,
    'voucher_discount', v_discount,
    'final_amount', v_final_amount,
    'payment_expires_at', v_payment_expires_at
  );
EXCEPTION
  WHEN exclusion_violation THEN
    RETURN public.map_booking_exclusion_error(
      SQLERRM,
      p_room_id,
      p_check_in,
      p_check_out
    );
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%BRANCH%' OR SQLERRM LIKE '%INVALID_BRANCH%' OR SQLERRM LIKE '%STAFF_REQUIRES%' THEN
      RETURN json_build_object('ok', false, 'error_code', SQLERRM);
    END IF;
    RAISE;
END;
$$;

-- ============================================================================
-- create_multi_booking_secure (same as 20260725130000 + hold-aware exclusion mapping)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_multi_booking_secure(
  p_customer_id uuid,
  p_room_items jsonb,
  p_check_in timestamptz,
  p_check_out timestamptz,
  p_number_of_nights integer,
  p_total_guests integer DEFAULT 1,
  p_notes text DEFAULT NULL,
  p_payment_method text DEFAULT 'pay_at_hotel',
  p_advance_payment numeric DEFAULT 0,
  p_final_amount numeric DEFAULT NULL,
  p_voucher_code text DEFAULT NULL,
  p_branch_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_booking_code text;
  v_total_amount numeric := 0;
  v_final_amount numeric;
  v_room_charge numeric;
  v_item jsonb;
  v_room_id uuid;
  v_amount numeric;
  v_discount numeric := 0;
  v_voucher_id uuid := NULL;
  v_voucher vouchers%ROWTYPE;
  v_now timestamptz := now();
  v_user_id uuid := auth.uid();
  v_branch_id uuid;
  v_room_branch uuid;
  v_payment_expires_at timestamptz := NULL;
  v_held_room_id uuid;
BEGIN
  v_branch_id := public.resolve_booking_branch_id(p_branch_code, NULL, p_customer_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = p_customer_id AND c.deleted_at IS NULL
  ) THEN
    RETURN json_build_object('ok', false, 'error_code', 'CUSTOMER_NOT_FOUND');
  END IF;

  IF p_number_of_nights <= 0 THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_NIGHTS');
  END IF;
  IF p_check_out <= p_check_in THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_DATE_RANGE');
  END IF;
  IF p_room_items IS NULL OR jsonb_array_length(p_room_items) < 1 THEN
    RETURN json_build_object('ok', false, 'error_code', 'NO_ROOMS');
  END IF;

  IF p_payment_method IN ('bank_transfer', 'onepay') AND v_user_id IS NULL THEN
    v_payment_expires_at := v_now + interval '10 minutes';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_room_items)
  LOOP
    v_room_id := (v_item->>'room_id')::uuid;
    SELECT r.branch_id INTO v_room_branch FROM public.rooms r WHERE r.id = v_room_id;
    IF v_room_branch IS NULL OR v_room_branch <> v_branch_id THEN
      RETURN json_build_object('ok', false, 'error_code', 'ROOM_BRANCH_MISMATCH');
    END IF;
    v_total_amount := v_total_amount + (v_item->>'amount')::numeric;
  END LOOP;

  IF v_total_amount <= 0 THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_AMOUNT');
  END IF;

  IF p_voucher_code IS NOT NULL AND btrim(p_voucher_code) <> '' THEN
    SELECT *
    INTO v_voucher
    FROM public.vouchers
    WHERE deleted_at IS NULL AND is_active = true
      AND lower(code) = lower(btrim(p_voucher_code))
      AND (start_at IS NULL OR start_at <= v_now)
      AND (end_at IS NULL OR end_at >= v_now)
      AND (branch_id IS NULL OR branch_id = v_branch_id)
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error_code', 'INVALID_VOUCHER');
    END IF;

    v_voucher_id := v_voucher.id;
    IF v_voucher.discount_type = 'percent' THEN
      v_discount := round((v_total_amount * COALESCE(v_voucher.discount_value, 0)) / 100.0, 2);
    ELSE
      v_discount := round(COALESCE(v_voucher.discount_value, 0), 2);
    END IF;
    IF v_discount < 0 THEN v_discount := 0; END IF;
    IF v_discount > v_total_amount THEN v_discount := v_total_amount; END IF;
    v_final_amount := v_total_amount - v_discount;
  ELSE
    v_final_amount := COALESCE(p_final_amount, v_total_amount);
  END IF;

  IF v_final_amount <= 0 OR p_advance_payment > v_final_amount THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_AMOUNT');
  END IF;

  v_booking_code := 'YH' || to_char(v_now, 'YYYYMMDD') || upper(substr(md5(random()::text), 1, 6));

  INSERT INTO public.bookings (
    customer_id, room_id, check_in, check_out, number_of_nights, total_guests,
    status, notes, total_amount, final_amount, advance_payment, booking_code,
    voucher_id, voucher_code, voucher_discount, payment_expires_at,
    created_by, branch_id, created_at
  )
  VALUES (
    p_customer_id, NULL, p_check_in, p_check_out, p_number_of_nights, p_total_guests,
    'pending', p_notes, v_total_amount, v_final_amount, p_advance_payment, v_booking_code,
    v_voucher_id,
    CASE WHEN p_voucher_code IS NULL OR btrim(p_voucher_code) = '' THEN NULL ELSE btrim(p_voucher_code) END,
    CASE WHEN v_discount > 0 THEN v_discount ELSE NULL END,
    v_payment_expires_at,
    v_user_id, v_branch_id, v_now
  )
  RETURNING id INTO v_booking_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_room_items)
  LOOP
    v_room_id := (v_item->>'room_id')::uuid;
    v_amount := (v_item->>'amount')::numeric;
    IF v_room_id IS NOT NULL AND v_amount > 0 THEN
      INSERT INTO public.booking_rooms (
        booking_id, room_id, check_in, check_out, number_of_nights, amount, status, created_at
      )
      VALUES (
        v_booking_id, v_room_id, p_check_in, p_check_out, p_number_of_nights, v_amount, 'pending', v_now
      );
    END IF;
  END LOOP;

  IF COALESCE(p_advance_payment, 0) > 0 THEN
    INSERT INTO public.payments (booking_id, amount, payment_type, payment_method, payment_status, branch_id, created_at)
    VALUES (v_booking_id, p_advance_payment, 'advance_payment', p_payment_method, 'pending', v_branch_id, v_now);
  END IF;

  v_room_charge := v_final_amount - COALESCE(p_advance_payment, 0);
  IF v_room_charge > 0 THEN
    INSERT INTO public.payments (booking_id, amount, payment_type, payment_method, payment_status, branch_id, created_at)
    VALUES (v_booking_id, v_room_charge, 'room_charge', p_payment_method, 'pending', v_branch_id, v_now);
  END IF;

  RETURN json_build_object(
    'ok', true,
    'booking_id', v_booking_id,
    'booking_code', v_booking_code,
    'branch_id', v_branch_id,
    'voucher_discount', v_discount,
    'final_amount', v_final_amount,
    'payment_expires_at', v_payment_expires_at
  );
EXCEPTION
  WHEN exclusion_violation THEN
    -- Prefer the room that actually hit the hold (last attempted insert room_id).
    v_held_room_id := v_room_id;
    RETURN public.map_booking_exclusion_error(
      SQLERRM,
      v_held_room_id,
      p_check_in,
      p_check_out
    );
  WHEN OTHERS THEN RAISE;
END;
$$;
