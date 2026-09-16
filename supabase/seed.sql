insert into permissions (name, description) values
  ('view:dashboard', 'View dashboard page'),
  ('view:users', 'View users management page'),
  ('view:bookings', 'View bookings management page'),
  ('view:rooms', 'View rooms management page'),
  ('view:payments', 'View payments management page'),
  ('view:payment-logs', 'View payment logs page'),
  ('view:checkout-sessions', 'View online checkout sessions and create bookings from expired sessions'),
  ('view:reports', 'View reports page'),
  ('view:gallery', 'View gallery management page'),
  ('view:blogs', 'View blogs management page'),
  ('view:settings', 'View settings page'),
  ('view:customers', 'View customers management page'),
  ('view:refund-requests', 'View refund requests page'),
  ('view:reservations', 'View reservations page'),
  ('view:branches', 'View branches list'),
  ('manage:branches', 'Create, update, delete branches'),
  ('assign:bookings', 'Gắn người tạo vào booking khi chưa có người tạo'),
  ('update:booking-creator', 'Sửa hoặc đổi người tạo của booking đã có')
on conflict (name) do nothing;

-- Seed role_permissions for ADMIN role
insert into role_permissions (role, permission_id)
select 'admin'::user_role, id
from permissions
where name in (
  'view:dashboard',
  'view:users',
  'view:bookings',
  'view:rooms',
  'view:payments',
  'view:payment-logs',
  'view:checkout-sessions',
  'view:reports',
  'view:gallery',
  'view:blogs',
  'view:settings',
  'view:customers',
  'view:refund-requests',
  'view:reservations',
  'view:branches',
  'manage:branches',
  'assign:bookings',
  'update:booking-creator'
)
on conflict (role, permission_id) do nothing;

-- Seed role_permissions for MANAGER role
insert into role_permissions (role, permission_id)
select 'manager'::user_role, id
from permissions
where name in (
  'view:dashboard',
  'view:bookings',
  'view:rooms',
  'view:payments',
  'view:payment-logs',
  'view:checkout-sessions',
  'view:reports',
  'view:gallery',
  'view:blogs',
  'view:customers',
  'view:refund-requests',
  'view:reservations',
  'view:branches',
  'assign:bookings',
  'update:booking-creator'
)
on conflict (role, permission_id) do nothing;

-- Seed role_permissions for STAFF role
insert into role_permissions (role, permission_id)
select 'staff'::user_role, id
from permissions
where name in (
  'view:reservations',
  'view:bookings',
  'view:customers',
  'view:checkout-sessions',
  'assign:bookings'
)
on conflict (role, permission_id) do nothing;

-- Default branch (main) — must match 20260521100000_create_branches.sql
-- branch_id: a0000000-0000-4000-8000-000000000001

