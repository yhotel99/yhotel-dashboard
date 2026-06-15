-- audit_logs: backfill branch_id for existing rows + index for branch filter

-- booking
UPDATE public.audit_logs al
SET branch_id = b.branch_id
FROM public.bookings b
WHERE al.branch_id IS NULL
  AND al.entity_type = 'booking'
  AND b.id::text = al.entity_id;

-- room (price.update)
UPDATE public.audit_logs al
SET branch_id = r.branch_id
FROM public.rooms r
WHERE al.branch_id IS NULL
  AND al.entity_type = 'room'
  AND r.id::text = al.entity_id;

-- payment
UPDATE public.audit_logs al
SET branch_id = COALESCE(p.branch_id, b.branch_id)
FROM public.payments p
LEFT JOIN public.bookings b ON b.id = p.booking_id
WHERE al.branch_id IS NULL
  AND al.entity_type = 'payment'
  AND p.id::text = al.entity_id;

-- refund (uses refund_requests.branch_id when migration 20260608120000 applied)
UPDATE public.audit_logs al
SET branch_id = COALESCE(rr.branch_id, b.branch_id)
FROM public.refund_requests rr
LEFT JOIN public.bookings b ON b.id = rr.booking_id
WHERE al.branch_id IS NULL
  AND al.entity_type = 'refund'
  AND rr.id::text = al.entity_id;

-- fallback: refund logs that only store bookingId in metadata
UPDATE public.audit_logs al
SET branch_id = b.branch_id
FROM public.bookings b
WHERE al.branch_id IS NULL
  AND al.entity_type = 'refund'
  AND al.metadata ? 'bookingId'
  AND b.id::text = al.metadata->>'bookingId';

CREATE INDEX IF NOT EXISTS idx_audit_logs_branch_id_created_at
  ON public.audit_logs (branch_id, created_at DESC)
  WHERE branch_id IS NOT NULL;
