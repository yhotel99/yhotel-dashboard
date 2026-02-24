-- ============================================================================
-- Migration: Update get_available_rooms to include category_code, room_number, floor_number
-- Description: Thêm các trường category_code, room_number, floor_number vào RPC get_available_rooms
-- Date: 2026-02-24
-- ============================================================================

-- Drop existing function first (cannot change return type with CREATE OR REPLACE)
DROP FUNCTION IF EXISTS public.get_available_rooms(timestamptz, timestamptz);

-- Create function with updated return type
CREATE FUNCTION public.get_available_rooms(
  p_check_in timestamptz,
  p_check_out timestamptz
)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  room_type public.room_type_enum,
  category_code text,
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
    r.category_code,
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
  ORDER BY r.name;
$$;

COMMENT ON FUNCTION public.get_available_rooms(timestamptz, timestamptz) IS
  'Trả về danh sách phòng trống trong khoảng p_check_in -> p_check_out với đầy đủ thông tin bao gồm category_code, room_number, floor_number.';


-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_available_rooms(timestamptz, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_rooms(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_rooms(timestamptz, timestamptz) TO service_role;
