-- ============================================
-- QR Display State - Complete Migration
-- ============================================
-- This table stores the current booking that should be displayed on QR screen
-- Only one row should exist (singleton pattern)
-- Uses Supabase Realtime for instant updates across devices

-- Drop existing objects if they exist
DROP FUNCTION IF EXISTS upsert_qr_display_state(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC);
DROP TABLE IF EXISTS qr_display_state CASCADE;

-- Create qr_display_state table
CREATE TABLE qr_display_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  booking_code TEXT NOT NULL,
  customer_name TEXT,
  room_name TEXT,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_qr_display_state_updated_at ON qr_display_state(updated_at DESC);

-- Enable RLS
ALTER TABLE qr_display_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to read qr_display_state"
  ON qr_display_state
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated users to manage qr_display_state"
  ON qr_display_state
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON qr_display_state TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON qr_display_state TO authenticated;

-- Set REPLICA IDENTITY for Realtime
ALTER TABLE qr_display_state REPLICA IDENTITY FULL;

-- Add table to Realtime publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE qr_display_state;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- ============================================
-- Upsert Function
-- ============================================
-- This function ensures only one row exists in the table
-- Uses UPDATE for existing row (triggers UPDATE event)
-- Uses INSERT for first row (triggers INSERT event)

CREATE OR REPLACE FUNCTION upsert_qr_display_state(
  p_booking_id UUID,
  p_booking_code TEXT,
  p_customer_name TEXT,
  p_room_name TEXT,
  p_check_in TIMESTAMPTZ,
  p_check_out TIMESTAMPTZ,
  p_total_amount NUMERIC
)
RETURNS qr_display_state
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result qr_display_state;
  v_existing_id UUID;
BEGIN
  -- Check if any row exists
  SELECT id INTO v_existing_id FROM qr_display_state LIMIT 1;
  
  IF v_existing_id IS NOT NULL THEN
    -- Update existing row (triggers UPDATE event for Realtime)
    UPDATE qr_display_state
    SET 
      booking_id = p_booking_id,
      booking_code = p_booking_code,
      customer_name = p_customer_name,
      room_name = p_room_name,
      check_in = p_check_in,
      check_out = p_check_out,
      total_amount = p_total_amount,
      updated_at = NOW()
    WHERE id = v_existing_id
    RETURNING * INTO v_result;
  ELSE
    -- Insert new row if none exists (triggers INSERT event for Realtime)
    INSERT INTO qr_display_state (
      booking_id,
      booking_code,
      customer_name,
      room_name,
      check_in,
      check_out,
      total_amount,
      updated_at
    ) VALUES (
      p_booking_id,
      p_booking_code,
      p_customer_name,
      p_room_name,
      p_check_in,
      p_check_out,
      p_total_amount,
      NOW()
    )
    RETURNING * INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE qr_display_state IS 'Stores the current booking to display on QR screen. Only one row should exist.';
COMMENT ON FUNCTION upsert_qr_display_state IS 'Upserts QR display state ensuring only one row exists. Triggers Realtime events.';
