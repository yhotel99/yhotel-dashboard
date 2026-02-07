-- Migration: Add booking_rooms table for multi-room booking support
-- 1 booking -> many booking_rooms (1 row per room)
-- Thanh toán 1 lần cho cả đơn (payments vẫn link booking_id)
-- Chuyển constraint no_room_overlap từ bookings sang booking_rooms

-- ============================================================================
-- 1. CREATE BOOKING_ROOMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.booking_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id),
  check_in timestamptz NOT NULL,
  check_out timestamptz NOT NULL,
  number_of_nights integer NOT NULL DEFAULT 1,
  amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(booking_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_rooms_booking_id ON public.booking_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_room_id ON public.booking_rooms(room_id);

-- ============================================================================
-- 2. MIGRATE EXISTING BOOKINGS TO BOOKING_ROOMS
-- ============================================================================
INSERT INTO public.booking_rooms (booking_id, room_id, check_in, check_out, number_of_nights, amount, status, created_at)
SELECT 
  b.id,
  b.room_id,
  b.check_in,
  b.check_out,
  b.number_of_nights,
  b.total_amount,
  b.status::text,
  b.created_at
FROM public.bookings b
WHERE b.room_id IS NOT NULL 
  AND b.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.booking_rooms br WHERE br.booking_id = b.id
  );

-- ============================================================================
-- 3. DROP OLD CONSTRAINT FROM BOOKINGS
-- ============================================================================
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_room_overlap;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;

-- ============================================================================
-- 4. ADD EXCLUSION CONSTRAINT ON BOOKING_ROOMS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_booking_rooms_room_time
ON public.booking_rooms
USING GIST (room_id, tstzrange(check_in, check_out, '[)'));

ALTER TABLE public.booking_rooms
ADD CONSTRAINT no_room_overlap_booking_rooms
EXCLUDE USING GIST (
  room_id WITH =,
  tstzrange(check_in, check_out, '[)') WITH &&
)
WHERE (status IN ('pending','awaiting_payment','confirmed','checked_in'));

-- ============================================================================
-- 5. MAKE ROOM_ID NULLABLE ON BOOKINGS
-- ============================================================================
ALTER TABLE public.bookings ALTER COLUMN room_id DROP NOT NULL;

-- ============================================================================
-- 6. TRIGGER: Sync booking status to booking_rooms
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_booking_rooms_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.booking_rooms 
  SET status = NEW.status::text 
  WHERE booking_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_rooms_status ON public.bookings;
CREATE TRIGGER trg_sync_booking_rooms_status
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE PROCEDURE public.sync_booking_rooms_status();

-- ============================================================================
-- 7. UPDATE search_bookings_json - lấy rooms từ booking_rooms
-- ============================================================================
CREATE OR REPLACE FUNCTION public.search_bookings_json(
  p_search text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 10,
  p_customer_id uuid DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT 
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
            'items', jsonb_agg(jsonb_build_object('id', r2.id, 'name', r2.name) ORDER BY r2.name)
          )
          FROM public.booking_rooms br
          JOIN public.rooms r2 ON r2.id = br.room_id AND r2.deleted_at IS NULL
          WHERE br.booking_id = b.id
        ),
        '{}'::jsonb
      )
    ) AS data
  FROM public.bookings b
  LEFT JOIN public.customers c ON c.id = b.customer_id AND c.deleted_at IS NULL
  LEFT JOIN public.booking_rooms br ON br.booking_id = b.id
  LEFT JOIN public.rooms r ON r.id = br.room_id AND r.deleted_at IS NULL
  WHERE b.deleted_at IS NULL
    AND (p_customer_id IS NULL OR b.customer_id = p_customer_id)
    AND (
      p_search IS NULL
      OR trim(p_search) = ''
      OR b.booking_code ILIKE '%' || trim(p_search) || '%'
      OR c.full_name ILIKE '%' || trim(p_search) || '%'
      OR r.name ILIKE '%' || trim(p_search) || '%'
      OR b.notes ILIKE '%' || trim(p_search) || '%'
    )
  GROUP BY b.id, c.full_name, c.phone
  ORDER BY b.created_at DESC
  OFFSET (p_page - 1) * p_limit
  LIMIT p_limit;
$$;

-- ============================================================================
-- 8. UPDATE room_status_view - dùng booking_rooms thay vì room_id
-- ============================================================================
CREATE OR REPLACE VIEW public.room_status_view AS
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
    b.advance_payment,
    b.actual_check_in,
    b.actual_check_out,
    b.created_at,
    b.updated_at,
    b.deleted_at,
    row_number() OVER (
      PARTITION BY r1.id
      ORDER BY
        CASE
          WHEN b.status = 'checked_in' AND now() >= br.check_in AND now() < (br.check_out - '02:00:00'::interval) THEN 0
          WHEN b.status = 'checked_in' AND now() >= (br.check_out - '02:00:00'::interval) AND now() < br.check_out THEN 1
          WHEN b.status = 'checked_in' AND now() >= br.check_out THEN 2
          WHEN b.status IN ('confirmed','awaiting_payment','pending') AND now() < br.check_in THEN 3
          ELSE 99
        END,
        br.check_in
    ) AS rn
  FROM public.rooms r1
  LEFT JOIN public.booking_rooms br ON br.room_id = r1.id
  LEFT JOIN public.bookings b ON b.id = br.booking_id
    AND b.deleted_at IS NULL
    AND b.status IN ('pending','awaiting_payment','confirmed','checked_in')
    AND (br.check_out > now() OR b.status = 'checked_in' OR br.check_in > now())
)
SELECT
  r.id,
  r.name,
  r.description,
  r.room_type,
  r.price_per_night,
  r.max_guests,
  r.amenities,
  r.status,
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
    WHEN rab.status = 'checked_in' AND now() >= rab.check_in AND now() < (rab.check_out - '02:00:00'::interval) THEN 'occupied'
    WHEN rab.status = 'checked_in' AND now() >= (rab.check_out - '02:00:00'::interval) AND now() < rab.check_out THEN 'upcoming_checkout'
    WHEN rab.status = 'checked_in' AND now() >= rab.check_out THEN 'overdue_checkout'
    WHEN rab.status IN ('pending','awaiting_payment','confirmed') AND now() < rab.check_in THEN 'upcoming_checkin'
    ELSE 'vacant'
  END AS current_status
FROM public.rooms r
LEFT JOIN room_active_booking rab ON r.id = rab.r_id AND rab.rn = 1
WHERE r.deleted_at IS NULL
ORDER BY r.name;

-- ============================================================================
-- 9. UPDATE count_bookings_json - search qua booking_rooms
-- ============================================================================
CREATE OR REPLACE FUNCTION public.count_bookings_json(
  p_search text DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT count(DISTINCT b.id)
  FROM public.bookings b
  LEFT JOIN public.customers c ON c.id = b.customer_id AND c.deleted_at IS NULL
  LEFT JOIN public.booking_rooms br ON br.booking_id = b.id
  LEFT JOIN public.rooms r ON r.id = br.room_id AND r.deleted_at IS NULL
  WHERE b.deleted_at IS NULL
    AND (p_customer_id IS NULL OR b.customer_id = p_customer_id)
    AND (
      p_search IS NULL
      OR trim(p_search) = ''
      OR b.booking_code ILIKE '%' || trim(p_search) || '%'
      OR c.full_name ILIKE '%' || trim(p_search) || '%'
      OR r.name ILIKE '%' || trim(p_search) || '%'
      OR b.notes ILIKE '%' || trim(p_search) || '%'
    );
$$;
