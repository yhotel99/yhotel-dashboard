-- Add final_amount to qr_display_state for QR code amount (fallback to total_amount when NULL)
ALTER TABLE public.qr_display_state
  ADD COLUMN IF NOT EXISTS final_amount numeric(14,2) NULL;

COMMENT ON COLUMN public.qr_display_state.final_amount IS
  'Amount to show on QR (final_amount from booking). If NULL, frontend uses total_amount.';

-- Recreate upsert function with p_final_amount
DROP FUNCTION IF EXISTS upsert_qr_display_state(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC);

CREATE OR REPLACE FUNCTION upsert_qr_display_state(
  p_booking_id UUID,
  p_booking_code TEXT,
  p_customer_name TEXT,
  p_room_name TEXT,
  p_check_in TIMESTAMPTZ,
  p_check_out TIMESTAMPTZ,
  p_total_amount NUMERIC,
  p_final_amount NUMERIC DEFAULT NULL
)
RETURNS qr_display_state
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result qr_display_state;
  v_existing_id UUID;
BEGIN
  SELECT id INTO v_existing_id FROM qr_display_state LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE qr_display_state
    SET
      booking_id = p_booking_id,
      booking_code = p_booking_code,
      customer_name = p_customer_name,
      room_name = p_room_name,
      check_in = p_check_in,
      check_out = p_check_out,
      total_amount = p_total_amount,
      final_amount = p_final_amount,
      updated_at = NOW()
    WHERE id = v_existing_id
    RETURNING * INTO v_result;
  ELSE
    INSERT INTO qr_display_state (
      booking_id,
      booking_code,
      customer_name,
      room_name,
      check_in,
      check_out,
      total_amount,
      final_amount,
      updated_at
    ) VALUES (
      p_booking_id,
      p_booking_code,
      p_customer_name,
      p_room_name,
      p_check_in,
      p_check_out,
      p_total_amount,
      p_final_amount,
      NOW()
    )
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;
