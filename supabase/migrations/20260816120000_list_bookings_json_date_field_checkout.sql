-- Extend list_bookings_json date filter with check_out and actual_check_out

SET search_path = public;

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
  p_branch_id uuid DEFAULT NULL,
  p_include_total boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_lim integer := GREATEST(COALESCE(p_limit, 10), 1);
  v_fetch_limit integer;
  v_normalized_search text;
  v_normalized_date_field text;
  v_use_keyset boolean;
  v_offset integer;
  v_result jsonb;
BEGIN
  v_fetch_limit := v_lim + 1;

  IF p_search IS NULL OR trim(p_search) = '' THEN
    v_normalized_search := NULL;
  ELSE
    v_normalized_search := unaccent(lower(trim(p_search)));
  END IF;

  IF p_date_field IN ('created_at', 'check_in', 'check_out', 'actual_check_out') THEN
    v_normalized_date_field := p_date_field;
  ELSE
    v_normalized_date_field := 'created_at';
  END IF;

  v_use_keyset := p_cursor_created_at IS NOT NULL AND p_cursor_id IS NOT NULL;

  IF v_use_keyset THEN
    v_offset := 0;
  ELSE
    v_offset := GREATEST(0, (v_page - 1) * v_lim);
  END IF;

  WITH page_raw AS (
    SELECT b.id, b.created_at
    FROM public.bookings b
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
          CASE v_normalized_date_field
            WHEN 'check_in' THEN (b.check_in AT TIME ZONE 'UTC')::date
            WHEN 'check_out' THEN (b.check_out AT TIME ZONE 'UTC')::date
            WHEN 'actual_check_out' THEN (b.actual_check_out AT TIME ZONE 'UTC')::date
            ELSE (b.created_at AT TIME ZONE 'UTC')::date
          END
        ) >= p_date_from
      )
      AND (
        p_date_to IS NULL
        OR (
          CASE v_normalized_date_field
            WHEN 'check_in' THEN (b.check_in AT TIME ZONE 'UTC')::date
            WHEN 'check_out' THEN (b.check_out AT TIME ZONE 'UTC')::date
            WHEN 'actual_check_out' THEN (b.actual_check_out AT TIME ZONE 'UTC')::date
            ELSE (b.created_at AT TIME ZONE 'UTC')::date
          END
        ) <= p_date_to
      )
      AND (
        v_normalized_search IS NULL
        OR unaccent(lower(coalesce(b.booking_code, ''))) LIKE '%' || v_normalized_search || '%'
        OR unaccent(lower(coalesce(b.notes, ''))) LIKE '%' || v_normalized_search || '%'
        OR EXISTS (
          SELECT 1
          FROM public.customers c
          WHERE c.id = b.customer_id
            AND c.deleted_at IS NULL
            AND unaccent(lower(coalesce(c.full_name, ''))) LIKE '%' || v_normalized_search || '%'
        )
        OR EXISTS (
          SELECT 1
          FROM public.booking_rooms br
          JOIN public.rooms r ON r.id = br.room_id AND r.deleted_at IS NULL
          WHERE br.booking_id = b.id
            AND (
              unaccent(lower(coalesce(r.name, ''))) LIKE '%' || v_normalized_search || '%'
              OR unaccent(lower(coalesce(r.room_number, ''))) LIKE '%' || v_normalized_search || '%'
            )
        )
      )
      AND (
        NOT v_use_keyset
        OR b.created_at < p_cursor_created_at
        OR (b.created_at = p_cursor_created_at AND b.id < p_cursor_id)
      )
    ORDER BY b.created_at DESC, b.id DESC
    OFFSET v_offset
    LIMIT v_fetch_limit
  ),
  page_booking AS (
    SELECT pr.id, pr.created_at
    FROM page_raw pr
    ORDER BY pr.created_at DESC, pr.id DESC
    LIMIT v_lim
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
    CASE
      WHEN NOT p_include_total THEN NULL
      ELSE (
        SELECT count(*)::bigint
        FROM public.bookings b
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
              CASE v_normalized_date_field
                WHEN 'check_in' THEN (b.check_in AT TIME ZONE 'UTC')::date
                WHEN 'check_out' THEN (b.check_out AT TIME ZONE 'UTC')::date
                WHEN 'actual_check_out' THEN (b.actual_check_out AT TIME ZONE 'UTC')::date
                ELSE (b.created_at AT TIME ZONE 'UTC')::date
              END
            ) >= p_date_from
          )
          AND (
            p_date_to IS NULL
            OR (
              CASE v_normalized_date_field
                WHEN 'check_in' THEN (b.check_in AT TIME ZONE 'UTC')::date
                WHEN 'check_out' THEN (b.check_out AT TIME ZONE 'UTC')::date
                WHEN 'actual_check_out' THEN (b.actual_check_out AT TIME ZONE 'UTC')::date
                ELSE (b.created_at AT TIME ZONE 'UTC')::date
              END
            ) <= p_date_to
          )
          AND (
            v_normalized_search IS NULL
            OR unaccent(lower(coalesce(b.booking_code, ''))) LIKE '%' || v_normalized_search || '%'
            OR unaccent(lower(coalesce(b.notes, ''))) LIKE '%' || v_normalized_search || '%'
            OR EXISTS (
              SELECT 1
              FROM public.customers c
              WHERE c.id = b.customer_id
                AND c.deleted_at IS NULL
                AND unaccent(lower(coalesce(c.full_name, ''))) LIKE '%' || v_normalized_search || '%'
            )
            OR EXISTS (
              SELECT 1
              FROM public.booking_rooms br
              JOIN public.rooms r ON r.id = br.room_id AND r.deleted_at IS NULL
              WHERE br.booking_id = b.id
                AND (
                  unaccent(lower(coalesce(r.name, ''))) LIKE '%' || v_normalized_search || '%'
                  OR unaccent(lower(coalesce(r.room_number, ''))) LIKE '%' || v_normalized_search || '%'
                )
            )
          )
      )
    END,
    'next_cursor',
    CASE
      WHEN (SELECT count(*)::bigint FROM page_raw) > v_lim
      THEN (
        SELECT jsonb_build_object(
          'created_at', pb.created_at,
          'id', pb.id
        )
        FROM page_booking pb
        ORDER BY pb.created_at ASC, pb.id ASC
        LIMIT 1
      )
      ELSE NULL
    END
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_bookings_json(
  text, integer, integer, uuid, uuid, text, date, date, text, timestamptz, uuid, uuid, boolean
) TO anon, authenticated, service_role;
