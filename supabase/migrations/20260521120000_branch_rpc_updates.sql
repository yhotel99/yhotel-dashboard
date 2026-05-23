-- Multi-branch: RPC updates, room_status_view, qr upsert, booking lifecycle checks

SET search_path = public;

-- ============================================================================
-- Branch scope predicate (inline in RPCs)
-- staff: current branch only; admin/manager: all or optional p_branch_id filter
-- ============================================================================

-- ============================================================================
-- list_bookings_json (+ p_branch_id)
-- ============================================================================

DROP FUNCTION IF EXISTS public.list_bookings_json(
  text, integer, integer, uuid, uuid, text, date, date, text, timestamptz, uuid
);

CREATE OR REPLACE FUNCTION public.list_bookings_json(
  p_search text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 10,
  p_customer_id uuid DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_date_field text DEFAULT 'created_at',
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      trim(p_search) AS raw_search,
      CASE
        WHEN p_search IS NULL OR trim(p_search) = '' THEN NULL
        ELSE unaccent(lower(trim(p_search)))
      END AS normalized_search,
      CASE
        WHEN p_date_field IN ('created_at', 'check_in') THEN p_date_field
        ELSE 'created_at'
      END AS normalized_date_field
  ),
  matching AS (
    SELECT DISTINCT b.id
    FROM public.bookings b
    LEFT JOIN public.customers c ON c.id = b.customer_id AND c.deleted_at IS NULL
    LEFT JOIN public.booking_rooms br ON br.booking_id = b.id
    LEFT JOIN public.rooms r ON r.id = br.room_id AND r.deleted_at IS NULL
    CROSS JOIN params p
    WHERE b.deleted_at IS NULL
      AND (p_customer_id IS NULL OR b.customer_id = p_customer_id)
      AND (p_created_by IS NULL OR b.created_by = p_created_by)
      AND (
        public.is_branch_admin_or_manager()
        AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
        OR (
          NOT public.is_branch_admin_or_manager()
          AND b.branch_id = public.current_profile_branch_id()
        )
      )
      AND (
        p_status IS NULL
        OR trim(p_status) = ''
        OR b.status = trim(p_status)::public.booking_status
      )
      AND (
        p_date_from IS NULL
        OR (
          CASE
            WHEN p.normalized_date_field = 'check_in' THEN (b.check_in AT TIME ZONE 'UTC')::date
            ELSE (b.created_at AT TIME ZONE 'UTC')::date
          END
        ) >= p_date_from
      )
      AND (
        p_date_to IS NULL
        OR (
          CASE
            WHEN p.normalized_date_field = 'check_in' THEN (b.check_in AT TIME ZONE 'UTC')::date
            ELSE (b.created_at AT TIME ZONE 'UTC')::date
          END
        ) <= p_date_to
      )
      AND (
        p.normalized_search IS NULL
        OR unaccent(lower(coalesce(b.booking_code, ''))) LIKE '%' || p.normalized_search || '%'
        OR unaccent(lower(coalesce(c.full_name, ''))) LIKE '%' || p.normalized_search || '%'
        OR unaccent(lower(coalesce(r.name, ''))) LIKE '%' || p.normalized_search || '%'
        OR unaccent(lower(coalesce(r.room_number, ''))) LIKE '%' || p.normalized_search || '%'
        OR unaccent(lower(coalesce(b.notes, ''))) LIKE '%' || p.normalized_search || '%'
      )
  ),
  total_cte AS (
    SELECT count(*)::bigint AS n FROM matching
  ),
  page_booking AS (
    SELECT b.id, b.created_at
    FROM public.bookings b
    INNER JOIN matching m ON m.id = b.id
    WHERE (
      p_cursor_created_at IS NULL
      OR p_cursor_id IS NULL
      OR b.created_at < p_cursor_created_at
      OR (b.created_at = p_cursor_created_at AND b.id < p_cursor_id)
    )
    ORDER BY b.created_at DESC, b.id DESC
    OFFSET (
      CASE
        WHEN p_cursor_created_at IS NOT NULL AND p_cursor_id IS NOT NULL THEN 0
        ELSE GREATEST(0, (p_page - 1) * p_limit)
      END
    )
    LIMIT p_limit
  )
  SELECT jsonb_build_object(
    'items',
    COALESCE(
      (
        SELECT jsonb_agg(x.item ORDER BY x.created_at DESC, x.id DESC)
        FROM (
          SELECT
            pb.id,
            pb.created_at,
            (
              to_jsonb(b) ||
              jsonb_build_object(
                'customers', jsonb_build_object(
                  'full_name', c.full_name,
                  'phone', c.phone
                ),
                'created_by_profile', CASE
                  WHEN cp.id IS NULL THEN NULL
                  ELSE jsonb_build_object('full_name', cp.full_name)
                END,
                'rooms', COALESCE(
                  (
                    SELECT jsonb_build_object(
                      'name', string_agg(r2.name, ', ' ORDER BY r2.name),
                      'items', jsonb_agg(
                        jsonb_build_object(
                          'id', r2.id,
                          'name', r2.name,
                          'room_number', r2.room_number,
                          'floor_number', r2.floor_number
                        )
                        ORDER BY r2.name
                      )
                    )
                    FROM public.booking_rooms br2
                    JOIN public.rooms r2 ON r2.id = br2.room_id AND r2.deleted_at IS NULL
                    WHERE br2.booking_id = b.id
                  ),
                  '{}'::jsonb
                )
              )
            ) AS item
          FROM page_booking pb
          JOIN public.bookings b ON b.id = pb.id
          LEFT JOIN public.customers c ON c.id = b.customer_id AND c.deleted_at IS NULL
          LEFT JOIN public.profiles cp ON cp.id = b.created_by
        ) x
      ),
      '[]'::jsonb
    ),
    'total',
    (SELECT n FROM total_cte),
    'next_cursor',
    CASE
      WHEN (SELECT count(*)::bigint FROM page_booking) = 0 THEN NULL
      WHEN (p_cursor_created_at IS NOT NULL AND p_cursor_id IS NOT NULL)
           AND (SELECT count(*)::bigint FROM page_booking) < p_limit::bigint
      THEN NULL
      WHEN (p_cursor_created_at IS NULL OR p_cursor_id IS NULL)
           AND (
             (p_page - 1) * p_limit
             + (SELECT count(*)::bigint FROM page_booking)
           ) >= (SELECT n FROM total_cte)
      THEN NULL
      ELSE (
        SELECT jsonb_build_object(
          'created_at', pb.created_at,
          'id', pb.id
        )
        FROM page_booking pb
        ORDER BY pb.created_at ASC, pb.id ASC
        LIMIT 1
      )
    END
  );
