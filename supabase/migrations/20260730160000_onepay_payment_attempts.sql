-- ============================================================================
-- OnePay payment attempts: unique MerchTxnRef per pay attempt + audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.onepay_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merch_txn_ref text NOT NULL,
  session_id uuid REFERENCES public.checkout_sessions(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  payment_code text,
  expected_amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'success', 'failed', 'abandoned', 'needs_review')),
  vpc_transaction_no text,
  vpc_response_code text,
  raw_response jsonb,
  queried_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT onepay_payment_attempts_merch_txn_ref_key UNIQUE (merch_txn_ref),
  CONSTRAINT onepay_payment_attempts_target_chk CHECK (
    session_id IS NOT NULL OR booking_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_onepay_attempts_status_created
  ON public.onepay_payment_attempts (status, created_at)
  WHERE status = 'created';

CREATE INDEX IF NOT EXISTS idx_onepay_attempts_session
  ON public.onepay_payment_attempts (session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_onepay_attempts_booking
  ON public.onepay_payment_attempts (booking_id)
  WHERE booking_id IS NOT NULL;

ALTER TABLE public.onepay_payment_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onepay_payment_attempts_service_all ON public.onepay_payment_attempts;
CREATE POLICY onepay_payment_attempts_service_all ON public.onepay_payment_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.onepay_payment_attempts TO service_role;

COMMENT ON TABLE public.onepay_payment_attempts IS
  'OnePay pay attempts keyed by unique vpc_MerchTxnRef; used by return/IPN/QueryDR.';
