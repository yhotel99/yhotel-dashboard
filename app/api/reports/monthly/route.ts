import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { REPORT_METRICS_BOOKING_STATUSES } from "@/lib/constants";
import { MonthlyRevenueData } from "../types";
import { parseBookingRevenueAmount } from "@/lib/reports/booking-revenue";
import { getReportBranchIdFromRequest } from "@/lib/reports/branch-filter";

function sumRevenueFromBookings(
  rows:
    | { final_amount?: unknown; total_amount?: unknown; status: string }[]
    | null
    | undefined
): number {
  return (
    rows?.reduce((sum, b) => sum + parseBookingRevenueAmount(b), 0) || 0
  );
}

/**
 * GET /api/reports/monthly
 *
 * **Time basis:** `check_in` calendar month + `REPORT_METRICS_BOOKING_STATUSES` only
 * (same event window as summary `revenueByCheckIn` / `bookingsByCheckIn`, rolled up by month).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monthsParam = searchParams.get("months");
    const numberOfMonths = Math.min(
      Math.max(parseInt(monthsParam || "6", 10), 1),
      12
    );

    const supabase = await createClient();
    const branchId = await getReportBranchIdFromRequest(searchParams);

    const now = new Date();
    const months: MonthlyRevenueData[] = [];

    for (let i = numberOfMonths - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1
      );
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      const monthStartISO = monthStart.toISOString();
      const monthEndISO = monthEnd.toISOString();

      let bookingsQuery = supabase
        .from("bookings")
        .select("id, final_amount, total_amount, status")
        .is("deleted_at", null)
        .in("status", [...REPORT_METRICS_BOOKING_STATUSES])
        .gte("check_in", monthStartISO)
        .lte("check_in", monthEndISO);
      if (branchId) bookingsQuery = bookingsQuery.eq("branch_id", branchId);
      const { data: bookingsInMonth, error: bookingsError } = await bookingsQuery;

      if (bookingsError) {
        console.error("Error fetching monthly data:", bookingsError);
        continue;
      }

      const revenue = sumRevenueFromBookings(bookingsInMonth);
      const bookings = bookingsInMonth?.length || 0;

      months.push({
        month: `Tháng ${monthDate.getMonth() + 1}`,
        revenue,
        bookings,
      });
    }

    return NextResponse.json(months);
  } catch (err) {
    console.error("Error fetching monthly report:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