-- Seed payment_logs with sample data
-- Note: These are sample payment logs for testing different statuses
-- booking_id and booking_code can be linked to actual bookings if they exist
insert into payment_logs (
  booking_code,
  transaction_id,
  amount,
  content,
  bank_code,
  status,
  reason,
  raw_payload,
  processed_at,
  created_at
) values
  -- Success status - Payment completed successfully
  (
    'YH20260113A1CD0F',
    'TXN20250115001',
    2500000,
    'YH20260113A1CD0F   Ma giao dich  Trace427638',
    'VCB',
    'success',
    null,
    '{"id": "TXN20250115001", "gateway": "VCB", "transactionDate": "2025-01-15T10:30:00Z", "transactionNumber": "TXN20250115001", "accountNumber": "1234567890", "content": "YH20260113A1CD0F   Ma giao dich  Trace427638", "transferType": "IN", "transferAmount": 2500000, "checksum": "abc123"}'::jsonb,
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  -- Processing status - Currently being processed
  (
    'YH20260114B2EF1G',
    'TXN20250116002',
    1800000,
    'YH20260114B2EF1G   Ma giao dich  Trace427639',
    'TCB',
    'processing',
    null,
    '{"id": "TXN20250116002", "gateway": "TCB", "transactionDate": "2025-01-16T14:20:00Z", "transactionNumber": "TXN20250116002", "accountNumber": "0987654321", "content": "YH20260114B2EF1G   Ma giao dich  Trace427639", "transferType": "IN", "transferAmount": 1800000, "checksum": "def456"}'::jsonb,
    now(),
    now() - interval '1 hour'
  ),
  -- Underpaid status - Amount received is less than expected
  (
    'YH20260115C3GH2H',
    'TXN20250117003',
    1500000,
    'YH20260115C3GH2H   Ma giao dich  Trace427640',
    'ACB',
    'underpaid',
    'Paid 1500000, expected 2000000, thiếu 500000',
    '{"id": "TXN20250117003", "gateway": "ACB", "transactionDate": "2025-01-17T09:15:00Z", "transactionNumber": "TXN20250117003", "accountNumber": "1122334455", "content": "YH20260115C3GH2H   Ma giao dich  Trace427640", "transferType": "IN", "transferAmount": 1500000, "checksum": "ghi789"}'::jsonb,
    now() - interval '1 day',
    now() - interval '1 day'
  ),
  -- Skipped status - OUT transaction (money going out)
  (
    null,
    'TXN20250118004',
    500000,
    'Chuyen tien ra ngoai   Ma giao dich  Trace427641',
    'VPB',
    'skipped',
    'OUT transaction',
    '{"id": "TXN20250118004", "gateway": "VPB", "transactionDate": "2025-01-18T11:45:00Z", "transactionNumber": "TXN20250118004", "accountNumber": "5566778899", "content": "Chuyen tien ra ngoai   Ma giao dich  Trace427641", "transferType": "OUT", "transferAmount": 500000, "checksum": "jkl012"}'::jsonb,
    now() - interval '12 hours',
    now() - interval '12 hours'
  ),
  -- Error status - Missing transfer content
  (
    null,
    'TXN20250119005',
    3000000,
    null,
    'BIDV',
    'error',
    'Missing transfer content',
    '{"id": "TXN20250119005", "gateway": "BIDV", "transactionDate": "2025-01-19T16:30:00Z", "transactionNumber": "TXN20250119005", "accountNumber": "9988776655", "content": null, "transferType": "IN", "transferAmount": 3000000, "checksum": "mno345"}'::jsonb,
    now() - interval '6 hours',
    now() - interval '6 hours'
  ),
  -- Error status - Booking not found
  (
    'YH20260120D4IJ3I',
    'TXN20250120006',
    2200000,
    'YH20260120D4IJ3I   Ma giao dich  Trace427642',
    'MSB',
    'error',
    'Booking not found',
    '{"id": "TXN20250120006", "gateway": "MSB", "transactionDate": "2025-01-20T08:00:00Z", "transactionNumber": "TXN20250120006", "accountNumber": "4433221100", "content": "YH20260120D4IJ3I   Ma giao dich  Trace427642", "transferType": "IN", "transferAmount": 2200000, "checksum": "pqr678"}'::jsonb,
    now() - interval '3 hours',
    now() - interval '3 hours'
  ),
  -- Skipped status - Already confirmed booking
  (
    'YH20260121E5KL4J',
    'TXN20250121007',
    3200000,
    'YH20260121E5KL4J   Ma giao dich  Trace427643',
    'HDB',
    'skipped',
    'Already confirmed',
    '{"id": "TXN20250121007", "gateway": "HDB", "transactionDate": "2025-01-21T13:25:00Z", "transactionNumber": "TXN20250121007", "accountNumber": "3322110099", "content": "YH20260121E5KL4J   Ma giao dich  Trace427643", "transferType": "IN", "transferAmount": 3200000, "checksum": "stu901"}'::jsonb,
    now() - interval '30 minutes',
    now() - interval '30 minutes'
  ),
  -- Success status - Another successful payment
  (
    'YH20260122F6MN5K',
    'TXN20250122008',
    2800000,
    'YH20260122F6MN5K   Ma giao dich  Trace427644',
    'TPB',
    'success',
    null,
    '{"id": "TXN20250122008", "gateway": "TPB", "transactionDate": "2025-01-22T15:10:00Z", "transactionNumber": "TXN20250122008", "accountNumber": "2211009988", "content": "YH20260122F6MN5K   Ma giao dich  Trace427644", "transferType": "IN", "transferAmount": 2800000, "checksum": "vwx234"}'::jsonb,
    now() - interval '45 minutes',
    now() - interval '45 minutes'
  )
on conflict do nothing;

-- Seed rooms with images from picsum.photos
-- Room 1: Deluxe Room
WITH room1_image AS (
  INSERT INTO images (url, created_at)
  VALUES ('https://picsum.photos/800/600', now())
  RETURNING id
),
room1 AS (
  INSERT INTO rooms (
    name,
    description,
    room_type,
    price_per_night,
    max_guests,
    amenities,
    status,
    room_number,
    floor_number,
    branch_id,
    created_at,
    updated_at
  )
  VALUES (
    'Phòng Deluxe View',
    'Phòng deluxe với view đẹp, không gian rộng rãi và tiện nghi hiện đại. Phù hợp cho cặp đôi hoặc gia đình nhỏ.',
    'deluxe',
    1500000,
    3,
    '["wifi_high_speed", "parking", "coffee", "breakfast_service"]'::jsonb,
    'available',
    '401',
    4,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    now(),
    now()
  )
  RETURNING id
)
INSERT INTO room_images (room_id, image_id, position, is_main, created_at)
SELECT room1.id, room1_image.id, 0, true, now()
FROM room1, room1_image
ON CONFLICT DO NOTHING;

-- Room 2: Superior Room
WITH room2_image AS (
  INSERT INTO images (url, created_at)
  VALUES ('https://picsum.photos/200/300', now())
  RETURNING id
),
room2 AS (
  INSERT INTO rooms (
    name,
    description,
    room_type,
    price_per_night,
    max_guests,
    amenities,
    status,
    room_number,
    floor_number,
    branch_id,
    created_at,
    updated_at
  )
  VALUES (
    'Phòng Superior Garden',
    'Phòng superior với view vườn xanh mát, không gian thoáng đãng. Có ban công riêng để thư giãn.',
    'superior',
    1200000,
    2,
    '["wifi_high_speed", "parking", "breakfast_service", "laundry"]'::jsonb,
    'available',
    '402',
    4,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    now(),
    now()
  )
  RETURNING id
)
INSERT INTO room_images (room_id, image_id, position, is_main, created_at)
SELECT room2.id, room2_image.id, 0, true, now()
FROM room2, room2_image
ON CONFLICT DO NOTHING;

-- Room 3-10: Thêm nhiều phòng để test đặt nhiều phòng
INSERT INTO rooms (name, description, room_type, price_per_night, max_guests, amenities, status, room_number, floor_number, branch_id, created_at, updated_at)
VALUES
  ('Phòng Standard 101', 'Phòng tiêu chuẩn ấm cúng, giá hợp lý.', 'standard', 800000, 2, '["wifi_high_speed", "parking"]'::jsonb, 'available', '101', 1, 'a0000000-0000-4000-8000-000000000001'::uuid, now(), now()),
  ('Phòng Standard 102', 'Phòng tiêu chuẩn view nội thị.', 'standard', 750000, 2, '["wifi_high_speed"]'::jsonb, 'available', '102', 1, 'a0000000-0000-4000-8000-000000000001'::uuid, now(), now()),
  ('Phòng Superior 201', 'Phòng superior view biển.', 'superior', 1300000, 2, '["wifi_high_speed", "parking", "breakfast_service"]'::jsonb, 'available', '201', 2, 'a0000000-0000-4000-8000-000000000001'::uuid, now(), now()),
  ('Phòng Deluxe 202', 'Phòng deluxe không gian rộng.', 'deluxe', 1600000, 3, '["wifi_high_speed", "parking", "coffee", "breakfast_service", "laundry"]'::jsonb, 'available', '202', 2, 'a0000000-0000-4000-8000-000000000001'::uuid, now(), now()),
  ('Phòng Family 301', 'Phòng gia đình lớn, phù hợp 4-5 người.', 'family', 2200000, 5, '["wifi_high_speed", "parking", "breakfast_service", "laundry", "taxi_support"]'::jsonb, 'available', '301', 3, 'a0000000-0000-4000-8000-000000000001'::uuid, now(), now()),
  ('Phòng Family 302', 'Phòng gia đình có ban công.', 'family', 2400000, 5, '["wifi_high_speed", "parking", "coffee", "breakfast_service"]'::jsonb, 'available', '302', 3, 'a0000000-0000-4000-8000-000000000001'::uuid, now(), now()),
  ('Phòng Deluxe 203', 'Phòng deluxe góc tầng view đẹp.', 'deluxe', 1800000, 4, '["wifi_high_speed", "parking", "coffee", "breakfast_service"]'::jsonb, 'available', '203', 2, 'a0000000-0000-4000-8000-000000000001'::uuid, now(), now()),
  ('Phòng Standard 103', 'Phòng tiêu chuẩn gần thang máy.', 'standard', 700000, 2, '["wifi_high_speed", "parking"]'::jsonb, 'available', '103', 1, 'a0000000-0000-4000-8000-000000000001'::uuid, now(), now());

-- ============================================================================
-- Demo bookings + booking_rooms (~20, created_at lệch nhau cho keyset / sort)
-- Idempotent: ON CONFLICT (id) / (booking_id, room_id) DO NOTHING
-- ============================================================================

INSERT INTO public.customers (full_name, email, phone, customer_type, branch_id, created_at, updated_at)
SELECT v.full_name, v.email, v.phone, v.customer_type::public.customer_type, 'a0000000-0000-4000-8000-000000000001'::uuid, now(), now()
FROM (
  VALUES
    ('Trần Minh Khoa', 'seed.booking.c1@local.test', '0911000001', 'regular'),
    ('Lê Thu Hà', 'seed.booking.c2@local.test', '0911000002', 'regular'),
    ('Phạm Quốc An', 'seed.booking.c3@local.test', '0911000003', 'vip'),
    ('Hoàng Mai Linh', 'seed.booking.c4@local.test', '0911000004', 'regular'),
    ('Đỗ Văn Hùng', 'seed.booking.c5@local.test', '0911000005', 'regular')
) AS v(full_name, email, phone, customer_type)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.customers c
  WHERE c.branch_id = 'a0000000-0000-4000-8000-000000000001'::uuid
    AND lower(c.email) = lower(v.email)
    AND c.deleted_at IS NULL
);

