-- ILIKE '%...%' trên rooms.name trong matching của list_bookings_json / search_bookings_json
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_rooms_name_trgm
ON public.rooms
USING gin (name gin_trgm_ops)
WHERE deleted_at IS NULL;
