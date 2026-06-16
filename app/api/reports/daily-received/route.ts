import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PAYMENT_STATUS,
  REPORTING_STATUS,
  REPORT_METRICS_BOOKING_STATUSES,
} from "@/lib/constants";
import { getReportBranchIdFromRequest } from "@/lib/reports/branch-filter";
import {
  iterateYyyyMmDdInclusive,
  toYyyyMmDdVN,
} from "@/lib/reports/revenue-dashboard-math";
import { parseLocalDateOnly } from "@/lib/reports/occupancy-room-nights";

type BookingRow = {
  id: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
};

type PaymentRow = {
  booking_id: string | null;
  amount: number | string | null;
};

function parseAmount(value: number | string | null): number {
  const raw = typeof value === "string" ? Number.parseFloat(value) : value ?? 0;
  return Number.isFinite(raw) ? raw : 0;
}

function toDateKey(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return toYyyyMmDdVN(d);
}

function daysInclusive(startKey: string, endKey: string): number {
  const start = parseLocalDateOnly(startKey).getTime();
  const end = parseLocalDateOnly(endKey).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 86400000) + 1;
}

function forEachDayInclusive(
  startKey: string,
  endKey: string,
  cb: (dayKey: string) => void
) {
  const cursor = parseLocalDateOnly(startKey);
  const end = parseLocalDateOnly(endKey);
  while (cursor.getTime() <= end.getTime()) {
    cb(toYyyyMmDdVN(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDateStr = searchParams.get("fromDate");
    const toDateStr = searchParams.get("toDate");
    if (!fromDateStr || !toDateStr) {
      return NextResponse.json(
        { error: "fromDate and toDate are required" },
        { status: 400 }
      );
    }

    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const fromKey = toYyyyMmDdVN(fromDate);
    const toKey = toYyyyMmDdVN(toDate);
    if (fromKey > toKey) {
      return NextResponse.json({ error: "fromDate must be <= toDate" }, { status: 400 });
    }

    const supabase = await createClient();
    const branchId = await getReportBranchIdFromRequest(searchParams);

    const rangeDays = iterateYyyyMmDdInclusive(fromKey, toKey);
    const dailyMap = new Map<string, number>();
    for (const day of rangeDays) dailyMap.set(day, 0);

    let paymentsQuery = supabase
      .from("payments")
      .select("booking_id, amount")
      .eq("payment_status", PAYMENT_STATUS.PAID)
      .eq("reporting_status", REPORTING_STATUS.INCLUDED)
      .not("paid_at", "is", null)
      .gte("paid_at", fromDate.toISOString())
      .lte("paid_at", toDate.toISOString());
    if (branchId) paymentsQuery = paymentsQuery.eq("branch_id", branchId);
    const { data: paymentRows, error: paymentsError } = await paymentsQuery;

    if (paymentsError) {
      console.error("daily-received payments error:", paymentsError);
      return NextResponse.json({ error: "Error fetching payments" }, { status: 500 });
    }

    const payments = (paymentRows ?? []) as PaymentRow[];
    const bookingIds = [...new Set(payments.map((p) => p.booking_id).filter(Boolean))] as string[];
    if (bookingIds.length > 0) {
      const CHUNK_SIZE = 500;
      const bookingRows: BookingRow[] = [];
      for (let i = 0; i < bookingIds.length; i += CHUNK_SIZE) {
        const chunk = bookingIds.slice(i, i + CHUNK_SIZE);
        let bookingsQuery = supabase
          .from("bookings")
          .select("id, check_in, check_out, status")
          .is("deleted_at", null)
          .in("id", chunk)
          .in("status", [...REPORT_METRICS_BOOKING_STATUSES]);
        if (branchId) bookingsQuery = bookingsQuery.eq("branch_id", branchId);

        const { data, error: bookingsError } = await bookingsQuery;
        if (bookingsError) {
          console.error("daily-received bookings error:", bookingsError);
          return NextResponse.json({ error: "Error fetching bookings" }, { status: 500 });
        }
        bookingRows.push(...((data ?? []) as BookingRow[]));
      }

      const bookingMap = new Map<
        string,
        { checkInKey: string; checkOutKey: string; totalDays: number }
      >();
      for (const booking of bookingRows) {
        const checkInKey = toDateKey(booking.check_in);
        const checkOutKey = toDateKey(booking.check_out);
        if (!checkInKey || !checkOutKey || checkInKey > checkOutKey) continue;
        const totalDays = daysInclusive(checkInKey, checkOutKey);
        if (totalDays <= 0) continue;
        bookingMap.set(booking.id, { checkInKey, checkOutKey, totalDays });
      }

      for (const payment of payments) {
        const bookingId = payment.booking_id;
        if (!bookingId) continue;
        const booking = bookingMap.get(bookingId);
        if (!booking) continue;
        const amount = parseAmount(payment.amount);
        if (amount <= 0) continue;

        const dailyShare = amount / booking.totalDays;
        const overlapStart = booking.checkInKey > fromKey ? booking.checkInKey : fromKey;
        const overlapEnd = booking.checkOutKey < toKey ? booking.checkOutKey : toKey;
        if (overlapStart > overlapEnd) continue;

        forEachDayInclusive(overlapStart, overlapEnd, (day) => {
          dailyMap.set(day, (dailyMap.get(day) ?? 0) + dailyShare);
        });
      }
    }

    const data = rangeDays.map((date) => ({
      date,
      amount: dailyMap.get(date) ?? 0,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("daily-received report error:", error);
    const message =
      error instanceof Error ? error.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
