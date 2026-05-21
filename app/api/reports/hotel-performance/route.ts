import { NextRequest, NextResponse } from "next/server";
import {
  differenceInCalendarDays,
  startOfDay,
  endOfDay,
  subDays,
} from "date-fns";
import { createClient } from "@/lib/supabase/server";
import {
  BOOKING_STATUS,
  CUSTOMER_SOURCE,
  PAYMENT_METHOD,
  REPORTING_STATUS,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  REPORT_METRICS_BOOKING_STATUSES,
  ROOM_STATUS,
  bookingStatusLabels,
  customerSourceLabels,
  paymentMethodLabels,
  roomTypeLabels,
} from "@/lib/constants";
import type { Room } from "@/lib/types";
import { parseBookingRevenueAmount } from "@/lib/reports/booking-revenue";
import {
  bookingMatchesFilters,
  collectRoomTypes,
  getBookingCustomer,
  matchesBookingAnalyticsDetail,
  type AnalyticsDetailFilters,
} from "@/lib/reports/booking-report-filters";
import {
  parseLocalDateOnly,
  totalRoomNightsInPeriod,
  countInventoryRoomsForOccupancy,
  sumAvailableRoomNightsInRange,
} from "@/lib/reports/occupancy-room-nights";
import {
  checkoutCalendarDate,
  countOngoingStayContributions,
  eachCalendarDayVN,
  fullStayRoomNights,
  nightlyOperatingBreakdown,
  nightlyRemainingBreakdown,
  operatingRevenueInWindow,
  toYyyyMmDdVN,
  type RevenueBookingRow,
} from "@/lib/reports/revenue-dashboard-math";

export const dynamic = "force-dynamic";

function parsePaymentAmount(p: { amount?: unknown }): number {
  const raw = p.amount;
  const val =
    typeof raw === "string" ? parseFloat(raw) : (raw as number) || 0;
  return Number.isFinite(val) ? val : 0;
}

function parseDiscountAmount(b: RevenueBookingRow): number {
  const raw = b.voucher_discount;
  const val =
    typeof raw === "string" ? parseFloat(raw) : (raw as number) || 0;
  return Number.isFinite(val) ? Math.max(0, val) : 0;
}

function addDailyOperatingForBooking(
  booking: RevenueBookingRow,
  periodStart: Date,
  periodEnd: Date,
  dailyMap: Map<string, number>
) {
  const rows = nightlyOperatingBreakdown(booking, periodStart, periodEnd);
  for (const { date, amount } of rows) {
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + amount);
  }
}

