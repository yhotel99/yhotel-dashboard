-- list_bookings_json: mở rộng p_search — khớp thêm số phòng (rooms.room_number).

CREATE OR REPLACE FUNCTION public.list_bookings_json(
  p_search text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 10,
  p_customer_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  WITH matching AS (
    SELECT DISTINCT b.id
    FROM public.bookings b
    LEFT JOIN public.customers c ON c.id = b.customer_id AND c.deleted_at IS NULL
    LEFT JOIN public.booking_rooms br ON br.booking_id = b.id
    LEFT JOIN public.rooms r ON r.id = br.room_id AND r.deleted_at IS NULL
    WHERE b.deleted_at IS NULL
      AND (p_customer_id IS NULL OR b.customer_id = p_customer_id)
      AND (
        p_status IS NULL
        OR trim(p_status) = ''
        OR b.status = trim(p_status)::public.booking_status
      )
      AND (
        p_search IS NULL
        OR trim(p_search) = ''
        OR b.booking_code ILIKE '%' || trim(p_search) || '%'
        OR c.full_name ILIKE '%' || trim(p_search) || '%'
        OR r.name ILIKE '%' || trim(p_search) || '%'
        OR r.room_number ILIKE '%' || trim(p_search) || '%'
        OR b.notes ILIKE '%' || trim(p_search) || '%'
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
                    FROM public.booking_rooms br
                    JOIN public.rooms r2 ON r2.id = br.room_id AND r2.deleted_at IS NULL
                    WHERE br.booking_id = b.id
                  ),
                  '{}'::jsonb
                )
              )
            ) AS item
          FROM page_booking pb
          JOIN public.bookings b ON b.id = pb.id
          LEFT JOIN public.customers c ON c.id = b.customer_id AND c.deleted_at IS NULL
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

ALTER FUNCTION public.list_bookings_json(
  p_search text,
  p_page integer,
  p_limit integer,
  p_customer_id uuid,
  p_status text,
  p_cursor_created_at timestamptz,
  p_cursor_id uuid
) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.list_bookings_json(
  p_search text,
  p_page integer,
  p_limit integer,
  p_customer_id uuid,
  p_status text,
  p_cursor_created_at timestamptz,
  p_cursor_id uuid
) TO anon;

GRANT EXECUTE ON FUNCTION public.list_bookings_json(
  p_search text,
  p_page integer,
  p_limit integer,
  p_customer_id uuid,
  p_status text,
  p_cursor_created_at timestamptz,
  p_cursor_id uuid
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.list_bookings_json(
  p_search text,
  p_page integer,
  p_limit integer,
  p_customer_id uuid,
  p_status text,
  p_cursor_created_at timestamptz,
  p_cursor_id uuid
) TO service_role;
