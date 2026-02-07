-- Migration: search_payments + count_payments lấy tên phòng từ booking_rooms
-- Đơn nhiều phòng có booking.room_id = NULL nên JOIN rooms r ON r.id = b.room_id không trả về tên phòng.

-- ============================================================================
-- 1. search_payments: rooms = aggregate tên phòng từ booking_rooms
-- ============================================================================
CREATE OR REPLACE FUNCTION public.search_payments(
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

COMMENT ON FUNCTION public.search_payments(text, integer, integer, uuid, uuid) IS
  'Tìm thanh toán; rooms lấy từ booking_rooms (hỗ trợ đơn nhiều phòng).';

-- ============================================================================
-- 2. count_payments: tìm theo tên phòng qua booking_rooms
-- ============================================================================
CREATE OR REPLACE FUNCTION public.count_payments(
  p_search text DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_booking_id uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::bigint
  FROM public.payments p
  LEFT JOIN public.bookings b ON b.id = p.booking_id AND b.deleted_at IS NULL
  LEFT JOIN public.customers c ON c.id = b.customer_id AND c.deleted_at IS NULL
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
    );
$$;

COMMENT ON FUNCTION public.count_payments(text, uuid, uuid) IS
  'Đếm thanh toán; tìm theo tên phòng qua booking_rooms.';

-- Grants (giữ như cũ)
GRANT EXECUTE ON FUNCTION public.search_payments(text, integer, integer, uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.search_payments(text, integer, integer, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_payments(text, integer, integer, uuid, uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.count_payments(text, uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.count_payments(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_payments(text, uuid, uuid) TO service_role;
