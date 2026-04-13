/**
 * Amount used for **revenue-by-check-in** KPIs (ops / dashboard), not payment-date accounting.
 * Uses `final_amount` when set, otherwise `total_amount`.
 */
export function parseBookingRevenueAmount(booking: {
  final_amount?: unknown;
  total_amount?: unknown;
}): number {
  const raw = booking.final_amount ?? booking.total_amount;
  const val =
    typeof raw === "string" ? parseFloat(raw) : (raw as number) || 0;
  return Number.isFinite(val) ? val : 0;
}
