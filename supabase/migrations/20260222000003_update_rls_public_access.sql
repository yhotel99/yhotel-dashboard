-- ============================================================================
-- Migration: Update RLS policies to allow public access
-- Created: 2026-02-22
-- Description: Cập nhật RLS policies để cho phép truy cập công khai (không cần đăng nhập)
-- ============================================================================

-- ============================================================================
-- BOOKINGS TABLE - Allow public read, authenticated for write
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to read bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated users to insert bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated users to update bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated users to delete bookings" ON bookings;

CREATE POLICY "Allow public to read bookings"
ON bookings FOR SELECT TO public USING (true);

CREATE POLICY "Allow public to insert bookings"
ON bookings FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public to update bookings"
ON bookings FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public to delete bookings"
ON bookings FOR DELETE TO public USING (true);

-- ============================================================================
-- BOOKING_ROOMS TABLE - Allow public access
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to read booking_rooms" ON booking_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to insert booking_rooms" ON booking_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to update booking_rooms" ON booking_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to delete booking_rooms" ON booking_rooms;

CREATE POLICY "Allow public to read booking_rooms"
ON booking_rooms FOR SELECT TO public USING (true);

CREATE POLICY "Allow public to insert booking_rooms"
ON booking_rooms FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public to update booking_rooms"
ON booking_rooms FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public to delete booking_rooms"
ON booking_rooms FOR DELETE TO public USING (true);

-- ============================================================================
-- CUSTOMERS TABLE - Allow public access
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to read customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated users to insert customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated users to update customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated users to delete customers" ON customers;

CREATE POLICY "Allow public to read customers"
ON customers FOR SELECT TO public USING (true);

CREATE POLICY "Allow public to insert customers"
ON customers FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public to update customers"
ON customers FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public to delete customers"
ON customers FOR DELETE TO public USING (true);

-- ============================================================================
-- ROOMS TABLE - Allow public access
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to read rooms" ON rooms;
DROP POLICY IF EXISTS "Allow authenticated users to insert rooms" ON rooms;
DROP POLICY IF EXISTS "Allow authenticated users to update rooms" ON rooms;
DROP POLICY IF EXISTS "Allow authenticated users to delete rooms" ON rooms;

CREATE POLICY "Allow public to read rooms"
ON rooms FOR SELECT TO public USING (true);

CREATE POLICY "Allow public to insert rooms"
ON rooms FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public to update rooms"
ON rooms FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public to delete rooms"
ON rooms FOR DELETE TO public USING (true);

-- ============================================================================
-- ROOM_IMAGES TABLE - Allow public access
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to read room_images" ON room_images;
DROP POLICY IF EXISTS "Allow authenticated users to insert room_images" ON room_images;
DROP POLICY IF EXISTS "Allow authenticated users to update room_images" ON room_images;
DROP POLICY IF EXISTS "Allow authenticated users to delete room_images" ON room_images;

CREATE POLICY "Allow public to read room_images"
ON room_images FOR SELECT TO public USING (true);

CREATE POLICY "Allow public to insert room_images"
ON room_images FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public to update room_images"
ON room_images FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public to delete room_images"
ON room_images FOR DELETE TO public USING (true);

-- ============================================================================
-- IMAGES TABLE - Allow public access
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to read images" ON images;
DROP POLICY IF EXISTS "Allow authenticated users to insert images" ON images;
DROP POLICY IF EXISTS "Allow authenticated users to update images" ON images;
DROP POLICY IF EXISTS "Allow authenticated users to delete images" ON images;

CREATE POLICY "Allow public to read images"
ON images FOR SELECT TO public USING (true);

CREATE POLICY "Allow public to insert images"
ON images FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public to update images"
ON images FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public to delete images"
ON images FOR DELETE TO public USING (true);

-- ============================================================================
-- PAYMENTS TABLE - Allow public access
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to read payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to insert payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to update payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to delete payments" ON payments;

CREATE POLICY "Allow public to read payments"
ON payments FOR SELECT TO public USING (true);

CREATE POLICY "Allow public to insert payments"
ON payments FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public to update payments"
ON payments FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public to delete payments"
ON payments FOR DELETE TO public USING (true);

-- ============================================================================
-- BLOGS TABLE - Allow public read, authenticated for write
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to read blogs" ON blogs;
DROP POLICY IF EXISTS "Allow authenticated users to insert blogs" ON blogs;
DROP POLICY IF EXISTS "Allow authenticated users to update blogs" ON blogs;
DROP POLICY IF EXISTS "Allow authenticated users to delete blogs" ON blogs;

CREATE POLICY "Allow public to read blogs"
ON blogs FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated to insert blogs"
ON blogs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated to update blogs"
ON blogs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated to delete blogs"
ON blogs FOR DELETE TO authenticated USING (true);