INSERT INTO public.bookings (
  id,
  customer_id,
  room_id,
  check_in,
  check_out,
  number_of_nights,
  total_guests,
  status,
  notes,
  total_amount,
  advance_payment,
  final_amount,
  branch_id,
  created_at,
  updated_at,
  booking_code,
  deleted_at
)
VALUES
  -- 1–8: checked_out (quá khứ), mỗi phòng một slot
  (
    'bbad1000-0001-4000-8000-000000000001'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c1@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '101' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-01-02 14:00:00+07',
    timestamptz '2026-01-04 12:00:00+07',
    2,
    2,
    'checked_out'::public.booking_status,
    'Seed: đã trả phòng',
    1600000,
    0,
    1600000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-15 08:00:00+07',
    timestamptz '2026-02-15 08:00:00+07',
    'YHSEED260301001',
    NULL
  ),
  (
    'bbad1000-0001-4000-8000-000000000002'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c2@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '102' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-01-05 14:00:00+07',
    timestamptz '2026-01-07 12:00:00+07',
    2,
    2,
    'checked_out',
    'Seed: đã trả phòng',
    1500000,
    0,
    1500000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-15 09:17:00+07',
    timestamptz '2026-02-15 09:17:00+07',
    'YHSEED260301002',
    NULL
  ),
  (
    'bbad1000-0001-4000-8000-000000000003'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c3@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '103' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-01-08 14:00:00+07',
    timestamptz '2026-01-10 12:00:00+07',
    2,
    2,
    'checked_out',
    NULL,
    1400000,
    200000,
    1400000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-15 10:34:00+07',
    timestamptz '2026-02-15 10:34:00+07',
    'YHSEED260301003',
    NULL
  ),
  (
    'bbad1000-0001-4000-8000-000000000004'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c4@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '201' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-01-11 14:00:00+07',
    timestamptz '2026-01-13 12:00:00+07',
    2,
    2,
    'checked_out',
    'Seed',
    2600000,
    0,
    2600000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-15 11:51:00+07',
    timestamptz '2026-02-15 11:51:00+07',
    'YHSEED260301004',
    NULL
  ),
  (
    'bbad1000-0001-4000-8000-000000000005'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c5@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '202' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-01-14 14:00:00+07',
    timestamptz '2026-01-16 12:00:00+07',
    2,
    3,
    'checked_out',
    NULL,
    3200000,
    0,
    3200000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-15 13:08:00+07',
    timestamptz '2026-02-15 13:08:00+07',
    'YHSEED260301005',
    NULL
  ),
  (
    'bbad1000-0001-4000-8000-000000000006'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c1@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '203' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-01-17 14:00:00+07',
    timestamptz '2026-01-19 12:00:00+07',
    2,
    2,
    'checked_out',
    NULL,
    3600000,
    0,
    3600000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-15 14:25:00+07',
    timestamptz '2026-02-15 14:25:00+07',
    'YHSEED260301006',
    NULL
  ),
  (
    'bbad1000-0001-4000-8000-000000000007'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c2@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '301' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-01-20 14:00:00+07',
    timestamptz '2026-01-22 12:00:00+07',
    2,
    4,
    'checked_out',
    'Gia đình',
    4400000,
    4400000,
    4400000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-15 15:42:00+07',
    timestamptz '2026-02-15 15:42:00+07',
    'YHSEED260301007',
    NULL
  ),
  (
    'bbad1000-0001-4000-8000-000000000008'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c3@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '302' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-01-23 14:00:00+07',
    timestamptz '2026-01-25 12:00:00+07',
    2,
    4,
    'checked_out',
    NULL,
    4800000,
    0,
    4800000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-15 16:59:00+07',
    timestamptz '2026-02-15 16:59:00+07',
    'YHSEED260301008',
    NULL
  ),
  -- 9–10: cancelled
  (
    'bbad1000-0001-4000-8000-000000000009'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c4@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '401' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-01-26 14:00:00+07',
    timestamptz '2026-01-28 12:00:00+07',
    2,
    2,
    'cancelled',
    'Khách hủy',
    3000000,
    0,
    NULL,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-15 18:16:00+07',
    timestamptz '2026-02-15 18:16:00+07',
    'YHSEED260301009',
    NULL
  ),
  (
    'bbad1000-0001-4000-8000-00000000000a'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c5@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '402' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-01-29 14:00:00+07',
    timestamptz '2026-01-31 12:00:00+07',
    2,
    2,
    'cancelled',
    NULL,
    2400000,
    0,
    NULL,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-15 19:33:00+07',
    timestamptz '2026-02-15 19:33:00+07',
    'YHSEED260301010',
    NULL
  ),
  -- 11: multi-room checked_out (101 + 102)
  (
    'bbad1000-0001-4000-8000-00000000000b'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c1@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '101' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-02-01 14:00:00+07',
    timestamptz '2026-02-03 12:00:00+07',
    2,
    4,
    'checked_out',
    'Seed: 2 phòng',
    3200000,
    0,
    3200000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-15 20:50:00+07',
    timestamptz '2026-02-15 20:50:00+07',
    'YHSEED260301011',
    NULL
  ),
  -- 12–14: confirmed (tương lai, phòng không đụng pending)
  (
    'bbad1000-0001-4000-8000-00000000000c'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c2@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '101' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-06-10 14:00:00+07',
    timestamptz '2026-06-12 12:00:00+07',
    2,
    2,
    'confirmed',
    'Hè 2026',
    1600000,
    500000,
    1600000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-15 22:07:00+07',
    timestamptz '2026-02-15 22:07:00+07',
    'YHSEED260301012',
    NULL
  ),
  (
    'bbad1000-0001-4000-8000-00000000000d'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c3@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '103' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-06-15 14:00:00+07',
    timestamptz '2026-06-17 12:00:00+07',
    2,
    2,
    'confirmed',
    NULL,
    1500000,
    0,
    1500000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-16 08:22:00+07',
    timestamptz '2026-02-16 08:22:00+07',
    'YHSEED260301013',
    NULL
  ),
  (
    'bbad1000-0001-4000-8000-00000000000e'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c4@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '201' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-06-20 14:00:00+07',
    timestamptz '2026-06-22 12:00:00+07',
    2,
    2,
    'confirmed',
    NULL,
    2600000,
    2600000,
    2600000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-16 09:39:00+07',
    timestamptz '2026-02-16 09:39:00+07',
    'YHSEED260301014',
    NULL
  ),
  -- 15–17: pending
  (
    'bbad1000-0001-4000-8000-00000000000f'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c5@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '102' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-07-05 14:00:00+07',
    timestamptz '2026-07-07 12:00:00+07',
    2,
    2,
    'pending',
    'Chờ xác nhận',
    1500000,
    0,
    1500000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-16 10:56:00+07',
    timestamptz '2026-02-16 10:56:00+07',
    'YHSEED260301015',
    NULL
  ),
  (
    'bbad1000-0001-4000-8000-000000000010'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c1@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '202' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-07-10 14:00:00+07',
    timestamptz '2026-07-12 12:00:00+07',
    2,
    2,
    'pending',
    NULL,
    3200000,
    0,
    3200000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-16 12:13:00+07',
    timestamptz '2026-02-16 12:13:00+07',
    'YHSEED260301016',
    NULL
  ),
  (
    'bbad1000-0001-4000-8000-000000000011'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c2@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '203' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-07-15 14:00:00+07',
    timestamptz '2026-07-17 12:00:00+07',
    2,
    2,
    'pending',
    NULL,
    3600000,
    0,
    3600000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-16 13:30:00+07',
    timestamptz '2026-02-16 13:30:00+07',
    'YHSEED260301017',
    NULL
  ),
  -- 18–19: awaiting_payment
  (
    'bbad1000-0001-4000-8000-000000000012'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c3@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '301' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-08-01 14:00:00+07',
    timestamptz '2026-08-03 12:00:00+07',
    2,
    4,
    'awaiting_payment',
    'Chờ CK',
    4400000,
    0,
    4400000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-16 14:47:00+07',
    timestamptz '2026-02-16 14:47:00+07',
    'YHSEED260301018',
    NULL
  ),
  (
    'bbad1000-0001-4000-8000-000000000013'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c4@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '302' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-08-08 14:00:00+07',
    timestamptz '2026-08-10 12:00:00+07',
    2,
    3,
    'awaiting_payment',
    NULL,
    4800000,
    0,
    4800000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-16 16:04:00+07',
    timestamptz '2026-02-16 16:04:00+07',
    'YHSEED260301019',
    NULL
  ),
  -- 20: multi-room confirmed (401 + 402)
  (
    'bbad1000-0001-4000-8000-000000000014'::uuid,
    (SELECT id FROM public.customers WHERE email = 'seed.booking.c5@local.test' LIMIT 1),
    (SELECT id FROM public.rooms WHERE room_number = '401' AND deleted_at IS NULL LIMIT 1),
    timestamptz '2026-08-20 14:00:00+07',
    timestamptz '2026-08-22 12:00:00+07',
    2,
    4,
    'confirmed',
    'Combo 2 phòng deluxe',
    5400000,
    1000000,
    5400000,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    timestamptz '2026-02-16 17:21:00+07',
    timestamptz '2026-02-16 17:21:00+07',
    'YHSEED260301020',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.booking_rooms (
  booking_id,
  room_id,
  check_in,
  check_out,
  number_of_nights,
  amount,
  status,
  created_at
)
SELECT b.id, r.id, b.check_in, b.check_out, b.number_of_nights, b.total_amount, b.status::text, b.created_at + interval '1 second'
FROM public.bookings b
JOIN public.rooms r ON r.id = b.room_id
WHERE b.booking_code LIKE 'YHSEED260301%'
  AND b.room_id IS NOT NULL
  AND b.booking_code NOT IN ('YHSEED260301011', 'YHSEED260301020')
ON CONFLICT (booking_id, room_id) DO NOTHING;

-- Đa phòng: chia amount theo từng booking_room
INSERT INTO public.booking_rooms (
  booking_id,
  room_id,
  check_in,
  check_out,
  number_of_nights,
  amount,
  status,
  created_at
)
SELECT
  'bbad1000-0001-4000-8000-00000000000b'::uuid,
  r.id,
  timestamptz '2026-02-01 14:00:00+07',
  timestamptz '2026-02-03 12:00:00+07',
  2,
  1600000,
  'checked_out',
  timestamptz '2026-02-15 20:51:00+07'
FROM public.rooms r
WHERE r.room_number IN ('101', '102') AND r.deleted_at IS NULL
ON CONFLICT (booking_id, room_id) DO NOTHING;

INSERT INTO public.booking_rooms (
  booking_id,
  room_id,
  check_in,
  check_out,
  number_of_nights,
  amount,
  status,
  created_at
)
SELECT
  'bbad1000-0001-4000-8000-000000000014'::uuid,
  r.id,
  timestamptz '2026-08-20 14:00:00+07',
  timestamptz '2026-08-22 12:00:00+07',
  2,
  2700000,
  'confirmed',
  timestamptz '2026-02-16 17:22:00+07'
FROM public.rooms r
WHERE r.room_number IN ('401', '402') AND r.deleted_at IS NULL
ON CONFLICT (booking_id, room_id) DO NOTHING;