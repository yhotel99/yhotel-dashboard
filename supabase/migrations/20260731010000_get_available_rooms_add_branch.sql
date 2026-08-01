-- ============================================================================
-- get_available_rooms_client: web client version WITH checkout hold check
-- Tách riêng khỏi get_available_rooms (dashboard) để tránh ambiguity.
-- Dashboard chỉ check booking_rooms, client check cả booking_rooms + checkout holds.
-- ============================================================================

SET search_path = public;

-- Drop old 2-arg + 3-arg get_available_rooms (replaced by get_available_rooms_client)
-- Do NOT touch 4-arg get_available_rooms (dashboard, from 20260521)
DROP FUNCTION IF EXISTS public.get_available_rooms(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_available_rooms(timestamptz, timestamptz, uuid);

DROP FUNCTION IF EXISTS public.get_available_rooms_client(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_available_rooms_client(timestamptz, timestamptz, uuid);

-- 2-arg: không filter branch
CREATE FUNCTION public.get_available_rooms_client(
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
    AND NOT EXISTS (
      SELECT 1
      FROM public.checkout_session_rooms csr
      JOIN public.checkout_sessions cs ON cs.id = csr.session_id
      WHERE csr.room_id = r.id
        AND csr.status = 'holding'
        AND cs.status = 'pending'
        AND cs.expires_at > now()
        AND tstzrange(csr.check_in, csr.check_out, '[)') && tstzrange(p_check_in, p_check_out, '[)')
    )
  ORDER BY r.name;
$$;

-- 3-arg: có p_branch_id optional
CREATE FUNCTION public.get_available_rooms_client(
  p_check_in timestamptz,
  p_check_out timestamptz,
  p_branch_id uuid DEFAULT NULL
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
    AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.booking_rooms br
      WHERE br.room_id = r.id
        AND br.status IN ('pending', 'awaiting_payment', 'confirmed', 'checked_in')
        AND tstzrange(br.check_in, br.check_out, '[)') && tstzrange(p_check_in, p_check_out, '[)')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.checkout_session_rooms csr
      JOIN public.checkout_sessions cs ON cs.id = csr.session_id
      WHERE csr.room_id = r.id
        AND csr.status = 'holding'
        AND cs.status = 'pending'
        AND cs.expires_at > now()
        AND tstzrange(csr.check_in, csr.check_out, '[)') && tstzrange(p_check_in, p_check_out, '[)')
    )
  ORDER BY r.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_rooms_client(timestamptz, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_rooms_client(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_rooms_client(timestamptz, timestamptz) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_available_rooms_client(timestamptz, timestamptz, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_rooms_client(timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_rooms_client(timestamptz, timestamptz, uuid) TO service_role;

COMMENT ON FUNCTION public.get_available_rooms_client(timestamptz, timestamptz) IS
  'Web client: phòng trống (loại trừ booking conflicts + checkout holds).';

COMMENT ON FUNCTION public.get_available_rooms_client(timestamptz, timestamptz, uuid) IS
  'Web client: phòng trống (loại trừ booking conflicts + checkout holds). p_branch_id tùy chọn.';
