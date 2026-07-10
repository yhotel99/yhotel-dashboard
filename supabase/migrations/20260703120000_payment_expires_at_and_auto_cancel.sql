-- Payment expiry (10 min) for online payment methods + server-side auto-cancel

SET search_path = public;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_expires_pending
  ON public.bookings (payment_expires_at)
  WHERE status = 'pending'::public.booking_status
    AND deleted_at IS NULL
    AND payment_expires_at IS NOT NULL;

-- Backfill existing pending online-payment bookings
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

-- Cancel all pending bookings past payment_expires_at
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
    SELECT id
    FROM public.bookings
    WHERE status = 'pending'::public.booking_status
      AND deleted_at IS NULL
      AND payment_expires_at IS NOT NULL
      AND payment_expires_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.cancel_booking_secure(v_booking_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_expired_pending_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_expired_pending_bookings() TO service_role;

-- Schedule pg_cron when extension is available (Supabase production)
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'cancel-expired-pending-bookings'
    ) THEN
      PERFORM cron.schedule(
        'cancel-expired-pending-bookings',
        '* * * * *',
        $$SELECT public.cancel_expired_pending_bookings()$$
      );
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END;
$outer$;

-- ============================================================================
-- create_booking_secure: set payment_expires_at for online payments (10 min)
-- ============================================================================
DROP FUNCTION IF EXISTS public.create_booking_secure(
  uuid, uuid, timestamptz, timestamptz, integer, numeric, text, integer, text, numeric, numeric, text
) CASCADE;

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
  p_advance_payment numeric DEFAULT 0,
  p_final_amount numeric DEFAULT NULL,
  p_voucher_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
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
  v_payment_expires_at timestamptz := NULL;
BEGIN
  IF p_number_of_nights <= 0 THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_NIGHTS');
  END IF;
  IF p_check_out <= p_check_in THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_DATE_RANGE');
  END IF;
  IF p_total_amount < 0 OR p_advance_payment < 0 THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_AMOUNT');
  END IF;

  IF p_payment_method IN ('bank_transfer', 'onepay') THEN
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

    IF v_discount < 0 THEN
      v_discount := 0;
    END IF;
    IF v_discount > p_total_amount THEN
      v_discount := p_total_amount;
    END IF;

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
    final_amount,
    advance_payment,
    booking_code,
    voucher_id,
    voucher_code,
    voucher_discount,
    payment_expires_at,
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
    v_final_amount,
    p_advance_payment,
    v_booking_code,
    v_voucher_id,
    CASE WHEN p_voucher_code IS NULL OR btrim(p_voucher_code) = '' THEN NULL ELSE btrim(p_voucher_code) END,
    CASE WHEN v_discount > 0 THEN v_discount ELSE NULL END,
    v_payment_expires_at,
    v_now
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO booking_rooms (
    booking_id,
    room_id,
    check_in,
    check_out,
    number_of_nights,
    amount,
    status,
    created_at
  )
  VALUES (
    v_booking_id,
    p_room_id,
    p_check_in,
    p_check_out,
    p_number_of_nights,
    p_total_amount,
    'pending',
    v_now
  );

  IF COALESCE(p_advance_payment, 0) > 0 THEN
    INSERT INTO payments (booking_id, amount, payment_type, payment_method, payment_status, created_at)
    VALUES (v_booking_id, p_advance_payment, 'advance_payment', p_payment_method, 'pending', v_now);
  END IF;

  v_room_charge := v_final_amount - COALESCE(p_advance_payment, 0);
  IF v_room_charge > 0 THEN
    INSERT INTO payments (booking_id, amount, payment_type, payment_method, payment_status, created_at)
    VALUES (v_booking_id, v_room_charge, 'room_charge', p_payment_method, 'pending', v_now);
  END IF;

  RETURN json_build_object(
    'ok', true,
    'booking_id', v_booking_id,
    'voucher_discount', v_discount,
    'final_amount', v_final_amount,
    'payment_expires_at', v_payment_expires_at
  );

