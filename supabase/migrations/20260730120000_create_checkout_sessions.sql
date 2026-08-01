-- ============================================================================
-- Checkout sessions: hold rooms during online payment; insert bookings only after pay
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- Tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_code text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  branch_code text,
  check_in timestamptz NOT NULL,
  check_out timestamptz NOT NULL,
  number_of_nights integer NOT NULL DEFAULT 1,
  total_guests integer NOT NULL DEFAULT 1,
  notes text,
  total_amount numeric(14,2) NOT NULL,
  final_amount numeric(14,2) NOT NULL,
  voucher_id uuid,
  voucher_code text,
  voucher_discount numeric(14,2),
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  expires_at timestamptz NOT NULL,
  booking_id uuid REFERENCES public.bookings(id),
  failure_reason text,
  guest_name text,
  guest_email text,
  guest_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_payment_code
  ON public.checkout_sessions (payment_code);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status_expires
  ON public.checkout_sessions (status, expires_at)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.checkout_session_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.checkout_sessions(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id),
  check_in timestamptz NOT NULL,
  check_out timestamptz NOT NULL,
  number_of_nights integer NOT NULL DEFAULT 1,
  amount numeric(14,2) NOT NULL,
  -- holding = active hold; released = no longer blocking inventory
  status text NOT NULL DEFAULT 'holding'
    CHECK (status IN ('holding', 'released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_checkout_session_rooms_session
  ON public.checkout_session_rooms (session_id);
CREATE INDEX IF NOT EXISTS idx_checkout_session_rooms_room_time
  ON public.checkout_session_rooms
  USING GIST (room_id, tstzrange(check_in, check_out, '[)'));

ALTER TABLE public.checkout_session_rooms
  DROP CONSTRAINT IF EXISTS no_room_overlap_checkout_session_rooms;

ALTER TABLE public.checkout_session_rooms
  ADD CONSTRAINT no_room_overlap_checkout_session_rooms
  EXCLUDE USING GIST (
    room_id WITH =,
    tstzrange(check_in, check_out, '[)') WITH &&
  )
  WHERE (status = 'holding');

-- ============================================================================
-- Cross-table hold: booking_rooms cannot steal active checkout holds
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_booking_over_checkout_hold()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('pending', 'awaiting_payment', 'confirmed', 'checked_in')
     AND EXISTS (
       SELECT 1
       FROM public.checkout_session_rooms csr
       JOIN public.checkout_sessions cs ON cs.id = csr.session_id
       WHERE csr.room_id = NEW.room_id
         AND csr.status = 'holding'
         AND cs.status = 'pending'
         AND cs.expires_at > now()
         AND tstzrange(csr.check_in, csr.check_out, '[)')
             && tstzrange(NEW.check_in, NEW.check_out, '[)')
     )
  THEN
    RAISE EXCEPTION 'ROOM_HELD_BY_CHECKOUT'
      USING ERRCODE = 'exclusion_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_booking_over_checkout_hold ON public.booking_rooms;
CREATE TRIGGER trg_prevent_booking_over_checkout_hold
  BEFORE INSERT OR UPDATE OF room_id, check_in, check_out, status
  ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_booking_over_checkout_hold();

-- ============================================================================
-- Cross-table hold: checkout cannot hold over existing bookings
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_checkout_over_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'holding'
     AND EXISTS (
       SELECT 1
       FROM public.booking_rooms br
       WHERE br.room_id = NEW.room_id
         AND br.status IN ('pending', 'awaiting_payment', 'confirmed', 'checked_in')
         AND tstzrange(br.check_in, br.check_out, '[)')
             && tstzrange(NEW.check_in, NEW.check_out, '[)')
     )
  THEN
    RAISE EXCEPTION 'ROOM_NOT_AVAILABLE'
      USING ERRCODE = 'exclusion_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_checkout_over_booking ON public.checkout_session_rooms;
CREATE TRIGGER trg_prevent_checkout_over_booking
  BEFORE INSERT OR UPDATE OF room_id, check_in, check_out, status
  ON public.checkout_session_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_checkout_over_booking();

-- ============================================================================
-- get_available_rooms: also exclude active checkout holds
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_available_rooms(timestamptz, timestamptz);

CREATE FUNCTION public.get_available_rooms(
  p_check_in timestamptz,
  p_check_out timestamptz
)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  room_type public.room_type_enum,
  category_code text,
  price_per_night numeric,
  max_guests integer,
  amenities jsonb,
  status public.room_status_enum,
  room_number text,
  floor_number integer,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.id,
    r.name,
    r.description,
    r.room_type,
    r.category_code,
    r.price_per_night,
    r.max_guests,
    r.amenities,
    r.status,
    r.room_number,
    r.floor_number,
    r.deleted_at,
    r.created_at,
    r.updated_at
  FROM public.rooms r
  WHERE r.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.booking_rooms br
      WHERE br.room_id = r.id
        AND br.status IN ('pending', 'awaiting_payment', 'confirmed', 'checked_in')
        AND tstzrange(br.check_in, br.check_out, '[)') && tstzrange(p_check_in, p_check_out, '[)')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.checkout_session_rooms csr
      JOIN public.checkout_sessions cs ON cs.id = csr.session_id
      WHERE csr.room_id = r.id
        AND csr.status = 'holding'
        AND cs.status = 'pending'
        AND cs.expires_at > now()
        AND tstzrange(csr.check_in, csr.check_out, '[)') && tstzrange(p_check_in, p_check_out, '[)')
    )
  ORDER BY r.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_rooms(timestamptz, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_rooms(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_rooms(timestamptz, timestamptz) TO service_role;

-- ============================================================================
-- Expire pending checkout sessions (release holds)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.expire_checkout_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH expired AS (
    UPDATE public.checkout_sessions
    SET status = 'expired',
        updated_at = now()
    WHERE status = 'pending'
      AND expires_at <= now()
    RETURNING id
  )
  SELECT count(*)::integer INTO v_count FROM expired;

  UPDATE public.checkout_session_rooms csr
  SET status = 'released'
  FROM public.checkout_sessions cs
  WHERE csr.session_id = cs.id
    AND cs.status = 'expired'
    AND csr.status = 'holding';

  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_checkout_sessions() TO service_role;

-- ============================================================================
-- Finalize: create confirmed booking after successful payment
-- ============================================================================
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
  -- Phase 1: collect resolved room ids before any mutation
  v_room_mappings uuid[][] := '{}';
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
  -- Collect (original_room_id, resolved_room_id) for every row.
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

    v_room_mappings := array_append(v_room_mappings, ARRAY[v_room.id, v_resolved_room_id]);

    IF v_primary_room_id IS NULL THEN
      v_primary_room_id := v_resolved_room_id;
    END IF;
  END LOOP;

  -- =========================================================================
  -- PHASE 2: All rooms resolved — now release holds and insert
  -- =========================================================================
  FOR v_idx IN 1..array_length(v_room_mappings, 1)
  LOOP
    UPDATE public.checkout_session_rooms
    SET status = 'released',
        room_id = v_room_mappings[v_idx][2]
    WHERE id = v_room_mappings[v_idx][1];
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

    FOR v_idx IN 1..array_length(v_room_mappings, 1)
    LOOP
      SELECT *
      INTO v_room
      FROM public.checkout_session_rooms
      WHERE id = v_room_mappings[v_idx][1];

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
        v_room_mappings[v_idx][2],
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

-- RLS: service role bypasses; allow anon read own session by id is via API service key
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_session_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS checkout_sessions_service_all ON public.checkout_sessions;
CREATE POLICY checkout_sessions_service_all ON public.checkout_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS checkout_session_rooms_service_all ON public.checkout_session_rooms;
CREATE POLICY checkout_session_rooms_service_all ON public.checkout_session_rooms
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.checkout_sessions IS
  'Online checkout intent before payment. Bookings are created only after successful payment via finalize_checkout_session.';
