insert into permissions (name, description) values
  ('view:dashboard', 'View dashboard page'),
  ('view:users', 'View users management page'),
  ('view:bookings', 'View bookings management page'),
  ('view:rooms', 'View rooms management page'),
  ('view:payments', 'View payments management page'),
  ('view:payment-logs', 'View payment logs page'),
  ('view:reports', 'View reports page'),
  ('view:gallery', 'View gallery management page'),
  ('view:blogs', 'View blogs management page'),
  ('view:settings', 'View settings page'),
  ('view:customers', 'View customers management page'),
  ('view:refund-requests', 'View refund requests page'),
  ('view:reservations', 'View reservations page')
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
  'view:reports',
  'view:gallery',
  'view:blogs',
  'view:settings',
  'view:customers',
  'view:refund-requests',
  'view:reservations'
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
  'view:reports',
  'view:gallery',
  'view:blogs',
  'view:customers',
  'view:refund-requests',
  'view:reservations'
)
on conflict (role, permission_id) do nothing;

-- Seed role_permissions for STAFF role
insert into role_permissions (role, permission_id)
select 'staff'::user_role, id
from permissions
where name in (
  'view:reservations',
  'view:bookings',
  'view:customers'
)
on conflict (role, permission_id) do nothing;

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
    now(),
    now()
  )
  RETURNING id
)
INSERT INTO room_images (room_id, image_id, position, is_main, created_at)
SELECT room2.id, room2_image.id, 0, true, now()
FROM room2, room2_image
ON CONFLICT DO NOTHING;