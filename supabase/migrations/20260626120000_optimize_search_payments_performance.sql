-- search_payments: filter + paginate payment IDs first, enrich rooms only for the page.
-- Fixes statement timeout caused by pre-aggregating all booking_rooms on every list request.

SET search_path = public;

CREATE INDEX IF NOT EXISTS idx_payments_created_at
  ON public.payments (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_paid_at
  ON public.payments (paid_at DESC)
  WHERE paid_at IS NOT NULL;

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
  WITH matching AS (
    SELECT DISTINCT p.id
    FROM public.payments p
    LEFT JOIN public.bookings b ON b.id = p.booking_id AND b.deleted_at IS NULL
    LEFT JOIN public.customers c ON c.id = b.customer_id AND c.deleted_at IS NULL
    WHERE
      (
        public.is_branch_admin_or_manager()
        AND (
          p_branch_id IS NULL
          OR COALESCE(p.branch_id, b.branch_id) = p_branch_id
        )
        OR (
          NOT public.is_branch_admin_or_manager()
          AND COALESCE(p.branch_id, b.branch_id) = public.current_profile_branch_id()
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
