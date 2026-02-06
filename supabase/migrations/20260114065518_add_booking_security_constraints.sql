-- Migration: Add booking security constraints and indexes
-- This migration adds:
-- 1. btree_gist extension (if not exists)
-- 2. GiST index for optimized time range queries
-- 3. EXCLUDE constraint to prevent room overlaps 100%

-- ============================================================================
-- 1. ENABLE EXTENSION
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- 2. GIST INDEX (Tối ưu query)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bookings_room_time
ON bookings
USING GIST (
  room_id,
  tstzrange(check_in, check_out, '[)')
);

-- ============================================================================
-- 3. EXCLUDE CONSTRAINT – Chống trùng phòng 100%
-- ============================================================================
-- This constraint ensures no two bookings can overlap for the same room
-- when they have status in ('pending','awaiting_payment','confirmed','checked_in')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'no_room_overlap' 
    AND conrelid = 'bookings'::regclass
  ) THEN
    ALTER TABLE bookings
    ADD CONSTRAINT no_room_overlap
    EXCLUDE USING GIST (
      room_id WITH =,
      tstzrange(check_in, check_out, '[)') WITH &&
    )
    WHERE (
      status IN ('pending','awaiting_payment','confirmed','checked_in')
    );
  END IF;
END $$;

