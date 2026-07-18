import { BOOKING_STATUS, REPORT_METRICS_BOOKING_STATUSES } from "@/lib/constants";
import { parseBookingRevenueAmount } from "@/lib/reports/booking-revenue";
import {
  type OccupancyBookingRow,
  roomNightsInPeriodForBooking,
} from "@/lib/reports/occupancy-room-nights";

export type RevenueBookingRow = OccupancyBookingRow & {
  id: string;
  customer_id?: string | null;
  booking_code?: string | null;
  final_amount?: unknown;
  total_amount?: unknown;
  voucher_discount?: unknown;
  customers?: { full_name?: string | null; source?: string | null } | null;
  rooms?: {
    name?: string | null;
    room_type?: string | null;
    floor_number?: number | null;
  } | null;
  booking_rooms?: Array<{
    room_id?: string | null;
    rooms?: {
      name?: string | null;
      room_type?: string | null;
      floor_number?: number | null;
    } | null;
  }> | null;
};

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function defaultRoomCount(booking: OccupancyBookingRow): number {
  return booking.booking_rooms?.length ? booking.booking_rooms.length : 1;
}

/** Total room-nights for the full stay (for proportional stay-date revenue allocation). */
export function fullStayRoomNights(booking: RevenueBookingRow): number {
  if (
    !booking.check_in ||
    !booking.check_out ||
    !REPORT_METRICS_BOOKING_STATUSES.includes(
      booking.status as (typeof REPORT_METRICS_BOOKING_STATUSES)[number]
    )
  ) {
    return 0;
  }
  const checkIn = startOfLocalDay(new Date(booking.check_in));
  const checkOut = startOfLocalDay(
    new Date(booking.actual_check_out ?? booking.check_out)
  );
  const lastStayNight = new Date(checkOut);
  lastStayNight.setDate(lastStayNight.getDate() - 1);
  lastStayNight.setHours(0, 0, 0, 0);

  return roomNightsInPeriodForBooking(
    booking,
    checkIn,
    lastStayNight,
    REPORT_METRICS_BOOKING_STATUSES
  );
}

