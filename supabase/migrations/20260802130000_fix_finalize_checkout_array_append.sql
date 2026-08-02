-- Fix: finalize_checkout_session crashed with
--   function array_append(uuid[], uuid[]) does not exist
-- Postgres treats uuid[][] as uuid[], so array_append(mappings, ARRAY[a,b])
-- is array_append(uuid[], uuid[]) which has no overload.
-- Use parallel 1D uuid[] arrays instead.

SET search_path = public;

CREATE OR REPLACE FUNCTION public.finalize_checkout_session(
  p_session_id uuid DEFAULT NULL,
  p_payment_code text DEFAULT NULL,
  p_payment_method text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.checkout_sessions%ROWTYPE;
  v_booking_id uuid;
  v_booking_code text;
  v_room public.checkout_session_rooms%ROWTYPE;
  v_resolved_room_id uuid;
  v_alt_room_id uuid;
  v_room_type public.room_type_enum;
  v_category_code text;
  v_primary_room_id uuid := NULL;
  v_now timestamptz := now();
  v_method text;
  v_csr_ids uuid[] := '{}';
  v_resolved_ids uuid[] := '{}';
  v_idx integer;
  v_alt_set uuid[] := '{}';
BEGIN
  IF p_session_id IS NOT NULL THEN
    SELECT * INTO v_session
    FROM public.checkout_sessions
    WHERE id = p_session_id
    FOR UPDATE;
  ELSIF p_payment_code IS NOT NULL AND btrim(p_payment_code) <> '' THEN
    SELECT * INTO v_session
    FROM public.checkout_sessions
    WHERE upper(payment_code) = upper(btrim(p_payment_code))
    FOR UPDATE;
  ELSE
    RETURN json_build_object('ok', false, 'error_code', 'MISSING_SESSION');
  END IF;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error_code', 'SESSION_NOT_FOUND');
  END IF;

  IF v_session.status = 'completed' AND v_session.booking_id IS NOT NULL THEN
    RETURN json_build_object(
      'ok', true,
      'booking_id', v_session.booking_id,
      'payment_code', v_session.payment_code,
      'duplicate', true
    );
  END IF;

  IF v_session.status = 'failed' THEN
    RETURN json_build_object(
      'ok', false,
      'error_code', COALESCE(v_session.failure_reason, 'SESSION_FAILED'),
      'session_id', v_session.id
    );
  END IF;

  -- Allow finalize for pending or expired (money arrived after timeout)
  IF v_session.status NOT IN ('pending', 'expired') THEN
    RETURN json_build_object('ok', false, 'error_code', 'INVALID_SESSION_STATUS', 'status', v_session.status);
  END IF;

  v_method := COALESCE(NULLIF(btrim(COALESCE(p_payment_method, '')), ''), v_session.payment_method);
  v_booking_code := v_session.payment_code;

  -- =========================================================================
  -- PHASE 1: Check all rooms first — NO hold release yet
  -- Collect (csr_id, resolved_room_id) for every row.
  -- =========================================================================
  FOR v_room IN
    SELECT *
    FROM public.checkout_session_rooms
    WHERE session_id = v_session.id
    ORDER BY created_at
  LOOP
    v_resolved_room_id := v_room.room_id;

    -- Check if original room is free against bookings
    IF EXISTS (
      SELECT 1
      FROM public.booking_rooms br
      WHERE br.room_id = v_resolved_room_id
        AND br.status IN ('pending', 'awaiting_payment', 'confirmed', 'checked_in')
        AND tstzrange(br.check_in, br.check_out, '[)')
            && tstzrange(v_room.check_in, v_room.check_out, '[)')
    ) THEN
      SELECT r.room_type, r.category_code
      INTO v_room_type, v_category_code
      FROM public.rooms r
      WHERE r.id = v_room.room_id;

      SELECT r.id
      INTO v_alt_room_id
      FROM public.rooms r
      WHERE r.deleted_at IS NULL
        AND r.status IN ('available', 'clean')
        AND r.id <> v_room.room_id
        AND NOT (r.id = ANY(v_alt_set))
        AND (
          (v_category_code IS NOT NULL AND r.category_code = v_category_code)
          OR (v_category_code IS NULL AND r.room_type = v_room_type)
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.booking_rooms br
          WHERE br.room_id = r.id
            AND br.status IN ('pending', 'awaiting_payment', 'confirmed', 'checked_in')
            AND tstzrange(br.check_in, br.check_out, '[)')
                && tstzrange(v_room.check_in, v_room.check_out, '[)')
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.checkout_session_rooms csr
          JOIN public.checkout_sessions cs ON cs.id = csr.session_id
          WHERE csr.room_id = r.id
            AND csr.status = 'holding'
            AND cs.status = 'pending'
            AND cs.expires_at > now()
            AND cs.id <> v_session.id
            AND tstzrange(csr.check_in, csr.check_out, '[)')
                && tstzrange(v_room.check_in, v_room.check_out, '[)')
        )
      ORDER BY r.name
      LIMIT 1;

      IF v_alt_room_id IS NULL THEN
        -- No mutation happened yet — safe to just return
        UPDATE public.checkout_sessions
        SET status = 'failed',
            failure_reason = 'ROOM_NOT_AVAILABLE',
            updated_at = v_now
        WHERE id = v_session.id;

        RETURN json_build_object(
          'ok', false,
          'error_code', 'ROOM_NOT_AVAILABLE',
          'session_id', v_session.id,
          'payment_code', v_session.payment_code
        );
      END IF;

      v_resolved_room_id := v_alt_room_id;
      v_alt_set := array_append(v_alt_set, v_alt_room_id);
    END IF;

    v_csr_ids := array_append(v_csr_ids, v_room.id);
    v_resolved_ids := array_append(v_resolved_ids, v_resolved_room_id);

    IF v_primary_room_id IS NULL THEN
      v_primary_room_id := v_resolved_room_id;
    END IF;
  END LOOP;

  -- =========================================================================
  -- PHASE 2: All rooms resolved — now release holds and insert
  -- =========================================================================
  FOR v_idx IN 1..coalesce(array_length(v_csr_ids, 1), 0)
  LOOP
    UPDATE public.checkout_session_rooms
    SET status = 'released',
        room_id = v_resolved_ids[v_idx]
    WHERE id = v_csr_ids[v_idx];
  END LOOP;

  BEGIN
    INSERT INTO public.bookings (
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
      v_session.customer_id,
      v_primary_room_id,
      v_session.check_in,
      v_session.check_out,
      v_session.number_of_nights,
      v_session.total_guests,
      'confirmed',
      v_session.notes,
      v_session.total_amount,
      v_session.final_amount,
      0,
      v_booking_code,
      v_session.voucher_id,
      v_session.voucher_code,
      v_session.voucher_discount,
      NULL,
      v_now
    )
    RETURNING id INTO v_booking_id;

    FOR v_idx IN 1..coalesce(array_length(v_csr_ids, 1), 0)
    LOOP
      SELECT *
      INTO v_room
      FROM public.checkout_session_rooms
      WHERE id = v_csr_ids[v_idx];

      INSERT INTO public.booking_rooms (
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
        v_resolved_ids[v_idx],
        v_room.check_in,
        v_room.check_out,
        v_room.number_of_nights,
        v_room.amount,
        'confirmed',
        v_now
      );
    END LOOP;

    INSERT INTO public.payments (
      booking_id,
      amount,
      payment_type,
      payment_method,
      payment_status,
      reporting_status,
      paid_at,
      created_at
    )
    VALUES (
      v_booking_id,
      v_session.final_amount,
      'room_charge',
      v_method,
      'paid',
      'included',
      v_now,
      v_now
    );

  EXCEPTION
    WHEN exclusion_violation THEN
      UPDATE public.checkout_sessions
      SET status = 'failed',
          failure_reason = 'ROOM_NOT_AVAILABLE',
          updated_at = v_now
      WHERE id = v_session.id;

      RETURN json_build_object(
        'ok', false,
        'error_code', 'ROOM_NOT_AVAILABLE',
        'session_id', v_session.id,
        'payment_code', v_session.payment_code
      );
  END;

  UPDATE public.checkout_sessions
  SET status = 'completed',
      booking_id = v_booking_id,
      payment_method = v_method,
      updated_at = v_now,
      failure_reason = NULL
  WHERE id = v_session.id;

  UPDATE public.checkout_session_rooms
  SET status = 'released'
  WHERE session_id = v_session.id
    AND status = 'holding';

  RETURN json_build_object(
    'ok', true,
    'booking_id', v_booking_id,
    'payment_code', v_booking_code,
    'session_id', v_session.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_checkout_session(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_checkout_session(uuid, text, text) TO authenticated;