$$;

GRANT EXECUTE ON FUNCTION public.list_bookings_json(
  text, integer, integer, uuid, uuid, text, date, date, text, timestamptz, uuid, uuid
) TO anon, authenticated, service_role;

-- ============================================================================
-- search_bookings_json / count_bookings_json
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_bookings_json(
  p_search text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 10,
  p_customer_id uuid DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_jsonb(b) ||
    jsonb_build_object(
      'customers', jsonb_build_object('full_name', c.full_name, 'phone', c.phone),
      'rooms', jsonb_build_object('name', r.name)
    )
  FROM public.bookings b
  LEFT JOIN public.customers c ON c.id = b.customer_id AND c.deleted_at IS NULL
  LEFT JOIN public.rooms r ON r.id = b.room_id AND r.deleted_at IS NULL
  WHERE b.deleted_at IS NULL
    AND (p_customer_id IS NULL OR b.customer_id = p_customer_id)
    AND (
      public.is_branch_admin_or_manager()
      AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
      OR (
        NOT public.is_branch_admin_or_manager()
        AND b.branch_id = public.current_profile_branch_id()
      )
    )
    AND (
      p_search IS NULL
      OR trim(p_search) = ''
      OR b.booking_code ILIKE '%' || trim(p_search) || '%'
      OR c.full_name ILIKE '%' || trim(p_search) || '%'
      OR r.name ILIKE '%' || trim(p_search) || '%'
      OR b.notes ILIKE '%' || trim(p_search) || '%'
    )
  ORDER BY b.created_at DESC
  OFFSET (p_page - 1) * p_limit
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.count_bookings_json(
  p_search text DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)
  FROM public.bookings b
  LEFT JOIN public.customers c ON c.id = b.customer_id AND c.deleted_at IS NULL
  LEFT JOIN public.rooms r ON r.id = b.room_id AND r.deleted_at IS NULL
  WHERE b.deleted_at IS NULL
    AND (p_customer_id IS NULL OR b.customer_id = p_customer_id)
    AND (
      public.is_branch_admin_or_manager()
      AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
      OR (
        NOT public.is_branch_admin_or_manager()
        AND b.branch_id = public.current_profile_branch_id()
      )
    )
    AND (
      p_search IS NULL
      OR trim(p_search) = ''
      OR b.booking_code ILIKE '%' || trim(p_search) || '%'
      OR c.full_name ILIKE '%' || trim(p_search) || '%'
      OR r.name ILIKE '%' || trim(p_search) || '%'
      OR b.notes ILIKE '%' || trim(p_search) || '%'
    );
$$;

GRANT EXECUTE ON FUNCTION public.search_bookings_json(text, integer, integer, uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_bookings_json(text, uuid, uuid) TO anon, authenticated, service_role;

-- ============================================================================
-- get_available_rooms (+ branch)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_available_rooms(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_available_rooms(timestamptz, timestamptz, uuid);
DROP FUNCTION IF EXISTS public.get_available_rooms(timestamptz, timestamptz, uuid, text);

CREATE FUNCTION public.get_available_rooms(
  p_check_in timestamptz,
  p_check_out timestamptz,
  p_branch_id uuid DEFAULT NULL,
  p_branch_code text DEFAULT NULL
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
  branch_id uuid,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  IF p_branch_id IS NOT NULL THEN
    v_branch_id := p_branch_id;
  ELSIF p_branch_code IS NOT NULL AND trim(p_branch_code) <> '' THEN
    v_branch_id := public.resolve_branch_id_by_code(p_branch_code);
  ELSIF public.is_branch_admin_or_manager() THEN
    v_branch_id := NULL;
  ELSE
    v_branch_id := public.current_profile_branch_id();
  END IF;

  IF v_branch_id IS NULL AND NOT public.is_branch_admin_or_manager() THEN
    RAISE EXCEPTION 'BRANCH_REQUIRED';
  END IF;

  RETURN QUERY
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
    r.branch_id,
    r.deleted_at,
    r.created_at,
    r.updated_at
  FROM public.rooms r
  WHERE r.deleted_at IS NULL
    AND (v_branch_id IS NULL OR r.branch_id = v_branch_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.booking_rooms br
      WHERE br.room_id = r.id
        AND br.status IN ('pending', 'awaiting_payment', 'confirmed', 'checked_in')
        AND tstzrange(br.check_in, br.check_out, '[)') && tstzrange(p_check_in, p_check_out, '[)')
    )
  ORDER BY r.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_rooms(timestamptz, timestamptz, uuid, text) TO anon, authenticated, service_role;

-- ============================================================================
-- get_customers_with_stats (+ branch filter)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_customers_with_stats(text, int, int);

CREATE OR REPLACE FUNCTION public.get_customers_with_stats(
  p_search text,
  p_from int,
  p_to int,
  p_branch_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  id_card text,
  nationality text,
  date_of_birth date,
  customer_type text,
  source text,
  branch_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  total_bookings bigint,
  total_spent numeric,
  total_refunded numeric,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      CASE
        WHEN p_search IS NULL OR trim(p_search) = '' THEN NULL
        ELSE unaccent(lower(trim(p_search)))
      END AS normalized_search
  )
  SELECT
    c.id,
    c.full_name,
    c.email,
    c.phone,
    c.id_card,
    c.nationality,
    c.date_of_birth,
    c.customer_type::text,
    c.source,
    c.branch_id,
    c.created_at,
    c.updated_at,
    (
      SELECT count(*)
      FROM public.bookings b
      WHERE b.customer_id = c.id
        AND b.deleted_at IS NULL
        AND b.status IN ('confirmed', 'checked_in', 'checked_out')
    ) AS total_bookings,
    (
      SELECT coalesce(sum(p.amount), 0)
      FROM public.payments p
      JOIN public.bookings b ON b.id = p.booking_id
      WHERE b.customer_id = c.id
        AND p.payment_status = 'paid'
    ) AS total_spent,
    (
      SELECT coalesce(sum(r.amount), 0)
      FROM public.refund_requests r
      WHERE r.customer_id = c.id
        AND r.status = 'refunded'
    ) AS total_refunded,
    count(*) OVER() AS total_count
  FROM public.customers c
  CROSS JOIN params p
  WHERE c.deleted_at IS NULL
    AND (
      public.is_branch_admin_or_manager()
      AND (p_branch_id IS NULL OR c.branch_id = p_branch_id)
      OR (
        NOT public.is_branch_admin_or_manager()
        AND c.branch_id = public.current_profile_branch_id()
      )
    )
    AND (
      p.normalized_search IS NULL
      OR unaccent(lower(coalesce(c.full_name, ''))) LIKE '%' || p.normalized_search || '%'
      OR unaccent(lower(coalesce(c.email, ''))) LIKE '%' || p.normalized_search || '%'
      OR unaccent(lower(coalesce(c.phone, ''))) LIKE '%' || p.normalized_search || '%'
    )
  ORDER BY c.created_at DESC
  OFFSET p_from
  LIMIT (p_to - p_from + 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_customers_with_stats(text, int, int, uuid) TO anon, authenticated, service_role;

-- ============================================================================
-- search_payments (+ p_branch_id)
-- ============================================================================

DROP FUNCTION IF EXISTS public.search_payments(
  text, integer, integer, uuid, uuid, public.payment_status_enum, text, text, timestamptz, timestamptz
);

CREATE FUNCTION public.search_payments(
  p_search text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 10,
  p_customer_id uuid DEFAULT NULL,
  p_booking_id uuid DEFAULT NULL,
  p_payment_status public.payment_status_enum DEFAULT NULL,
  p_payment_type text DEFAULT NULL,
  p_date_field text DEFAULT 'created_at',
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  booking_id uuid,
  amount numeric,
  payment_method text,
  payment_status public.payment_status_enum,
  reporting_status text,
  paid_at timestamptz,
  verified_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  payment_type text,
  branch_id uuid,
  customers jsonb,
  rooms jsonb,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH booking_room_info AS (
    SELECT
      br.booking_id,
      jsonb_build_object(
        'name', string_agg(r.name, ', ' ORDER BY r.name),
        'items',
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object('id', r.id::text, 'name', r.name)
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'::jsonb
        )
      ) AS rooms
    FROM public.booking_rooms br
    JOIN public.rooms r ON r.id = br.room_id AND r.deleted_at IS NULL
    GROUP BY br.booking_id
  ),
  base AS (
    SELECT
      p.id,
      p.booking_id,
      p.amount,
      p.payment_method::text AS payment_method,
      p.payment_status,
      p.reporting_status,
      p.paid_at,
      p.verified_at,
      p.refunded_at,
      p.created_at,
      p.updated_at,
      p.payment_type,
      p.branch_id,
      jsonb_build_object('full_name', c.full_name, 'phone', c.phone) AS customers,
      COALESCE(
        bri.rooms,
        CASE
          WHEN rs.id IS NOT NULL THEN
            jsonb_build_object(
              'name', rs.name,
              'items', jsonb_build_array(jsonb_build_object('id', rs.id::text, 'name', rs.name))
            )
          ELSE jsonb_build_object('name', '', 'items', '[]'::jsonb)
        END
      ) AS rooms
    FROM public.payments p
    LEFT JOIN public.bookings b ON b.id = p.booking_id AND b.deleted_at IS NULL
    LEFT JOIN public.customers c ON c.id = b.customer_id AND c.deleted_at IS NULL
    LEFT JOIN booking_room_info bri ON bri.booking_id = b.id
    LEFT JOIN public.rooms rs ON rs.id = b.room_id AND rs.deleted_at IS NULL
    WHERE
      (
        public.is_branch_admin_or_manager()
        AND (p_branch_id IS NULL OR p.branch_id = p_branch_id)
        OR (
          NOT public.is_branch_admin_or_manager()
          AND p.branch_id = public.current_profile_branch_id()
        )
      )
      AND (p_customer_id IS NULL OR b.customer_id = p_customer_id)
      AND (p_booking_id IS NULL OR p.booking_id = p_booking_id)
      AND (p_payment_status IS NULL OR p.payment_status = p_payment_status)
      AND (p_payment_type IS NULL OR p.payment_type = p_payment_type)
      AND (
        p_date_from IS NULL
        OR (
          CASE
            WHEN p_date_field = 'paid_at' THEN p.paid_at
            ELSE p.created_at
          END
        ) >= p_date_from
      )
      AND (
        p_date_to IS NULL
        OR (
          CASE
            WHEN p_date_field = 'paid_at' THEN p.paid_at
            ELSE p.created_at
          END
        ) <= p_date_to
      )
      AND (
        p_search IS NULL
        OR trim(p_search) = ''
        OR p.id::text ILIKE '%' || trim(p_search) || '%'
        OR p.booking_id::text ILIKE '%' || trim(p_search) || '%'
        OR c.full_name ILIKE '%' || trim(p_search) || '%'
        OR EXISTS (
          SELECT 1
          FROM public.booking_rooms br2
          JOIN public.rooms r2 ON r2.id = br2.room_id AND r2.deleted_at IS NULL
          WHERE br2.booking_id = b.id
            AND r2.name ILIKE '%' || trim(p_search) || '%'
        )
      )
  ),
  counted AS (
    SELECT base.*, count(*) OVER() AS total_count
    FROM base
  )
  SELECT *
  FROM counted
  ORDER BY created_at DESC
  OFFSET (p_page - 1) * p_limit
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_payments(
  text, integer, integer, uuid, uuid, public.payment_status_enum, text, text, timestamptz, timestamptz, uuid
) TO anon, authenticated, service_role;

-- ============================================================================
-- Booking lifecycle: branch guard
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cancel_booking_secure(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  SELECT b.branch_id INTO v_branch_id
  FROM public.bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF NOT public.can_access_branch(v_branch_id) THEN
    RAISE EXCEPTION 'BRANCH_ACCESS_DENIED';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled'
  WHERE id = p_booking_id;

  UPDATE public.payments
  SET payment_status = 'cancelled'
  WHERE booking_id = p_booking_id
    AND payment_status = 'pending';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'CANCEL_BOOKING_FAILED: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_booking_secure(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  SELECT b.branch_id INTO v_branch_id
  FROM public.bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF NOT public.can_access_branch(v_branch_id) THEN
    RAISE EXCEPTION 'BRANCH_ACCESS_DENIED';
  END IF;

  UPDATE public.bookings
  SET status = 'confirmed'
  WHERE id = p_booking_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'CONFIRM_BOOKING_FAILED: %', SQLERRM;
END;
$$;

-- ============================================================================
-- create_booking_secure / create_multi_booking_secure (+ p_branch_code)
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
  v_customer_branch uuid;
BEGIN
  v_branch_id := public.resolve_booking_branch_id(p_branch_code, p_room_id, p_customer_id);

  SELECT r.branch_id INTO v_room_branch FROM public.rooms r WHERE r.id = p_room_id;
  IF v_room_branch IS NULL OR v_room_branch <> v_branch_id THEN
    RETURN json_build_object('ok', false, 'error_code', 'ROOM_BRANCH_MISMATCH');
  END IF;

  SELECT c.branch_id INTO v_customer_branch FROM public.customers c WHERE c.id = p_customer_id;
  IF v_customer_branch IS NULL OR v_customer_branch <> v_branch_id THEN
    RETURN json_build_object('ok', false, 'error_code', 'CUSTOMER_BRANCH_MISMATCH');
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
    voucher_id, voucher_code, voucher_discount, created_by, branch_id, created_at
  )
  VALUES (
    p_customer_id, p_room_id, p_check_in, p_check_out, p_number_of_nights, p_total_guests,
    'pending', p_notes, p_total_amount, v_final_amount, p_advance_payment, v_booking_code,
    v_voucher_id,
    CASE WHEN p_voucher_code IS NULL OR btrim(p_voucher_code) = '' THEN NULL ELSE btrim(p_voucher_code) END,
    CASE WHEN v_discount > 0 THEN v_discount ELSE NULL END,
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
    'final_amount', v_final_amount
  );
EXCEPTION
  WHEN exclusion_violation THEN
    RETURN json_build_object('ok', false, 'error_code', 'ROOM_NOT_AVAILABLE');
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%BRANCH%' OR SQLERRM LIKE '%INVALID_BRANCH%' OR SQLERRM LIKE '%STAFF_REQUIRES%' THEN
      RETURN json_build_object('ok', false, 'error_code', SQLERRM);
    END IF;
    RAISE;
END;
$$;

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
  v_customer_branch uuid;
BEGIN
  v_branch_id := public.resolve_booking_branch_id(p_branch_code, NULL, p_customer_id);

  SELECT c.branch_id INTO v_customer_branch FROM public.customers c WHERE c.id = p_customer_id;
  IF v_customer_branch IS NULL OR v_customer_branch <> v_branch_id THEN
    RETURN json_build_object('ok', false, 'error_code', 'CUSTOMER_BRANCH_MISMATCH');
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
    voucher_id, voucher_code, voucher_discount, created_by, branch_id, created_at
  )
  VALUES (
    p_customer_id, NULL, p_check_in, p_check_out, p_number_of_nights, p_total_guests,
    'pending', p_notes, v_total_amount, v_final_amount, p_advance_payment, v_booking_code,
    v_voucher_id,
    CASE WHEN p_voucher_code IS NULL OR btrim(p_voucher_code) = '' THEN NULL ELSE btrim(p_voucher_code) END,
    CASE WHEN v_discount > 0 THEN v_discount ELSE NULL END,
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
    'final_amount', v_final_amount
  );
EXCEPTION
  WHEN exclusion_violation THEN
    RETURN json_build_object('ok', false, 'error_code', 'ROOM_NOT_AVAILABLE');
  WHEN OTHERS THEN RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_secure(
  uuid, uuid, timestamptz, timestamptz, integer, numeric, text, integer, text, numeric, numeric, text, text
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_multi_booking_secure(
  uuid, jsonb, timestamptz, timestamptz, integer, integer, text, text, numeric, numeric, text, text
) TO anon, authenticated, service_role;

-- ============================================================================
-- upsert_qr_display_state (per branch)
-- ============================================================================

DROP FUNCTION IF EXISTS public.upsert_qr_display_state(uuid, text, text, text, timestamptz, timestamptz, numeric);
DROP FUNCTION IF EXISTS public.upsert_qr_display_state(uuid, text, text, text, timestamptz, timestamptz, numeric, numeric);
DROP FUNCTION IF EXISTS public.upsert_qr_display_state(uuid, text, text, text, timestamptz, timestamptz, numeric, text);

CREATE OR REPLACE FUNCTION public.upsert_qr_display_state(
  p_booking_id uuid,
  p_booking_code text,
  p_customer_name text,
  p_room_name text,
  p_check_in timestamptz,
  p_check_out timestamptz,
  p_total_amount numeric,
  p_final_amount numeric DEFAULT NULL,
  p_branch_code text DEFAULT 'main'
)
RETURNS public.qr_display_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.qr_display_state;
  v_branch_id uuid;
  v_booking_branch uuid;
BEGIN
  v_branch_id := public.resolve_branch_id_by_code(p_branch_code);
  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_BRANCH_CODE';
  END IF;

  SELECT b.branch_id INTO v_booking_branch
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  IF v_booking_branch IS NULL OR v_booking_branch <> v_branch_id THEN
    RAISE EXCEPTION 'BOOKING_BRANCH_MISMATCH';
  END IF;

  INSERT INTO public.qr_display_state (
    branch_id, booking_id, booking_code, customer_name, room_name,
    check_in, check_out, total_amount, final_amount, updated_at
  )
  VALUES (
    v_branch_id, p_booking_id, p_booking_code, p_customer_name, p_room_name,
    p_check_in, p_check_out, p_total_amount, p_final_amount, now()
  )
  ON CONFLICT (branch_id) WHERE (branch_id IS NOT NULL) DO UPDATE SET
    booking_id = EXCLUDED.booking_id,
    booking_code = EXCLUDED.booking_code,
    customer_name = EXCLUDED.customer_name,
    room_name = EXCLUDED.room_name,
    check_in = EXCLUDED.check_in,
    check_out = EXCLUDED.check_out,
    total_amount = EXCLUDED.total_amount,
    final_amount = EXCLUDED.final_amount,
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_qr_display_state(
  uuid, text, text, text, timestamptz, timestamptz, numeric, numeric, text
) TO anon, authenticated, service_role;

-- ============================================================================
-- room_status_view: expose branch_id on rooms
-- ============================================================================

DROP VIEW IF EXISTS public.room_status_view;
CREATE VIEW public.room_status_view AS
WITH room_active_booking AS (
    SELECT
        r1.id AS r_id,
        b.id,
        b.customer_id,
        br.check_in,
        br.check_out,
        b.number_of_nights,
        b.total_guests,
        b.status,
        b.notes,
        b.total_amount,
        b.final_amount,
        b.advance_payment,
        b.actual_check_in,
        b.actual_check_out,
        b.created_at,
        b.updated_at,
        b.deleted_at,
        b.branch_id AS booking_branch_id,
        row_number() OVER (
            PARTITION BY r1.id
            ORDER BY
                CASE
                    WHEN b.status = 'checked_in'
                        AND now() < (br.check_out - interval '2 hours')
                    THEN 0
                    WHEN b.status = 'checked_in'
                        AND now() >= (br.check_out - interval '2 hours')
                        AND now() < br.check_out
                    THEN 1
                    WHEN b.status = 'checked_in'
                        AND now() >= br.check_out
                    THEN 2
                    WHEN b.status IN ('confirmed','awaiting_payment','pending')
                        AND now() >= (br.check_in - interval '2 hours')
                        AND now() < br.check_in
                    THEN 3
                    WHEN b.status IN ('confirmed','awaiting_payment','pending')
                        AND now() < (br.check_in - interval '2 hours')
                    THEN 4
                    ELSE 99
                END ASC,
                br.check_in ASC
        ) AS rn
    FROM public.rooms r1
    LEFT JOIN public.booking_rooms br ON br.room_id = r1.id
    LEFT JOIN public.bookings b
        ON b.id = br.booking_id
        AND b.deleted_at IS NULL
        AND b.status IN ('pending','awaiting_payment','confirmed','checked_in')
        AND (br.check_out > now() OR b.status = 'checked_in')
)
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
    r.branch_id,
    r.deleted_at,
    r.created_at,
    r.updated_at,
    r.status AS technical_status,
    rab.check_in,
    rab.check_out,
    rab.status AS booking_status,
    rab.id AS booking_id,
    CASE
        WHEN rab.id IS NULL THEN 'vacant'
        WHEN rab.status = 'checked_in'
            AND rab.actual_check_out IS NULL
            AND now() < (rab.check_out - interval '2 hours')
        THEN 'occupied'
        WHEN rab.status = 'checked_in'
            AND rab.actual_check_out IS NULL
            AND now() >= (rab.check_out - interval '2 hours')
            AND now() < rab.check_out
        THEN 'upcoming_checkout'
        WHEN rab.status = 'checked_in'
            AND rab.actual_check_out IS NULL
            AND now() >= rab.check_out
        THEN 'overdue_checkout'
        WHEN rab.status IN ('pending','awaiting_payment','confirmed')
            AND now() >= (rab.check_in - interval '2 hours')
            AND now() < rab.check_in
        THEN 'upcoming_checkin'
        ELSE 'vacant'
    END AS current_status
FROM public.rooms r
LEFT JOIN room_active_booking rab ON r.id = rab.r_id AND rab.rn = 1
WHERE r.deleted_at IS NULL
ORDER BY
    COALESCE(r.floor_number, 0) ASC,
    r.room_number ASC NULLS LAST,
    r.name ASC;

GRANT SELECT ON public.room_status_view TO anon, authenticated, service_role;
