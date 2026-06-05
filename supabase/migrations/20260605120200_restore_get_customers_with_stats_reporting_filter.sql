-- Restore reporting_status='included' filter for customer stats.
-- Regression introduced by 20260521120000_branch_rpc_updates.sql:
--   total_spent summed paid payments even when reporting_status='excluded'.

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
        AND p.reporting_status = 'included'
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

