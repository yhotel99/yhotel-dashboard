-- ============================================================================
-- Migration: Update get_available_rooms to include room_number and floor_number
-- Created: 2026-02-22
-- Description: Thêm room_number và floor_number vào kết quả trả về của get_available_rooms
-- ============================================================================

-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_available_rooms(timestamptz, timestamptz);

-- Recreate function with new columns
CREATE FUNCTION public.get_available_rooms(
  p_check_in timestamptz,
  p_check_out timestamptz
)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  room_type public.room_type_enum,
  price_per_night numeric,
  max_guests integer,
  amenities jsonb,
  status public.room_status_enum,
  room_number text,
  floor_number integer,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.id,
    r.name,
    r.description,
    r.room_type,
    r.price_per_night,
    r.max_guests,
    r.amenities,
    r.status,
    r.room_number,
    r.floor_number,
    r.deleted_at,
    r.created_at,
    r.updated_at
  FROM public.rooms r
  WHERE r.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.booking_rooms br
      WHERE br.room_id = r.id
        AND br.status IN ('pending', 'awaiting_payment', 'confirmed', 'checked_in')
        AND tstzrange(br.check_in, br.check_out, '[)') && tstzrange(p_check_in, p_check_out, '[)')
    )
  ORDER BY 
    COALESCE(r.floor_number, 0) ASC,
    r.room_number ASC NULLS LAST,
    r.name ASC;
$$;

COMMENT ON FUNCTION public.get_available_rooms(timestamptz, timestamptz) IS
  'Trả về danh sách phòng trống trong khoảng p_check_in -> p_check_out. Dùng booking_rooms và exclusion logic giống constraint no_room_overlap_booking_rooms. Sắp xếp theo tầng và số phòng.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_available_rooms(timestamptz, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_rooms(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_rooms(timestamptz, timestamptz) TO service_role;
