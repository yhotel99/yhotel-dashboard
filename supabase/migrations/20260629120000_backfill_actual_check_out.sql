-- Backfill actual_check_out for bookings checked out before the app set the field.
-- Uses updated_at as best-effort timestamp of when status changed to checked_out.

UPDATE public.bookings
SET actual_check_out = updated_at
WHERE status = 'checked_out'
  AND actual_check_out IS NULL
  AND deleted_at IS NULL;

-- Same for check-in edge cases (status checked_in/checked_out but missing actual_check_in).
UPDATE public.bookings
SET actual_check_in = updated_at
WHERE status IN ('checked_in', 'checked_out')
  AND actual_check_in IS NULL
  AND deleted_at IS NULL;