EXCEPTION
  WHEN exclusion_violation THEN
    RETURN json_build_object('ok', false, 'error_code', 'ROOM_NOT_AVAILABLE');
  WHEN OTHERS THEN RAISE;
END;
$$;

-- ============================================================================
-- create_multi_booking_secure: set payment_expires_at for online payments
-- ============================================================================
DROP FUNCTION IF EXISTS public.create_multi_booking_secure(
  uuid, jsonb, timestamptz, timestamptz, integer, integer, text, text, numeric, numeric, text
) CASCADE;

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
  p_voucher_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
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
  v_payment_expires_at timestamptz := NULL;
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

  IF p_payment_method IN ('bank_transfer', 'onepay') THEN
    v_payment_expires_at := v_now + interval '10 minutes';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_room_items)
  LOOP
    v_total_amount := v_total_amount + (v_item->>'amount')::numeric;
  END LOOP;

  IF v_total_amount <= 0 THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_AMOUNT');
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

  IF v_final_amount <= 0 THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_AMOUNT');
  END IF;
  IF p_advance_payment > v_final_amount THEN
    RETURN json_build_object('ok', false, 'error_code', 'ADVANCE_EXCEEDS_TOTAL');
  END IF;

  v_booking_code := 'YH' || to_char(v_now, 'YYYYMMDD') || upper(substr(md5(random()::text), 1, 6));

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
    final_amount,
    advance_payment,
    booking_code,
    voucher_id,
    voucher_code,
    voucher_discount,
    payment_expires_at,
    created_at
  )
  VALUES (
    p_customer_id,
    NULL,
    p_check_in,
    p_check_out,
    p_number_of_nights,
    p_total_guests,
    'pending',
    p_notes,
    v_total_amount,
    v_final_amount,
    p_advance_payment,
    v_booking_code,
    v_voucher_id,
    CASE WHEN p_voucher_code IS NULL OR btrim(p_voucher_code) = '' THEN NULL ELSE btrim(p_voucher_code) END,
    CASE WHEN v_discount > 0 THEN v_discount ELSE NULL END,
    v_payment_expires_at,
    v_now
  )
  RETURNING id INTO v_booking_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_room_items)
  LOOP
    v_room_id := (v_item->>'room_id')::uuid;
    v_amount := (v_item->>'amount')::numeric;
    IF v_room_id IS NOT NULL AND v_amount > 0 THEN
      INSERT INTO booking_rooms (
        booking_id,
        room_id,
        check_in,
        check_out,
        number_of_nights,
        amount,
        status,
        created_at
      )
      VALUES (
        v_booking_id,
        v_room_id,
        p_check_in,
        p_check_out,
        p_number_of_nights,
        v_amount,
        'pending',
        v_now
      );
    END IF;
  END LOOP;

  IF COALESCE(p_advance_payment, 0) > 0 THEN
    INSERT INTO payments (booking_id, amount, payment_type, payment_method, payment_status, created_at)
    VALUES (v_booking_id, p_advance_payment, 'advance_payment', p_payment_method, 'pending', v_now);
  END IF;

  v_room_charge := v_final_amount - COALESCE(p_advance_payment, 0);
  IF v_room_charge > 0 THEN
    INSERT INTO payments (booking_id, amount, payment_type, payment_method, payment_status, created_at)
    VALUES (v_booking_id, v_room_charge, 'room_charge', p_payment_method, 'pending', v_now);
  END IF;

  RETURN json_build_object(
    'ok', true,
    'booking_id', v_booking_id,
    'booking_code', v_booking_code,
    'voucher_discount', v_discount,
    'final_amount', v_final_amount,
    'payment_expires_at', v_payment_expires_at
  );

EXCEPTION
  WHEN exclusion_violation THEN
    RETURN json_build_object('ok', false, 'error_code', 'ROOM_NOT_AVAILABLE');
  WHEN OTHERS THEN RAISE;
END;
$$;
