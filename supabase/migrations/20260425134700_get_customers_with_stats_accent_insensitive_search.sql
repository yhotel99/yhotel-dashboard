-- Enable accent-insensitive search for customers list
-- So "Nguyen" can match "Nguyễn" and vice versa.

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION get_customers_with_stats(
  p_search text,
  p_from int,
  p_to int
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
  created_at timestamptz,
  updated_at timestamptz,
  total_bookings bigint,
  total_spent numeric,
  total_refunded numeric,
  total_count bigint
)
LANGUAGE sql
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
    c.created_at,
    c.updated_at,

    -- total bookings (count completed bookings only)
    (
      SELECT count(*)
      FROM bookings b
      WHERE b.customer_id = c.id
        AND b.deleted_at IS NULL
        AND b.status IN ('confirmed', 'checked_in', 'checked_out')
    ) AS total_bookings,

    -- total spent (sum of all paid payments)
    (
      SELECT coalesce(sum(p.amount), 0)
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      WHERE b.customer_id = c.id
        AND p.payment_status = 'paid'
    ) AS total_spent,

    -- total refunded (sum of all refunded amounts)
    (
      SELECT coalesce(sum(r.amount), 0)
      FROM refund_requests r
      WHERE r.customer_id = c.id
        AND r.status = 'refunded'
    ) AS total_refunded,

    -- total count for pagination (same value for all rows)
    count(*) OVER() AS total_count
  FROM customers c
  CROSS JOIN params p
  WHERE c.deleted_at IS NULL
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
