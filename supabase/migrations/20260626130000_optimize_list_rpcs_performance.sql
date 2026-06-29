-- Optimize list RPCs: paginate IDs first, aggregate stats/joins only for the page.
-- Targets: get_customers_with_stats, search_payment_logs; refines search_payments branch filter.

SET search_path = public;

CREATE INDEX IF NOT EXISTS idx_refund_requests_customer_refunded
  ON public.refund_requests (customer_id)
  WHERE status = 'refunded';

-- ============================================================================
-- get_customers_with_stats: stats only for paginated customers
-- ============================================================================

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
  ),
  matching AS (
    SELECT c.id
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
  ),
  total_cte AS (
    SELECT count(*)::bigint AS n
    FROM matching
  ),
  page_customer AS (
    SELECT c.*
    FROM public.customers c
    INNER JOIN matching m ON m.id = c.id
    ORDER BY c.created_at DESC
    OFFSET p_from
    LIMIT (p_to - p_from + 1)
  ),
  booking_stats AS (
    SELECT
      b.customer_id,
      count(*)::bigint AS total_bookings
    FROM public.bookings b
    WHERE b.customer_id IN (SELECT pc.id FROM page_customer pc)
      AND b.deleted_at IS NULL
      AND b.status IN ('confirmed', 'checked_in', 'checked_out')
    GROUP BY b.customer_id
  ),
  payment_stats AS (
    SELECT
      b.customer_id,
      coalesce(sum(p.amount), 0) AS total_spent
    FROM public.payments p
    INNER JOIN public.bookings b ON b.id = p.booking_id
    WHERE b.customer_id IN (SELECT pc.id FROM page_customer pc)
      AND p.payment_status = 'paid'
      AND p.reporting_status = 'included'
    GROUP BY b.customer_id
  ),
  refund_stats AS (
    SELECT
      r.customer_id,
      coalesce(sum(r.amount), 0) AS total_refunded
    FROM public.refund_requests r
    WHERE r.customer_id IN (SELECT pc.id FROM page_customer pc)
      AND r.status = 'refunded'
    GROUP BY r.customer_id
  )
  SELECT
    pc.id,
    pc.full_name,
    pc.email,
    pc.phone,
    pc.id_card,
    pc.nationality,
    pc.date_of_birth,
    pc.customer_type::text,
    pc.source,
    pc.branch_id,
    pc.created_at,
    pc.updated_at,
    coalesce(bs.total_bookings, 0)::bigint AS total_bookings,
    coalesce(ps.total_spent, 0) AS total_spent,
    coalesce(rs.total_refunded, 0) AS total_refunded,
    (SELECT n FROM total_cte) AS total_count
  FROM page_customer pc
  LEFT JOIN booking_stats bs ON bs.customer_id = pc.id
  LEFT JOIN payment_stats ps ON ps.customer_id = pc.id
  LEFT JOIN refund_stats rs ON rs.customer_id = pc.id
  ORDER BY pc.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_customers_with_stats(text, int, int, uuid)
  TO anon, authenticated, service_role;

-- ============================================================================
-- search_payment_logs: paginate first, enrich bookings only for the page
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_payment_logs(
  p_search text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 10,
  p_branch_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  booking_id uuid,
  booking_code character varying,
  transaction_id character varying,
  amount numeric,
  content text,
  bank_code character varying,
  status character varying,
  raw_payload jsonb,
  processed_at timestamptz,
  created_at timestamptz,
  reason text,
  bookings jsonb,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH matching AS (
    SELECT pl.id
    FROM public.payment_logs pl
    LEFT JOIN public.bookings b ON b.id = pl.booking_id AND b.deleted_at IS NULL
    WHERE
      (p_branch_id IS NULL OR (b.id IS NOT NULL AND b.branch_id = p_branch_id))
      AND (
        p_search IS NULL
        OR trim(p_search) = ''
        OR pl.booking_code ILIKE '%' || trim(p_search) || '%'
        OR pl.transaction_id ILIKE '%' || trim(p_search) || '%'
        OR pl.content ILIKE '%' || trim(p_search) || '%'
      )
  ),
  total_cte AS (
    SELECT count(*)::bigint AS n
    FROM matching
  ),
  page_log AS (
    SELECT pl.id, pl.created_at
    FROM public.payment_logs pl
    INNER JOIN matching m ON m.id = pl.id
    ORDER BY pl.created_at DESC, pl.id DESC
    OFFSET GREATEST(0, (p_page - 1) * p_limit)
    LIMIT p_limit
  )
  SELECT
    pl.id,
    pl.booking_id,
    pl.booking_code,
    pl.transaction_id,
    pl.amount,
    pl.content,
    pl.bank_code,
    pl.status,
    pl.raw_payload,
    pl.processed_at,
    pl.created_at,
    pl.reason,
    CASE
      WHEN b.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'branch_id', b.branch_id,
        'customers', jsonb_build_object(
          'full_name', c.full_name,
          'phone', c.phone
        ),
        'rooms', COALESCE(
          (
            SELECT jsonb_build_object(
              'name', string_agg(r2.name, ', ' ORDER BY r2.name),
              'items',
              COALESCE(
                jsonb_agg(
                  DISTINCT jsonb_build_object('id', r2.id::text, 'name', r2.name)
                ) FILTER (WHERE r2.id IS NOT NULL),
                '[]'::jsonb
              )
            )
            FROM public.booking_rooms br
            JOIN public.rooms r2 ON r2.id = br.room_id AND r2.deleted_at IS NULL
            WHERE br.booking_id = b.id
          ),
          CASE
            WHEN rs.id IS NOT NULL THEN
              jsonb_build_object(
                'name', rs.name,
                'items', jsonb_build_array(jsonb_build_object('id', rs.id::text, 'name', rs.name))
              )
            ELSE jsonb_build_object('name', '', 'items', '[]'::jsonb)
          END
        )
      )
    END AS bookings,
    (SELECT n FROM total_cte) AS total_count
  FROM page_log pg
  JOIN public.payment_logs pl ON pl.id = pg.id
  LEFT JOIN public.bookings b ON b.id = pl.booking_id AND b.deleted_at IS NULL
  LEFT JOIN public.customers c ON c.id = b.customer_id AND c.deleted_at IS NULL
  LEFT JOIN public.rooms rs ON rs.id = b.room_id AND rs.deleted_at IS NULL
  ORDER BY pg.created_at DESC, pg.id DESC;
