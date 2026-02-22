-- ============================================================================
-- RLS Policies for Main Tables
-- Chỉ yêu cầu authenticated - không check roles/permissions
-- ============================================================================

-- ============================================================================
-- BOOKINGS TABLE
-- ============================================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read bookings"
  ON bookings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert bookings"
  ON bookings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update bookings"
  ON bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete bookings"
  ON bookings FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- BOOKING_ROOMS TABLE (junction table)
-- ============================================================================
ALTER TABLE booking_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read booking_rooms"
  ON booking_rooms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert booking_rooms"
  ON booking_rooms FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update booking_rooms"
  ON booking_rooms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete booking_rooms"
  ON booking_rooms FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read customers"
  ON customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert customers"
  ON customers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update customers"
  ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete customers"
  ON customers FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- ROOMS TABLE
-- ============================================================================
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read rooms"
  ON rooms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert rooms"
  ON rooms FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update rooms"
  ON rooms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete rooms"
  ON rooms FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- ROOM_IMAGES TABLE (junction table)
-- ============================================================================
ALTER TABLE room_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read room_images"
  ON room_images FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert room_images"
  ON room_images FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update room_images"
  ON room_images FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete room_images"
  ON room_images FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- IMAGES TABLE (shared resource)
-- ============================================================================
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read images"
  ON images FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert images"
  ON images FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update images"
  ON images FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete images"
  ON images FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read payments"
  ON payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert payments"
  ON payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update payments"
  ON payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete payments"
  ON payments FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- PAYMENT_LOGS TABLE (webhook logs - READ ONLY for users)
-- ⚠️ QUAN TRỌNG: Chỉ cho phép READ, INSERT/UPDATE/DELETE chỉ qua service role
-- ============================================================================
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read payment_logs"
  ON payment_logs FOR SELECT TO authenticated USING (true);

-- Service role có thể insert (từ webhooks)
CREATE POLICY "Allow service role to insert payment_logs"
  ON payment_logs FOR INSERT TO service_role WITH CHECK (true);

-- ============================================================================
-- REFUND_REQUESTS TABLE
-- ============================================================================
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read refund_requests"
  ON refund_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert refund_requests"
  ON refund_requests FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update refund_requests"
  ON refund_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete refund_requests"
  ON refund_requests FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- ROOM_STATUS_VIEW (VIEW - chỉ cần SELECT)
-- ⚠️ QUAN TRỌNG: Đây là VIEW không phải TABLE, chỉ cần SELECT policy
-- ============================================================================
-- Note: Views inherit RLS from underlying tables, nhưng ta vẫn có thể set policy

-- Check if room_status_view exists and is a view
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'room_status_view'
  ) THEN
    -- Enable RLS on view (if supported)
    EXECUTE 'ALTER VIEW room_status_view SET (security_barrier = true)';
    
    -- Note: Views don't support RLS policies directly in PostgreSQL
    -- They inherit security from underlying tables
    RAISE NOTICE 'room_status_view security barrier enabled';
  ELSE
    RAISE NOTICE 'room_status_view does not exist or is not a view';
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE bookings IS 'Bookings with RLS policies for authenticated users';
COMMENT ON TABLE booking_rooms IS 'Booking rooms junction table with RLS policies';
COMMENT ON TABLE customers IS 'Customers with RLS policies for authenticated users';
COMMENT ON TABLE rooms IS 'Rooms with RLS policies for authenticated users';
COMMENT ON TABLE room_images IS 'Room images junction table with RLS policies';
COMMENT ON TABLE images IS 'Images with RLS policies for authenticated users';
COMMENT ON TABLE payments IS 'Payments with RLS policies for authenticated users';
COMMENT ON TABLE payment_logs IS 'Payment logs (webhooks) - READ ONLY for authenticated users';
COMMENT ON TABLE refund_requests IS 'Refund requests with RLS policies for authenticated users';
