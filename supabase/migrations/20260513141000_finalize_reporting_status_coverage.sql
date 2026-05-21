-- Finalize reporting_status coverage across reporting-related RPCs.
-- This migration ensures no metric-like aggregate continues to count paid-but-excluded rows.

-- 1) Performance index for report queries: paid + included + paid_at range
CREATE INDEX IF NOT EXISTS idx_payments_report_paid_included_paid_at
  ON public.payments (paid_at)
  WHERE payment_status = 'paid'::public.payment_status_enum
    AND reporting_status = 'included';

-- 2) Ensure customer stats "total_spent" follows reporting_status inclusion rule
-- Keep the latest accent-insensitive implementation and add reporting_status filter.
CREATE OR REPLACE FUNCTION public.get_customers_with_stats(
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
    (
      SELECT count(*)
      FROM bookings b
      WHERE b.customer_id = c.id
        AND b.deleted_at IS NULL
        AND b.status IN ('confirmed', 'checked_in', 'checked_out')
    ) AS total_bookings,
    (
      SELECT coalesce(sum(p.amount), 0)
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      WHERE b.customer_id = c.id
        AND p.payment_status = 'paid'
        AND p.reporting_status = 'included'
    ) AS total_spent,
    (
      SELECT coalesce(sum(r.amount), 0)
      FROM refund_requests r
      WHERE r.customer_id = c.id
        AND r.status = 'refunded'
    ) AS total_refunded,
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

-- 3) Re-assert booking payment status rules at DB function layer.
-- Cancel: keep paid, but exclude from reporting.
CREATE OR REPLACE FUNCTION public.cancel_booking_secure(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1 FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled'::public.booking_status
  WHERE id = p_booking_id;

  UPDATE public.payments
  SET payment_status = 'cancelled'::public.payment_status_enum,
      reporting_status = 'excluded'
  WHERE booking_id = p_booking_id
    AND payment_status = 'pending'::public.payment_status_enum;

  UPDATE public.payments
  SET reporting_status = 'excluded'
  WHERE booking_id = p_booking_id
    AND payment_status = 'paid'::public.payment_status_enum;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'CANCEL_BOOKING_FAILED: %', SQLERRM;
END;
$$;

-- Confirm: paid payments must be included in reporting.
CREATE OR REPLACE FUNCTION public.confirm_booking_secure(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1 FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE id = p_booking_id
      AND status IN ('pending'::public.booking_status, 'awaiting_payment'::public.booking_status)
  ) THEN
    RAISE EXCEPTION 'Booking cannot be confirmed in current status';
  END IF;

  UPDATE public.bookings
  SET status = 'confirmed'::public.booking_status
  WHERE id = p_booking_id;

  UPDATE public.payments
  SET payment_status = 'paid'::public.payment_status_enum,
      paid_at = now(),
      reporting_status = 'included'
  WHERE booking_id = p_booking_id
    AND payment_status = 'pending'::public.payment_status_enum;

  UPDATE public.payments
  SET reporting_status = 'included'
  WHERE booking_id = p_booking_id
    AND payment_status = 'paid'::public.payment_status_enum;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'CONFIRM_BOOKING_FAILED: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking_secure(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_secure(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.confirm_booking_secure(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.confirm_booking_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_booking_secure(uuid) TO service_role;

-- 4) Include reporting_status in payment search RPC output for consistency with app types.
DROP FUNCTION IF EXISTS public.search_payments(text, integer, integer, uuid, uuid);

CREATE FUNCTION public.search_payments(
  p_search text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 10,
  p_customer_id uuid DEFAULT NULL,
  p_booking_id uuid DEFAULT NULL
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
  rooms jsonb
)
LANGUAGE sql
STABLE
AS $$
  WITH booking_room_names AS (
    SELECT
      br.booking_id,
      jsonb_build_object('name', string_agg(r.name, ', ' ORDER BY r.name)) AS rooms
    FROM public.booking_rooms br
    JOIN public.rooms r ON r.id = br.room_id AND r.deleted_at IS NULL
    GROUP BY br.booking_id
  )
  SELECT
    p.id,
    p.booking_id,
    p.amount,
    p.payment_method::text,
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
    COALESCE(brn.rooms, jsonb_build_object('name', '')) AS rooms
  FROM public.payments p
  LEFT JOIN public.bookings b ON b.id = p.booking_id AND b.deleted_at IS NULL
  LEFT JOIN public.customers c ON c.id = b.customer_id AND c.deleted_at IS NULL
  LEFT JOIN booking_room_names brn ON brn.booking_id = b.id
  WHERE
    (p_customer_id IS NULL OR b.customer_id = p_customer_id)
    AND (p_booking_id IS NULL OR p.booking_id = p_booking_id)
    AND (
      p_search IS NULL
      OR trim(p_search) = ''
      OR p.id::text ILIKE '%' || trim(p_search) || '%'
      OR p.booking_id::text ILIKE '%' || trim(p_search) || '%'
      OR c.full_name ILIKE '%' || trim(p_search) || '%'
      OR EXISTS (
        SELECT 1
        FROM public.booking_rooms br
        JOIN public.rooms r ON r.id = br.room_id AND r.deleted_at IS NULL
        WHERE br.booking_id = b.id
          AND r.name ILIKE '%' || trim(p_search) || '%'
      )
    )
  ORDER BY p.created_at DESC
  OFFSET (p_page - 1) * p_limit
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_payments(text, integer, integer, uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.search_payments(text, integer, integer, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_payments(text, integer, integer, uuid, uuid) TO service_role;
