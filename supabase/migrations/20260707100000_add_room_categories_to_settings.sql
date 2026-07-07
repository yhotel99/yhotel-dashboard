-- Add room_categories JSONB to settings for dynamic room classification
SET search_path = public;

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS room_categories jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN settings.room_categories IS
  'Danh sách phân loại phòng: [{ code, name, description?, sort_order, is_active }]';

-- Seed default categories (only when empty)
UPDATE settings
SET room_categories = '[
  {"code":"URBAN_COMPACT_QUEEN","name":"Urban Compact Queen","sort_order":1,"is_active":true},
  {"code":"URBAN_COMPACT_TWIN","name":"Urban Compact Twin Single","sort_order":2,"is_active":true},
  {"code":"URBAN_BALCONY_QUEEN","name":"Urban Balcony Queen","sort_order":3,"is_active":true},
  {"code":"DELUXE_BALCONY_QUEEN","name":"Deluxe Balcony Queen","sort_order":4,"is_active":true},
  {"code":"PREMIUM_CITY_VIEW","name":"Premium City View Queen","sort_order":5,"is_active":true},
  {"code":"EXEC_BALCONY_SUITE","name":"Executive Balcony Suite","sort_order":6,"is_active":true},
  {"code":"SUPERIOR_TWIN_CITY_VIEW","name":"Superior Twin City View","sort_order":7,"is_active":true},
  {"code":"SUPERIOR_TWIN_CITY_VIEW_HIGH_FLOOR","name":"Superior Twin City View High Floor","sort_order":8,"is_active":true},
  {"code":"SUPERIOR_KING_CITY_VIEW","name":"Superior King City View","sort_order":9,"is_active":true},
  {"code":"SUPERIOR_KING_CITY_VIEW_HIGH_FLOOR","name":"Superior King City View High Floor","sort_order":10,"is_active":true},
  {"code":"EXECUTIVE_KING_NINH_KIEU_VIEW","name":"Executive King Ninh Kieu View","sort_order":11,"is_active":true},
  {"code":"EXECUTIVE_KING_CAN_THO_BRIDGE_VIEW","name":"Executive King Can Tho Bridge View","sort_order":12,"is_active":true},
  {"code":"MAINTENANCE","name":"Maintenance","sort_order":13,"is_active":true}
]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND (room_categories IS NULL OR room_categories = '[]'::jsonb);
