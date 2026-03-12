-- Migration: Add final_amount column to bookings
-- - final_amount: số tiền thanh toán cuối cùng (có thể khác total_amount)

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS final_amount numeric(14,2) NULL;

COMMENT ON COLUMN public.bookings.final_amount IS
  'Final amount to be paid by customer. If NULL, fall back to total_amount.';

