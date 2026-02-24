-- ============================================================================
-- Migration: Add category_code column to rooms table
-- Description: Thêm cột category_code để phân loại phòng dễ dàng hơn
-- Date: 2026-02-24
-- ============================================================================

-- 1. Thêm cột category_code vào bảng rooms
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS category_code text;

-- 2. Tạo index cho category_code để tìm kiếm nhanh hơn
CREATE INDEX IF NOT EXISTS idx_rooms_category_code 
ON public.rooms(category_code) 
WHERE deleted_at IS NULL;

-- 3. Thêm comment để giải thích cột
COMMENT ON COLUMN public.rooms.category_code IS 'Mã phân loại phòng (VD: URBAN_COMPACT_QUEEN, DELUXE_BALCONY_QUEEN)';

-- -- 4. Update data hiện tại dựa trên name (mapping theo yêu cầu)
-- UPDATE public.rooms
-- SET category_code = CASE 
--   WHEN name ILIKE '%Urban Compact Queen%' THEN 'URBAN_COMPACT_QUEEN'
--   WHEN name ILIKE '%Urban Compact Twin%' THEN 'URBAN_COMPACT_TWIN'
--   WHEN name ILIKE '%Urban Balcony Queen%' THEN 'URBAN_BALCONY_QUEEN'
--   WHEN name ILIKE '%Deluxe Balcony Queen%' THEN 'DELUXE_BALCONY_QUEEN'
--   WHEN name ILIKE '%Premium City View Queen%' THEN 'PREMIUM_CITY_VIEW'
--   WHEN name ILIKE '%Executive Balcony Suite%' THEN 'EXEC_BALCONY_SUITE'
--   ELSE NULL
-- END
-- WHERE category_code IS NULL;