export function toYyyyMmDdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Ngày lịch theo Asia/Ho_Chi_Minh — đồng bộ tiền về / check-out với khách sạn VN (server có thể UTC). */
export function toYyyyMmDdVN(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

/** Instant 00:00 ngày lịch VN (không phụ thuộc TZ process Node/Vercel). */
export function startOfDayVNFromKey(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00+07:00`);
}

/** Instant 23:59:59.999 ngày lịch VN. */
export function endOfDayVNFromKey(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T23:59:59.999+07:00`);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Mỗi ngày từ start đến end (YYYY-MM-DD so sánh được). */
export function iterateYyyyMmDdInclusive(start: string, end: string): string[] {
  if (start > end) return [];
  const out: string[] = [];
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  let y = sy;
  let m = sm;
  let d = sd;
  for (;;) {
    const label = `${y}-${pad2(m)}-${pad2(d)}`;
    out.push(label);
    if (y === ey && m === em && d === ed) break;
    const dim = new Date(y, m, 0).getDate();
    d++;
    if (d > dim) {
      d = 1;
      m++;
    }
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

/** Chuỗi ngày VN giữa hai mốc thời gian (theo lịch Việt Nam). */
export function eachCalendarDayVN(from: Date, to: Date): string[] {
  return iterateYyyyMmDdInclusive(toYyyyMmDdVN(from), toYyyyMmDdVN(to));
}

/** Operating (stay-date) revenue attributed to the window — proportional to room-nights in window. */
export function operatingRevenueInWindow(booking: RevenueBookingRow, from: Date, to: Date): number {
  const total = parseBookingRevenueAmount(booking);
  const denom = fullStayRoomNights(booking);
  if (total <= 0 || denom <= 0) return 0;
  const inWin = roomNightsInPeriodForBooking(
    booking,
    from,
    to,
    REPORT_METRICS_BOOKING_STATUSES
  );
  return (total * inWin) / denom;
}

/** Calendar date string for checkout (actual if present). */
export function checkoutCalendarDate(booking: RevenueBookingRow): string | null {
  const raw = booking.actual_check_out ?? booking.check_out;
  if (!raw) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    const head = s.split("T")[0] ?? "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(head)) {
      if (!s.includes("T")) return head;
      return toYyyyMmDdVN(new Date(s));
    }
  }
  return toYyyyMmDdVN(new Date(raw as string));
}

/** Night-by-night operating contribution while guest is in-house (for expandable rows). */
export function nightlyOperatingBreakdown(
  booking: RevenueBookingRow,
  periodStart: Date,
  periodEnd: Date
): { date: string; amount: number }[] {
  const total = parseBookingRevenueAmount(booking);
  const denom = fullStayRoomNights(booking);
  if (total <= 0 || denom <= 0 || !booking.check_in || !booking.check_out) return [];

  const checkIn = startOfLocalDay(new Date(booking.check_in));
  const checkOut = startOfLocalDay(
    new Date(booking.actual_check_out ?? booking.check_out)
  );
  const lastStayNight = new Date(checkOut);
  lastStayNight.setDate(lastStayNight.getDate() - 1);
  lastStayNight.setHours(0, 0, 0, 0);

  const p0 = startOfLocalDay(periodStart);
  const p1 = startOfLocalDay(periodEnd);

  const overlapStart =
    checkIn.getTime() > p0.getTime() ? checkIn : p0;
  const overlapEnd =
    lastStayNight.getTime() < p1.getTime() ? lastStayNight : p1;

  if (overlapStart.getTime() > overlapEnd.getTime()) return [];

  const perUnit = total / denom;
  const roomCount = defaultRoomCount(booking);
  const row: { date: string; amount: number }[] = [];
  const cursor = new Date(overlapStart);
  while (cursor.getTime() <= overlapEnd.getTime()) {
    row.push({
      date: toYyyyMmDdVN(cursor),
      amount: perUnit * roomCount,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return row;
}

/** Night-by-night allocation of unpaid balance (for AR trend / exposure by stay night). */
export function nightlyRemainingBreakdown(
  booking: RevenueBookingRow,
  paidTotal: number,
  periodStart: Date,
  periodEnd: Date
): { date: string; amount: number }[] {
  const total = parseBookingRevenueAmount(booking);
  const remaining = Math.max(0, total - paidTotal);
  const denom = fullStayRoomNights(booking);
  if (remaining <= 0 || denom <= 0 || !booking.check_in || !booking.check_out) return [];

  const checkIn = startOfLocalDay(new Date(booking.check_in));
  const checkOut = startOfLocalDay(
    new Date(booking.actual_check_out ?? booking.check_out)
  );
  const lastStayNight = new Date(checkOut);
  lastStayNight.setDate(lastStayNight.getDate() - 1);
  lastStayNight.setHours(0, 0, 0, 0);

  const p0 = startOfLocalDay(periodStart);
  const p1 = startOfLocalDay(periodEnd);

  const overlapStart =
    checkIn.getTime() > p0.getTime() ? checkIn : p0;
  const overlapEnd =
    lastStayNight.getTime() < p1.getTime() ? lastStayNight : p1;

  if (overlapStart.getTime() > overlapEnd.getTime()) return [];

  const perUnit = remaining / denom;
  const roomCount = defaultRoomCount(booking);
  const row: { date: string; amount: number }[] = [];
  const cursor = new Date(overlapStart);
  while (cursor.getTime() <= overlapEnd.getTime()) {
    row.push({
      date: toYyyyMmDdVN(cursor),
      amount: perUnit * roomCount,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return row;
}

export function countOngoingStayContributions(
  bookings: RevenueBookingRow[],
  day: Date
): number {
  const d0 = startOfLocalDay(day);
  let n = 0;
  for (const b of bookings) {
    if (b.status !== BOOKING_STATUS.CHECKED_IN) continue;
    const checkIn = startOfLocalDay(new Date(b.check_in!));
    const checkOut = startOfLocalDay(
      new Date(b.actual_check_out ?? b.check_out!)
    );
    const lastStayNight = new Date(checkOut);
    lastStayNight.setDate(lastStayNight.getDate() - 1);
    lastStayNight.setHours(0, 0, 0, 0);
    if (checkIn.getTime() <= d0.getTime() && lastStayNight.getTime() >= d0.getTime()) {
      n += 1;
    }
  }
  return n;
}
