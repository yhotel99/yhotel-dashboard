-- Optimize payments listing to one RPC call with total_count and extended filters.
-- Supports filters: payment_status, payment_type, and one date range selected by date field.

DROP FUNCTION IF EXISTS public.search_payments(text, integer, integer, uuid, uuid);
DROP FUNCTION IF EXISTS public.search_payments(
  text, integer, integer, uuid, uuid, public.payment_status_enum, text, text, timestamptz, timestamptz
);
DROP FUNCTION IF EXISTS public.search_payments(
  text, integer, integer, uuid, uuid, public.payment_status_enum, text, timestamptz, timestamptz, timestamptz, timestamptz
);
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
  p_date_to timestamptz DEFAULT NULL
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
  customers jsonb,
  rooms jsonb,
  total_count bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH booking_room_info AS (
    SELECT
      br.booking_id,
      jsonb_build_object(
        'name', string_agg(r.name, ', ' ORDER BY r.name),
        'items',
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'id', r.id::text,
              'name', r.name
            )
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
      jsonb_build_object(
        'full_name', c.full_name,
        'phone', c.phone
      ) AS customers,
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
      (p_customer_id IS NULL OR b.customer_id = p_customer_id)
      AND (p_booking_id IS NULL OR p.booking_id = p_booking_id)
      AND (p_payment_status IS NULL OR p.payment_status = p_payment_status)
      AND (p_payment_type IS NULL OR p.payment_type = p_payment_type)
      AND (
        p_date_field IS NULL
        OR p_date_field = 'created_at'
        OR p_date_field = 'paid_at'
      )
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
    SELECT
      base.*,
      count(*) OVER() AS total_count
    FROM base
  )
  SELECT *
  FROM counted
  ORDER BY created_at DESC
  OFFSET (p_page - 1) * p_limit
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_payments(
  text, integer, integer, uuid, uuid, public.payment_status_enum, text, text, timestamptz, timestamptz
) TO anon;
GRANT EXECUTE ON FUNCTION public.search_payments(
  text, integer, integer, uuid, uuid, public.payment_status_enum, text, text, timestamptz, timestamptz
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_payments(
  text, integer, integer, uuid, uuid, public.payment_status_enum, text, text, timestamptz, timestamptz
) TO service_role;