function addDailyRemainingForBooking(
  booking: RevenueBookingRow,
  paid: number,
  periodStart: Date,
  periodEnd: Date,
  dailyMap: Map<string, number>
) {
  const rows = nightlyRemainingBreakdown(booking, paid, periodStart, periodEnd);
  for (const { date, amount } of rows) {
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + amount);
  }
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function parseOptFloat(v: string | null): number | null {
  if (v == null || v === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function parseOptInt(v: string | null): number | null {
  if (v == null || v === "") return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

/** `floor=1,2` hoặc `floor=1&floor=2`; bỏ qua `all` và chuỗi rỗng. */
function parseFloorParams(searchParams: URLSearchParams): {
  floors: number[];
  error: string | null;
} {
  const nums: number[] = [];
  for (const raw of searchParams.getAll("floor")) {
    for (const part of raw.split(",")) {
      const t = part.trim();
      if (!t || t === "all") continue;
      const n = parseInt(t, 10);
      if (!Number.isFinite(n)) {
        return { floors: [], error: "floor không hợp lệ" };
      }
      nums.push(n);
    }
  }
  return {
    floors: [...new Set(nums)].sort((a, b) => a - b),
    error: null,
  };
}

/** One UI preset token → concrete booking statuses (union when multiple tokens). */
function statusesForPresetToken(token: string): readonly string[] {
  const k = token.trim();
  if (k === "all") return [...REPORT_METRICS_BOOKING_STATUSES];
  if (k === "confirmed") return [BOOKING_STATUS.CONFIRMED];
  if (k === "checked_in") return [BOOKING_STATUS.CHECKED_IN];
  if (k === "checked_out") return [BOOKING_STATUS.CHECKED_OUT];
  if (k === "pipeline")
    return [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN];
  return [];
}

/**
 * Supports `statusPreset=a,b` and repeated `statusPreset=a&statusPreset=b`.
 * Empty / omitted → same as "all". Unknown tokens contribute nothing; if none match, fallback to all.
 */
function parseStatusPresetsFromSearchParams(
  searchParams: URLSearchParams
): readonly string[] {
  const tokens: string[] = [];
  for (const raw of searchParams.getAll("statusPreset")) {
    for (const part of raw.split(",")) {
      const t = part.trim();
      if (t) tokens.push(t);
    }
  }
  if (tokens.length === 0) return [...REPORT_METRICS_BOOKING_STATUSES];
  if (tokens.includes("all")) return [...REPORT_METRICS_BOOKING_STATUSES];
  const set = new Set<string>();
  for (const tok of tokens) {
    for (const st of statusesForPresetToken(tok)) set.add(st);
  }
  if (set.size === 0) return [...REPORT_METRICS_BOOKING_STATUSES];
  return [...set];
}

function narrowBookingsByPaymentsAndBalance(
  candidates: RevenueBookingRow[],
  paymentsPeriod:
    | { booking_id?: string | null; payment_method?: string | null }[]
    | null,
  paidByBooking: Map<string, number>,
  paymentMethod: string | null,
  balance: "all" | "unpaid" | "paid"
): RevenueBookingRow[] {
  let rows = candidates;
  if (paymentMethod) {
    const ok = new Set<string>();
    for (const p of paymentsPeriod ?? []) {
      const bid = p.booking_id;
      if (bid && p.payment_method === paymentMethod) ok.add(bid);
    }
    rows = rows.filter((b) => ok.has(b.id));
  }
  return rows.filter((b) => {
    const totalVal = parseBookingRevenueAmount(b);
    const paid = paidByBooking.get(b.id) ?? 0;
    const rem = Math.max(0, totalVal - paid);
    if (balance === "unpaid") return rem > 0.01;
    if (balance === "paid") return rem <= 0.01;
    return true;
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDateStr = searchParams.get("fromDate");
    const toDateStr = searchParams.get("toDate");
    const roomType = searchParams.get("roomType") || null;
    const source = searchParams.get("source") || null;
    const balance = (searchParams.get("balance") || "all") as
      | "all"
      | "unpaid"
      | "paid";
    const paymentMethod = searchParams.get("paymentMethod") || null;

    const { floors: floorsFilter, error: floorParamsError } =
      parseFloorParams(searchParams);
    if (floorParamsError) {
      return NextResponse.json({ error: floorParamsError }, { status: 400 });
    }

    const detailFilters: AnalyticsDetailFilters = {
      minAmount: parseOptFloat(searchParams.get("minAmount")),
      maxAmount: parseOptFloat(searchParams.get("maxAmount")),
      minNights: parseOptInt(searchParams.get("minNights")),
      maxNights: parseOptInt(searchParams.get("maxNights")),
      floors: floorsFilter,
      search: searchParams.get("search") || null,
    };

    if (!fromDateStr || !toDateStr) {
      return NextResponse.json(
        { error: "fromDate and toDate are required" },
        { status: 400 }
      );
    }

    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const periodStart = startOfDay(fromDate);
    const periodEnd = endOfDay(toDate);
    const fromISO = periodStart.toISOString();
    const toISO = periodEnd.toISOString();

    const daySpan = Math.max(1, differenceInCalendarDays(periodEnd, periodStart) + 1);
    const prevPeriodEnd = endOfDay(subDays(periodStart, 1));
    const prevPeriodStart = startOfDay(subDays(prevPeriodEnd, daySpan - 1));
    const prevFromISO = prevPeriodStart.toISOString();
    const prevToISO = prevPeriodEnd.toISOString();

    const statusList = parseStatusPresetsFromSearchParams(searchParams);

    const supabase = await createClient();

    const bookingSelect = `id, booking_code, check_in, check_out, actual_check_out, status, final_amount, total_amount, voucher_discount, customer_id,
          customers:customer_id ( id, full_name, source ),
          rooms:room_id ( name, room_type, floor_number ),
          booking_rooms ( room_id, rooms:room_id ( name, room_type, floor_number ) )`;

    const bookingSelectPrev = `id, booking_code, check_in, check_out, actual_check_out, status, final_amount, total_amount, voucher_discount, customer_id,
          customers:customer_id ( id, full_name, source ),
          rooms:room_id ( name, room_type, floor_number ),
          booking_rooms ( room_id, rooms:room_id ( name, room_type, floor_number ) )`;

    const [
      { data: rooms, error: roomsError },
      { data: rawBookings, error: bookingsError },
      { data: rawBookingsPrev, error: bookingsPrevError },
      { count: cancelledInPeriod = 0 },
    ] = await Promise.all([
      supabase
        .from("rooms")
        .select("id, status, floor_number")
        .is("deleted_at", null)
        .neq("status", ROOM_STATUS.MAINTENANCE),
      supabase
        .from("bookings")
        .select(bookingSelect)
        .is("deleted_at", null)
        .in("status", [...statusList])
        .lt("check_in", toISO)
        .gt("check_out", fromISO),
      supabase
        .from("bookings")
        .select(bookingSelectPrev)
        .is("deleted_at", null)
        .in("status", [...statusList])
        .lt("check_in", prevToISO)
        .gt("check_out", prevFromISO),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", BOOKING_STATUS.CANCELLED)
        .is("deleted_at", null)
        .gte("updated_at", fromISO)
        .lte("updated_at", toISO),
    ]);

    if (roomsError || bookingsError || bookingsPrevError) {
      console.error(roomsError, bookingsError, bookingsPrevError);
      return NextResponse.json(
        { error: "Error fetching hotel performance data" },
        { status: 500 }
      );
    }

    function passDetail(b: RevenueBookingRow): boolean {
      return matchesBookingAnalyticsDetail(
        b,
        parseBookingRevenueAmount(b),
        fullStayRoomNights(b),
        detailFilters
      );
    }

    const candidates = ((rawBookings ?? []) as RevenueBookingRow[])
      .filter((b) => bookingMatchesFilters(b, roomType, source))
      .filter(passDetail);

    const candidatesPrev = ((rawBookingsPrev ?? []) as RevenueBookingRow[])
      .filter((b) => bookingMatchesFilters(b, roomType, source))
      .filter(passDetail);

    const candIds = candidates.map((b) => b.id);
    const candPrevIds = candidatesPrev.map((b) => b.id);
    const candIdSet = new Set(candIds);
    const candPrevIdSet = new Set(candPrevIds);

    const today = startOfDay(new Date());

    const [
      { data: paymentsPeriod },
      { data: paymentsPrev },
      paidRowsResult,
      paidPrevRowsResult,
    ] = await Promise.all([
      candIds.length
        ? supabase
            .from("payments")
            .select(
              "amount, paid_at, payment_status, booking_id, payment_type, payment_method"
            )
            .eq("payment_status", PAYMENT_STATUS.PAID)
            .eq("reporting_status", REPORTING_STATUS.INCLUDED)
            .not("paid_at", "is", null)
            .gte("paid_at", fromISO)
            .lte("paid_at", toISO)
            .in("booking_id", candIds)
        : { data: [] as Record<string, unknown>[] },
      candPrevIds.length
        ? supabase
            .from("payments")
            .select(
              "amount, paid_at, payment_status, booking_id, payment_type, payment_method"
            )
            .eq("payment_status", PAYMENT_STATUS.PAID)
            .eq("reporting_status", REPORTING_STATUS.INCLUDED)
            .not("paid_at", "is", null)
            .gte("paid_at", prevFromISO)
            .lte("paid_at", prevToISO)
            .in("booking_id", candPrevIds)
        : { data: [] as Record<string, unknown>[] },
      candIds.length
        ? supabase
            .from("payments")
            .select("amount, payment_status, booking_id")
            .eq("payment_status", PAYMENT_STATUS.PAID)
            .eq("reporting_status", REPORTING_STATUS.INCLUDED)
            .in("booking_id", candIds)
        : { data: [] as Record<string, unknown>[] },
      candPrevIds.length
        ? supabase
            .from("payments")
            .select("amount, payment_status, booking_id")
            .eq("payment_status", PAYMENT_STATUS.PAID)
            .eq("reporting_status", REPORTING_STATUS.INCLUDED)
            .in("booking_id", candPrevIds)
        : { data: [] as Record<string, unknown>[] },
    ]);

    const paymentsPaidAllData = paidRowsResult.data;
    const paymentsPaidPrevAllData = paidPrevRowsResult.data;

    const paidByBooking = new Map<string, number>();
    for (const p of paymentsPaidAllData ?? []) {
      const bid = (p as { booking_id?: string }).booking_id;
      if (!bid || !candIdSet.has(bid)) continue;
      paidByBooking.set(
        bid,
        (paidByBooking.get(bid) ?? 0) +
          parsePaymentAmount(p as { amount?: unknown })
      );
    }

    const paidByBookingPrevMap = new Map<string, number>();
    for (const p of paymentsPaidPrevAllData ?? []) {
      const bid = (p as { booking_id?: string }).booking_id;
      if (!bid || !candPrevIdSet.has(bid)) continue;
      paidByBookingPrevMap.set(
        bid,
        (paidByBookingPrevMap.get(bid) ?? 0) +
          parsePaymentAmount(p as { amount?: unknown })
      );
    }

    const bookings = narrowBookingsByPaymentsAndBalance(
      candidates,
      (paymentsPeriod ?? []) as {
        booking_id?: string | null;
        payment_method?: string | null;
      }[],
      paidByBooking,
      paymentMethod,
      balance
    );

    const bookingsPrev = narrowBookingsByPaymentsAndBalance(
      candidatesPrev,
      (paymentsPrev ?? []) as {
        booking_id?: string | null;
        payment_method?: string | null;
      }[],
      paidByBookingPrevMap,
      paymentMethod,
      balance
    );

    const allowedIds = new Set(bookings.map((b) => b.id));
    const prevIds = new Set(bookingsPrev.map((b) => b.id));

    let cashRevenue = 0;
    for (const p of paymentsPeriod ?? []) {
      const bid = (p as { booking_id?: string }).booking_id;
      if (bid && allowedIds.has(bid)) {
        cashRevenue += parsePaymentAmount(p as { amount?: unknown });
      }
    }

    let cashRevenuePrev = 0;
    for (const p of paymentsPrev ?? []) {
      const bid = (p as { booking_id?: string }).booking_id;
      if (bid && prevIds.has(bid)) {
        cashRevenuePrev += parsePaymentAmount(p as { amount?: unknown });
      }
    }

    let operatingRevenue = 0;
    for (const b of bookings) {
      operatingRevenue += operatingRevenueInWindow(b, periodStart, periodEnd);
    }

    let operatingRevenuePrev = 0;
    for (const b of bookingsPrev) {
      operatingRevenuePrev += operatingRevenueInWindow(b, prevPeriodStart, prevPeriodEnd);
    }

    let accountsReceivable = 0;
    let unpaidActiveContributing = 0;
    for (const b of bookings) {
      const totalVal = parseBookingRevenueAmount(b);
      const paid = paidByBooking.get(b.id) ?? 0;
      const rem = Math.max(0, totalVal - paid);
      accountsReceivable += rem;
      if (rem > 0 && operatingRevenueInWindow(b, periodStart, periodEnd) > 0) {
        unpaidActiveContributing += 1;
      }
    }

    let checkoutRevenue = 0;
    const periodStartStr = toYyyyMmDdVN(periodStart);
    const periodEndStr = toYyyyMmDdVN(periodEnd);

    function dateInRange(isoDate: string): boolean {
      return isoDate >= periodStartStr && isoDate <= periodEndStr;
    }

    function dateInPrevRange(isoDate: string): boolean {
      const a = toYyyyMmDdVN(prevPeriodStart);
      const z = toYyyyMmDdVN(prevPeriodEnd);
      return isoDate >= a && isoDate <= z;
    }

    for (const b of bookings) {
      const cd = checkoutCalendarDate(b);
      if (cd && dateInRange(cd)) {
        checkoutRevenue += parseBookingRevenueAmount(b);
      }
    }

    let checkoutRevenuePrev = 0;
    for (const b of bookingsPrev) {
      const cd = checkoutCalendarDate(b);
      if (cd && dateInPrevRange(cd)) {
        checkoutRevenuePrev += parseBookingRevenueAmount(b);
      }
    }

    const inventoryRoomCount = countInventoryRoomsForOccupancy(rooms);
    const sellableRoomsPerDay = Math.max(inventoryRoomCount, 1);
    const availableRoomNightsInRange = sumAvailableRoomNightsInRange(
      periodStart,
      periodEnd,
      () => sellableRoomsPerDay
    );

    const soldRoomNights = totalRoomNightsInPeriod(
      bookings,
      periodStart,
      periodEnd,
      REPORT_METRICS_BOOKING_STATUSES
    );

    const soldRoomNightsPrev = totalRoomNightsInPeriod(
      bookingsPrev,
      prevPeriodStart,
      prevPeriodEnd,
      REPORT_METRICS_BOOKING_STATUSES
    );

    const availablePrev = sumAvailableRoomNightsInRange(
      prevPeriodStart,
      prevPeriodEnd,
      () => sellableRoomsPerDay
    );

    const occupancyPct =
      availableRoomNightsInRange > 0
        ? Math.min((soldRoomNights / availableRoomNightsInRange) * 100, 100)
        : 0;

    const occupancyPctPrev =
      availablePrev > 0
        ? Math.min((soldRoomNightsPrev / availablePrev) * 100, 100)
        : 0;

    const adr = soldRoomNights > 0 ? operatingRevenue / soldRoomNights : 0;
    const adrPrev =
      soldRoomNightsPrev > 0 ? operatingRevenuePrev / soldRoomNightsPrev : 0;

    const revpar =
      availableRoomNightsInRange > 0
        ? operatingRevenue / availableRoomNightsInRange
        : 0;
    const revparPrev =
      availablePrev > 0 ? operatingRevenuePrev / availablePrev : 0;

    const dailyStay = new Map<string, number>();
    const dailyCash = new Map<string, number>();
    const dailyCheckout = new Map<string, number>();
    const dailyRemainingExposure = new Map<string, number>();

    for (const b of bookings) {
      addDailyOperatingForBooking(b, periodStart, periodEnd, dailyStay);
      const paid = paidByBooking.get(b.id) ?? 0;
      addDailyRemainingForBooking(b, paid, periodStart, periodEnd, dailyRemainingExposure);
    }

    for (const b of bookings) {
      const cd = checkoutCalendarDate(b);
      if (cd && dateInRange(cd)) {
        dailyCheckout.set(
          cd,
          (dailyCheckout.get(cd) ?? 0) + parseBookingRevenueAmount(b)
        );
      }
    }

    for (const p of paymentsPeriod ?? []) {
      const raw = p as { paid_at?: string | null; booking_id?: string };
      if (!raw.booking_id || !allowedIds.has(raw.booking_id) || !raw.paid_at) continue;
      const d = toYyyyMmDdVN(new Date(raw.paid_at));
      if (!dateInRange(d)) continue;
      dailyCash.set(d, (dailyCash.get(d) ?? 0) + parsePaymentAmount(p as { amount?: unknown }));
    }

    const dateKeys = eachCalendarDayVN(periodStart, periodEnd);

    const trend = dateKeys.map((date) => ({
      date,
      operating: dailyStay.get(date) ?? 0,
      cash: dailyCash.get(date) ?? 0,
      checkout: dailyCheckout.get(date) ?? 0,
      outstandingExposure: dailyRemainingExposure.get(date) ?? 0,
    }));

    const dailyMetrics = dateKeys.map((date) => {
      const d = parseLocalDateOnly(date);
      const sold = totalRoomNightsInPeriod(
        bookings,
        d,
        d,
        REPORT_METRICS_BOOKING_STATUSES
      );
      const op = dailyStay.get(date) ?? 0;
      const occ =
        sellableRoomsPerDay > 0
          ? Math.min((sold / sellableRoomsPerDay) * 100, 100)
          : 0;
      const adrDay = sold > 0 ? op / sold : 0;
      const revp =
        sellableRoomsPerDay > 0 ? op / sellableRoomsPerDay : 0;
      return { date, occupancyPct: occ, adr: adrDay, revpar: revp };
    });

    const heatmap = dailyMetrics.map((dm) => ({
      date: dm.date,
      occupancyPct: dm.occupancyPct,
      soldRoomNights: totalRoomNightsInPeriod(
        bookings,
        parseLocalDateOnly(dm.date),
        parseLocalDateOnly(dm.date),
        REPORT_METRICS_BOOKING_STATUSES
      ),
      availableRooms: sellableRoomsPerDay,
    }));

    let revenueComposition = {
      roomRevenue: 0,
      advanceDeposits: 0,
      extraServices: 0,
      discounts: 0,
      taxes: 0,
    };

    for (const p of paymentsPeriod ?? []) {
      const row = p as {
        booking_id?: string | null;
        amount?: unknown;
        payment_type?: string | null;
      };
      if (!row.booking_id || !allowedIds.has(row.booking_id)) continue;
      const amt = parsePaymentAmount(row);
      const pt = row.payment_type;
      if (pt === PAYMENT_TYPE.ROOM_CHARGE) revenueComposition.roomRevenue += amt;
      else if (pt === PAYMENT_TYPE.ADVANCE_PAYMENT)
        revenueComposition.advanceDeposits += amt;
      else if (pt === PAYMENT_TYPE.EXTRA_SERVICE)
        revenueComposition.extraServices += amt;
      else revenueComposition.roomRevenue += amt;
    }

    for (const b of bookings) {
      revenueComposition.discounts += parseDiscountAmount(b);
    }

    const paymentMethodsMap = new Map<string, number>();
    for (const p of paymentsPeriod ?? []) {
      const row = p as {
        booking_id?: string | null;
        payment_method?: string | null;
        amount?: unknown;
      };
      if (!row.booking_id || !allowedIds.has(row.booking_id)) continue;
      const key = row.payment_method || "unknown";
      paymentMethodsMap.set(key, (paymentMethodsMap.get(key) ?? 0) + parsePaymentAmount(row));
    }

    const paymentMethodsBreakdown = Array.from(paymentMethodsMap.entries()).map(
      ([method, amount]) => ({
        method,
        label:
          paymentMethodLabels[method as keyof typeof paymentMethodLabels] ||
          method,
        amount,
      })
    );

    const agingBuckets = { d0_3: 0, d4_7: 0, d8plus: 0 };
    let overdueBookings = 0;
    const msDay = 86400000;

    for (const b of bookings) {
      const totalVal = parseBookingRevenueAmount(b);
      const paid = paidByBooking.get(b.id) ?? 0;
      const rem = Math.max(0, totalVal - paid);
      if (rem <= 0) continue;

      const checkoutStr = checkoutCalendarDate(b);
      if (!checkoutStr) continue;
      const checkoutDay = parseLocalDateOnly(checkoutStr).getTime();
      const ageDays =
        checkoutDay <= today.getTime()
          ? Math.floor((today.getTime() - checkoutDay) / msDay)
          : 0;
      if (checkoutDay < today.getTime() && rem > 0) overdueBookings += 1;

      if (ageDays <= 3) agingBuckets.d0_3 += rem;
      else if (ageDays <= 7) agingBuckets.d4_7 += rem;
      else agingBuckets.d8plus += rem;
    }

    const roomTypePerformance = new Map<string, number>();
    for (const b of bookings) {
      const op = operatingRevenueInWindow(b, periodStart, periodEnd);
      const types = collectRoomTypes(b);
      const key = types[0] || "unknown";
      roomTypePerformance.set(key, (roomTypePerformance.get(key) ?? 0) + op);
    }

    const roomTypeBreakdown = Array.from(roomTypePerformance.entries()).map(
      ([type, operating]) => ({
        type,
        label: roomTypeLabels[type as Room["room_type"]] || type,
        operating,
      })
    );

    const customerBookingCount = new Map<string, number>();
    for (const b of bookings) {
      const cid = b.customer_id;
      if (!cid) continue;
      customerBookingCount.set(cid, (customerBookingCount.get(cid) ?? 0) + 1);
    }
    let uniqueNewGuests = 0;
    let uniqueReturningGuests = 0;
    for (const n of customerBookingCount.values()) {
      if (n > 1) uniqueReturningGuests += 1;
      else uniqueNewGuests += 1;
    }

    const nightsList = bookings.map((b) => fullStayRoomNights(b)).filter((n) => n > 0);
    const avgLengthOfStay =
      nightsList.length > 0
        ? nightsList.reduce((a, b) => a + b, 0) / nightsList.length
        : 0;

    const totalBookingsActive = bookings.length;
    const denomCx =
      (cancelledInPeriod ?? 0) + totalBookingsActive > 0
        ? (cancelledInPeriod ?? 0) + totalBookingsActive
        : 1;
    const cancellationRate = ((cancelledInPeriod ?? 0) / denomCx) * 100;

    const insights: {
      id: string;
      tone: "info" | "warning" | "accent" | "destructive";
      text: string;
    }[] = [];

    const ongoingStays = countOngoingStayContributions(bookings, today);

    if (unpaidActiveContributing > 0) {
      insights.push({
        id: "unpaid-active",
        tone: "accent",
        text: `${unpaidActiveContributing} booking đang ghi nhận doanh thu vận hành nhưng vẫn còn số chưa thu.`,
      });
    }

    if (operatingRevenue > 0 && cashRevenue < operatingRevenue * 0.65) {
      insights.push({
        id: "cash-gap",
        tone: "warning",
        text: `Tiền về thấp hơn doanh thu vận hành đáng kể (${((1 - cashRevenue / operatingRevenue) * 100).toFixed(0)}%) — kiểm tra công nợ và lịch thanh toán.`,
      });
    }

    if ((cancelledInPeriod ?? 0) > 0 && cancellationRate > 15) {
      insights.push({
        id: "cancel-high",
        tone: "destructive",
        text: `Tỷ lệ hủy trong kỳ khoảng ${cancellationRate.toFixed(1)}% — theo dõi OTA / chính sách.`,
      });
    }

    if (ongoingStays > 0) {
      insights.push({
        id: "ongoing",
        tone: "info",
        text: `${ongoingStays} lưu trú đang diễn ra vẫn đóng góp vào doanh thu theo đêm ở.`,
      });
    }

    const tableRows = bookings
      .map((b) => {
        const roomNames: string[] = [];
        if (b.rooms && typeof b.rooms === "object" && "name" in b.rooms) {
          roomNames.push(String((b.rooms as { name?: string }).name ?? ""));
        }
        if (Array.isArray(b.booking_rooms)) {
          for (const br of b.booking_rooms) {
            if (
              br &&
              typeof br === "object" &&
              "rooms" in br &&
              br.rooms &&
              typeof br.rooms === "object" &&
              "name" in br.rooms
            ) {
              const n = (br.rooms as { name?: string }).name;
              if (n) roomNames.push(n);
            }
          }
        }
        const roomLabel = [...new Set(roomNames.filter(Boolean))].join(", ") || "—";
        const guest = getBookingCustomer(b)?.full_name ?? null;

        const totalVal = parseBookingRevenueAmount(b);
        const paid = paidByBooking.get(b.id) ?? 0;
        const nights = fullStayRoomNights(b);
        const nightly = nightlyOperatingBreakdown(b, periodStart, periodEnd);
        const rem = Math.max(0, totalVal - paid);
        const checkoutStr = checkoutCalendarDate(b);
        let rowStatus: "staying" | "completed" | "overdue" | "balanced" = "balanced";
        if (b.status === BOOKING_STATUS.CHECKED_IN) rowStatus = "staying";
        else if (rem <= 0.01) rowStatus = "balanced";
        else if (checkoutStr && parseLocalDateOnly(checkoutStr).getTime() < today.getTime())
          rowStatus = "overdue";
        else rowStatus = "completed";

        return {
          id: b.id,
          bookingCode: b.booking_code ?? "—",
          room: roomLabel,
          guest: guest || "—",
          checkIn: b.check_in?.split("T")[0] ?? "",
          checkOut: b.check_out?.split("T")[0] ?? "",
          nights,
          totalValue: totalVal,
          paidAmount: paid,
          remaining: rem,
          status: rowStatus,
          statusLabel:
            rowStatus === "staying"
              ? "Đang ở"
              : rowStatus === "overdue"
                ? "Quá hạn thu"
                : rowStatus === "balanced"
                  ? "Đã đủ"
                  : bookingStatusLabels[b.status] ?? b.status,
          nightlyContribution: nightly.map((n) => ({
            date: n.date,
            amount: n.amount,
          })),
        };
      })
      .sort((a, b) => b.remaining - a.remaining);

    const floorsFromInventory = [
      ...new Set(
        (rooms ?? [])
          .map((r) => r.floor_number)
          .filter((n): n is number => n != null && Number.isFinite(Number(n)))
          .map((n) => Number(n))
      ),
    ].sort((a, b) => a - b);

    const filterOptions = {
      roomTypes: (Object.keys(roomTypeLabels) as Room["room_type"][]).map((key) => ({
        value: key,
        label: roomTypeLabels[key],
      })),
      sources: (Object.values(CUSTOMER_SOURCE) as string[]).map((value) => ({
        value,
        label: customerSourceLabels[value as keyof typeof customerSourceLabels],
      })),
      statusPresets: [
        { value: "all", label: "Tất cả (đã xác nhận +)" },
        { value: "pipeline", label: "Pipeline (chưa trả phòng)" },
        { value: "confirmed", label: "Đã xác nhận" },
        { value: "checked_in", label: "Đang ở" },
        { value: "checked_out", label: "Đã trả phòng" },
      ],
      balanceModes: [
        { value: "all", label: "Mọi trạng thái thu" },
        { value: "unpaid", label: "Còn nợ" },
        { value: "paid", label: "Đã thu đủ" },
      ],
      paymentMethods: (Object.values(PAYMENT_METHOD) as string[]).map((m) => ({
        value: m,
        label: paymentMethodLabels[m as keyof typeof paymentMethodLabels] ?? m,
      })),
      floors: floorsFromInventory.map((f) => ({ value: String(f), label: `Tầng ${f}` })),
    };

    const taxesNote =
      "Thuế suất chưa được tách dòng trong hệ thống — hiển thị 0 cho đến khi tích hợp kế toán.";

    return NextResponse.json({
      executive: {
        operatingRevenue,
        cashCollected: cashRevenue,
        accountsReceivable,
        occupancyPct,
        adr,
        revpar,
        checkoutReference: checkoutRevenue,
        changes: {
          operatingPct: pctChange(operatingRevenue, operatingRevenuePrev),
          cashPct: pctChange(cashRevenue, cashRevenuePrev),
          arPct: null,
          occupancyPct: pctChange(occupancyPct, occupancyPctPrev),
          adrPct: pctChange(adr, adrPrev),
          revparPct: pctChange(revpar, revparPrev),
          checkoutPct: pctChange(checkoutRevenue, checkoutRevenuePrev),
        },
      },
      trend,
      dailyMetrics,
      heatmap,
      financial: {
        revenueComposition: {
          ...revenueComposition,
          taxesNote,
        },
        paymentMethods: paymentMethodsBreakdown,
        outstanding: {
          totalUnpaid: accountsReceivable,
          overdueBookings,
          agingBuckets,
        },
      },
      occupancy: {
        soldRoomNights,
        availableRoomNights: availableRoomNightsInRange,
        roomTypeBreakdown,
      },
      guests: {
        totalBookings: totalBookingsActive,
        cancelledInPeriod: cancelledInPeriod ?? 0,
        cancellationRate,
        newVsReturning: {
          uniqueNewGuests,
          uniqueReturningGuests,
          note: "Khách 'quay lại' = có >1 booking trong tập booking trùng kỳ được lọc.",
        },
        avgLengthOfStay,
        noShowRate: null as number | null,
        noShowNote: "No-show chưa có trường riêng trong schema — để trống.",
      },
      insights,
      tableRows,
      meta: {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        ongoingStaysContributing: ongoingStays,
        unpaidOperatingGap: unpaidActiveContributing,
        filterOptions,
        branchNote: "Đơn cơ sở — mở rộng đa chi nhánh khi có dữ liệu.",
      },
    });
  } catch (err) {
    console.error("hotel-performance:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
