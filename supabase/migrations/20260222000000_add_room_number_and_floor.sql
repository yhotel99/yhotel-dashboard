-- ============================================================================
-- Migration: Add room_number and floor_number to rooms table
-- Created: 2026-02-22
-- Description: Thêm số phòng và số tầng vào bảng rooms
-- ============================================================================

-- Add room_number column (số phòng)
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS room_number text;

-- Add floor_number column (số tầng)
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS floor_number integer;

-- Add comment for documentation
COMMENT ON COLUMN public.rooms.room_number IS 'Số phòng (ví dụ: 101, 102, A01)';
COMMENT ON COLUMN public.rooms.floor_number IS 'Số tầng của phòng';

-- Optional: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON public.rooms(room_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rooms_floor_number ON public.rooms(floor_number) WHERE deleted_at IS NULL;

-- Optional: Add unique constraint for room_number if needed
-- Uncomment the line below if you want room_number to be unique
-- ALTER TABLE public.rooms ADD CONSTRAINT unique_room_number UNIQUE (room_number);
