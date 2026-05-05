import { CUSTOMER_SOURCE } from "@/lib/constants";
import type { RevenueBookingRow } from "@/lib/reports/revenue-dashboard-math";

export function normalizeCustomerSource(raw: string | null | undefined): string {
  const s = raw?.toLowerCase()?.trim() || "";
  if (!s) return CUSTOMER_SOURCE.OTHER;
  if (s === CUSTOMER_SOURCE.WEBSITE) return CUSTOMER_SOURCE.WEBSITE;
  if (s === CUSTOMER_SOURCE.AGODA) return CUSTOMER_SOURCE.AGODA;
  if (s === CUSTOMER_SOURCE.TRAVELOKA) return CUSTOMER_SOURCE.TRAVELOKA;
  if (
    s === CUSTOMER_SOURCE.BOOKING ||
    s.includes("booking.com") ||
    s.includes("booking_com")
  ) {
    return CUSTOMER_SOURCE.BOOKING;
  }
  return CUSTOMER_SOURCE.OTHER;
}

export function collectRoomTypes(b: RevenueBookingRow): string[] {
  const primary =
    b.rooms && typeof b.rooms === "object" && "room_type" in b.rooms
      ? (b.rooms as { room_type?: string }).room_type
      : null;
  const out = new Set<string>();
  if (primary) out.add(primary);
  const br = b.booking_rooms;
  if (Array.isArray(br)) {
    for (const row of br) {
      const rt =
        row &&
        typeof row === "object" &&
        "rooms" in row &&
        row.rooms &&
        typeof row.rooms === "object" &&
        "room_type" in row.rooms
          ? (row.rooms as { room_type?: string }).room_type
          : null;
      if (rt) out.add(rt);
    }
  }
  return [...out];
}

export function getBookingCustomer(
  b: RevenueBookingRow
): { full_name?: string | null; source?: string | null } | null {
  const c = b.customers;
  if (!c) return null;
  const row = Array.isArray(c) ? c[0] : c;
  if (!row || typeof row !== "object") return null;
  return row as { full_name?: string | null; source?: string | null };
}

export function bookingMatchesFilters(
  b: RevenueBookingRow,
  roomType: string | null,
  source: string | null
): boolean {
  if (roomType && !collectRoomTypes(b).includes(roomType)) return false;
  if (source) {
    const cust = getBookingCustomer(b);
    if (normalizeCustomerSource(cust?.source || undefined) !== source)
      return false;
  }
  return true;
}

export function collectFloors(b: RevenueBookingRow): number[] {
  const out = new Set<number>();
  const p =
    b.rooms && typeof b.rooms === "object" && "floor_number" in b.rooms
      ? (b.rooms as { floor_number?: number | null }).floor_number
      : null;
  if (p != null && Number.isFinite(Number(p))) out.add(Number(p));
  if (Array.isArray(b.booking_rooms)) {
    for (const br of b.booking_rooms) {
      const f =
        br?.rooms &&
        typeof br.rooms === "object" &&
        "floor_number" in br.rooms
          ? (br.rooms as { floor_number?: number | null }).floor_number
          : null;
      if (f != null && Number.isFinite(Number(f))) out.add(Number(f));
    }
  }
  return [...out];
}

export type AnalyticsDetailFilters = {
  minAmount: number | null;
  maxAmount: number | null;
  minNights: number | null;
  maxNights: number | null;
  /** Rỗng = không lọc theo tầng; booking khớp nếu có ít nhất một phòng thuộc tầng đã chọn. */
  floors: readonly number[];
  search: string | null;
};

/** Lọc theo giá trị booking, số đêm, tầng, tên khách (sau khi đã lọc loại phòng / nguồn). */
export function matchesBookingAnalyticsDetail(
  b: RevenueBookingRow,
  totalAmount: number,
  stayNights: number,
  opts: AnalyticsDetailFilters
): boolean {
  if (opts.minAmount != null && totalAmount < opts.minAmount) return false;
  if (opts.maxAmount != null && totalAmount > opts.maxAmount) return false;
  if (opts.minNights != null && stayNights < opts.minNights) return false;
  if (opts.maxNights != null && stayNights > opts.maxNights) return false;
  if (opts.floors.length > 0) {
    const bf = new Set(collectFloors(b));
    if (!opts.floors.some((f) => bf.has(f))) return false;
  }
  const q = opts.search?.trim().toLowerCase();
  if (q) {
    const name = getBookingCustomer(b)?.full_name?.toLowerCase() ?? "";
    if (!name.includes(q)) return false;
  }
  return true;
}
