-- Fix upsert_qr_display_state: partial unique index requires matching WHERE in ON CONFLICT
-- (PostgreSQL 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification)

CREATE OR REPLACE FUNCTION public.upsert_qr_display_state(
  p_booking_id uuid,
  p_booking_code text,
  p_customer_name text,
  p_room_name text,
  p_check_in timestamptz,
  p_check_out timestamptz,
  p_total_amount numeric,
  p_final_amount numeric DEFAULT NULL,
  p_branch_code text DEFAULT 'main'
)
RETURNS public.qr_display_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.qr_display_state;
  v_branch_id uuid;
  v_booking_branch uuid;
BEGIN
  v_branch_id := public.resolve_branch_id_by_code(p_branch_code);
  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_BRANCH_CODE';
  END IF;

  SELECT b.branch_id INTO v_booking_branch
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  IF v_booking_branch IS NULL OR v_booking_branch <> v_branch_id THEN
    RAISE EXCEPTION 'BOOKING_BRANCH_MISMATCH';
  END IF;

  INSERT INTO public.qr_display_state (
    branch_id, booking_id, booking_code, customer_name, room_name,
    check_in, check_out, total_amount, final_amount, updated_at
  )
  VALUES (
    v_branch_id, p_booking_id, p_booking_code, p_customer_name, p_room_name,
    p_check_in, p_check_out, p_total_amount, p_final_amount, now()
  )
  ON CONFLICT (branch_id) WHERE (branch_id IS NOT NULL) DO UPDATE SET
    booking_id = EXCLUDED.booking_id,
    booking_code = EXCLUDED.booking_code,
    customer_name = EXCLUDED.customer_name,
    room_name = EXCLUDED.room_name,
    check_in = EXCLUDED.check_in,
    check_out = EXCLUDED.check_out,
    total_amount = EXCLUDED.total_amount,
    final_amount = EXCLUDED.final_amount,
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_qr_display_state(
  uuid, text, text, text, timestamptz, timestamptz, numeric, numeric, text
) TO anon, authenticated, service_role;
