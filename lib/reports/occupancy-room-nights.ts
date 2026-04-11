import { BOOKING_STATUS, ROOM_STATUS } from "@/lib/constants";

const MS_PER_DAY = 86400000;

/** Room rows excluded from inventory for occupancy denominator (bảo trì / không bán). */
export const OCCUPANCY_INVENTORY_EXCLUDED_ROOM_STATUSES = [
  ROOM_STATUS.MAINTENANCE,
] as const;

export type RoomInventoryRow = {
  status: string | null;
  deleted_at?: string | null;
};

export function countInventoryRoomsForOccupancy(
  rooms: RoomInventoryRow[] | null | undefined
): number {
  if (!rooms?.length) return 0;
  return rooms.filter(
    (r) =>
      !r.deleted_at &&
      r.status &&
      !(
        OCCUPANCY_INVENTORY_EXCLUDED_ROOM_STATUSES as readonly string[]
      ).includes(r.status)
  ).length;
}

/**
 * Sum of sellable room-nights: for each calendar day in [periodStart, periodEnd] (inclusive),
 * add `sellableRoomsOnDay(thatDay)`. Today’s snapshot uses a constant callback; swap in
 * per-day counts when you store historical OOO.
 */
export function sumAvailableRoomNightsInRange(
  periodStart: Date,
  periodEnd: Date,
  sellableRoomsOnDay: (day: Date) => number
): number {
  let sum = 0;
  const d = startOfLocalDay(periodStart);
  const end = startOfLocalDay(periodEnd);
  const cursor = new Date(d);
  while (cursor.getTime() <= end.getTime()) {
    sum += sellableRoomsOnDay(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return sum;
}

/** Parse `YYYY-MM-DD` as local calendar date at 00:00 (avoid UTC shift from `new Date(iso)`). */
export function parseLocalDateOnly(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Inclusive calendar days from a to b (both normalized to local start-of-day). */
function inclusiveLocalDayCount(a: Date, b: Date): number {
  const start = startOfLocalDay(a).getTime();
  const end = startOfLocalDay(b).getTime();
  if (end < start) return 0;
  return Math.floor((end - start) / MS_PER_DAY) + 1;
}

export type OccupancyBookingRow = {
  check_in: string | null;
  check_out: string | null;
  status: (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];
  booking_rooms?: Array<{ room_id: string }> | null;
};

const defaultRoomCount = (booking: OccupancyBookingRow): number =>
  booking.booking_rooms?.length ? booking.booking_rooms.length : 1;

/**
 * Room-nights attributed to a stay that overlap the report window [periodStart, periodEnd]
 * (local calendar days, inclusive).
 *
 * Same rule as legacy day-loop: occupied on calendar day D iff check_in ≤ D and check_out > D
 * (check_out normalized to local midnight = “departure calendar date”).
 *
 * Room multiplier: `booking_rooms.length` if that length is > 0, otherwise 1 (same as legacy
 * dashboard when `booking_rooms` is missing or `[]`).
 */
export function roomNightsInPeriodForBooking(
  booking: OccupancyBookingRow,
  periodStart: Date,
  periodEnd: Date,
  validStatuses: readonly OccupancyBookingRow["status"][]
): number {
  if (
    !booking.check_in ||
    !booking.check_out ||
    !validStatuses.includes(booking.status)
  ) {
    return 0;
  }

  const checkIn = startOfLocalDay(new Date(booking.check_in));
  const checkOut = startOfLocalDay(new Date(booking.check_out));
  const p0 = startOfLocalDay(periodStart);
  const p1 = startOfLocalDay(periodEnd);

  const lastStayNight = new Date(checkOut);
  lastStayNight.setDate(lastStayNight.getDate() - 1);
  lastStayNight.setHours(0, 0, 0, 0);

  const overlapStart =
    checkIn.getTime() > p0.getTime() ? checkIn : p0;
  const overlapEnd =
    lastStayNight.getTime() < p1.getTime() ? lastStayNight : p1;

  if (overlapStart.getTime() > overlapEnd.getTime()) return 0;

  const nights = inclusiveLocalDayCount(overlapStart, overlapEnd);
  const roomCount = defaultRoomCount(booking);

  return nights * roomCount;
}

/**
 * Sum of room-nights for all bookings (O(bookings), not O(bookings × days)).
 */
/** `validStatuses` should be `REPORT_METRICS_BOOKING_STATUSES` (confirmed+ only; no pending). */
export function totalRoomNightsInPeriod(
  bookings: OccupancyBookingRow[],
  periodStart: Date,
  periodEnd: Date,
  validStatuses: readonly OccupancyBookingRow["status"][]
): number {
  let sum = 0;
  for (const b of bookings) {
    sum += roomNightsInPeriodForBooking(b, periodStart, periodEnd, validStatuses);
  }
  return sum;
}
