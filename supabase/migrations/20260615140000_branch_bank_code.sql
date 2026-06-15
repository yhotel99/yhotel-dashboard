-- Use SePay bank code (TPB, MB, ACB...) instead of BIN for branch bank accounts

SET search_path = public;

ALTER TABLE public.branch_bank_accounts
  RENAME COLUMN bank_bin TO bank_code;

-- Backfill legacy BIN values → SePay codes
UPDATE public.branch_bank_accounts b
SET bank_code = m.code
FROM (
  VALUES
    ('970415', 'ICB'),
    ('970436', 'VCB'),
    ('970422', 'MB'),
    ('970416', 'ACB'),
    ('970432', 'VPB'),
    ('970423', 'TPB'),
    ('970426', 'MSB'),
    ('970428', 'NAB'),
    ('970449', 'LPB'),
    ('970454', 'VCCB'),
    ('970418', 'BIDV'),
    ('970403', 'STB'),
    ('970441', 'VIB'),
    ('970437', 'HDB'),
    ('970440', 'SEAB'),
    ('970408', 'GPB'),
    ('970412', 'PVCB'),
    ('971133', 'PVCBP'),
    ('970419', 'NCB'),
    ('970424', 'SHBVN'),
    ('970429', 'SCB'),
    ('970430', 'PGB'),
    ('970405', 'VBA'),
    ('970407', 'TCB'),
    ('970400', 'SGICB'),
    ('970406', 'DOB'),
    ('970409', 'BAB'),
    ('970410', 'SCVN'),
    ('970414', 'OCEANBANK'),
    ('970421', 'VRB'),
    ('970425', 'ABB'),
    ('970427', 'VAB'),
    ('970431', 'EIB'),
    ('970433', 'VIETBANK'),
    ('970434', 'IVB'),
    ('970438', 'BVB'),
    ('970439', 'PBVN'),
    ('970443', 'SHB'),
    ('970444', 'CBB'),
    ('970448', 'OCB'),
    ('970452', 'KLB'),
    ('422589', 'CIMB'),
    ('458761', 'HSBC'),
    ('796500', 'DBS'),
    ('801011', 'NHBHN'),
    ('970442', 'HLBVN'),
    ('970455', 'IBKHN'),
    ('970456', 'IBKHCM'),
    ('970457', 'WVN'),
    ('970458', 'UOB'),
    ('970462', 'KBHN'),
    ('970463', 'KBHCM'),
    ('970446', 'COOPBANK'),
    ('971025', 'MOMO')
) AS m(bin, code)
WHERE b.bank_code = m.bin;

CREATE OR REPLACE FUNCTION public.get_public_qr_display_payload(p_branch_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'branch', jsonb_build_object(
      'id', b.id,
      'code', b.code,
      'name', b.name
    ),
    'bank', jsonb_build_object(
      'bank_account_number', a.bank_account_number,
      'bank_name', a.bank_name,
      'bank_code', a.bank_code,
      'bank_account_owner', a.bank_account_owner
    ),
    'display', jsonb_build_object(
      'booking_id', q.booking_id,
      'booking_code', q.booking_code,
      'customer_name', q.customer_name,
      'room_name', q.room_name,
      'check_in', q.check_in,
      'check_out', q.check_out,
      'total_amount', q.total_amount,
      'final_amount', q.final_amount,
      'updated_at', q.updated_at,
      'branch_id', q.branch_id
    )
  )
  INTO v_result
  FROM public.branches b
  INNER JOIN public.qr_display_state q ON q.branch_id = b.id
  LEFT JOIN public.branch_bank_accounts a ON a.branch_id = b.id
  WHERE lower(trim(b.code)) = lower(trim(p_branch_code))
    AND b.deleted_at IS NULL
    AND b.is_active = true
  LIMIT 1;

  RETURN v_result;
END;
$$;