$$;

GRANT EXECUTE ON FUNCTION public.search_payment_logs(text, integer, integer, uuid)
  TO anon, authenticated, service_role;

-- ============================================================================
-- search_payments: branch filter rewrite (index-friendly, same semantics)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_payments(
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
  WITH branch_scope AS (
    SELECT
      public.is_branch_admin_or_manager() AS is_admin,
      public.current_profile_branch_id() AS staff_branch_id
  ),
  matching AS (
    SELECT DISTINCT p.id
    FROM public.payments p
    LEFT JOIN public.bookings b ON b.id = p.booking_id AND b.deleted_at IS NULL
    LEFT JOIN public.customers c ON c.id = b.customer_id AND c.deleted_at IS NULL
    CROSS JOIN branch_scope bs
    WHERE
      (
        bs.is_admin
        AND (
          p_branch_id IS NULL
          OR p.branch_id = p_branch_id
          OR (p.branch_id IS NULL AND b.branch_id = p_branch_id)
        )
        OR (
          NOT bs.is_admin
          AND (
            p.branch_id = bs.staff_branch_id
            OR (p.branch_id IS NULL AND b.branch_id = bs.staff_branch_id)
          )
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
  total_cte AS (
    SELECT count(*)::bigint AS n
    FROM matching
  ),
  page_payment AS (
    SELECT p.id, p.created_at
    FROM public.payments p
    INNER JOIN matching m ON m.id = p.id
    ORDER BY p.created_at DESC, p.id DESC
    OFFSET GREATEST(0, (p_page - 1) * p_limit)
    LIMIT p_limit
  )
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
    COALESCE(p.branch_id, b.branch_id) AS branch_id,
    jsonb_build_object('full_name', c.full_name, 'phone', c.phone) AS customers,
    COALESCE(
      (
        SELECT jsonb_build_object(
          'name', string_agg(r2.name, ', ' ORDER BY r2.name),
          'items',
          COALESCE(
            jsonb_agg(
              DISTINCT jsonb_build_object('id', r2.id::text, 'name', r2.name)
            ) FILTER (WHERE r2.id IS NOT NULL),
            '[]'::jsonb
          )
        )
        FROM public.booking_rooms br
        JOIN public.rooms r2 ON r2.id = br.room_id AND r2.deleted_at IS NULL
        WHERE br.booking_id = b.id
      ),
      CASE
        WHEN rs.id IS NOT NULL THEN
          jsonb_build_object(
            'name', rs.name,
            'items', jsonb_build_array(jsonb_build_object('id', rs.id::text, 'name', rs.name))
          )
        ELSE jsonb_build_object('name', '', 'items', '[]'::jsonb)
      END
    ) AS rooms,
    (SELECT n FROM total_cte) AS total_count
  FROM page_payment pp
  JOIN public.payments p ON p.id = pp.id
  LEFT JOIN public.bookings b ON b.id = p.booking_id AND b.deleted_at IS NULL
  LEFT JOIN public.customers c ON c.id = b.customer_id AND c.deleted_at IS NULL
  LEFT JOIN public.rooms rs ON rs.id = b.room_id AND rs.deleted_at IS NULL
  ORDER BY pp.created_at DESC, pp.id DESC;
$$;

GRANT EXECUTE ON FUNCTION public.search_payments(
  text, integer, integer, uuid, uuid, public.payment_status_enum, text, text, timestamptz, timestamptz, uuid
) TO anon, authenticated, service_role;
