import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PAYMENT_STATUS,
  REPORTING_STATUS,
  REFUND_REQUEST_STATUS,
  REPORT_METRICS_BOOKING_STATUSES,
  ROOM_STATUS,
} from "@/lib/constants";
import { ReportSummary } from "../types";
import { parseBookingRevenueAmount } from "@/lib/reports/booking-revenue";
import { getReportBranchIdFromRequest } from "@/lib/reports/branch-filter";
import {
  countInventoryRoomsForOccupancy,
  summarizeRoomUsageInPeriod,
  sumAvailableRoomNightsInRange,
  totalRoomNightsInPeriod,
} from "@/lib/reports/occupancy-room-nights";

/**
 * GET /api/reports/summary
 *
 * Returns **mixed operational metrics** (different time bases). See `ReportSummary` JSDoc.
 * Query: `fromDate`, `toDate` (ISO).
 *
 * Gross revenue on the dashboard uses `grossRevenueByPaidAt` (sum of paid+included
 * `payments.amount` with `paid_at` in the window). `revenueByCheckIn` is booking value
 * by `check_in` date.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDateStr = searchParams.get("fromDate");
    const toDateStr = searchParams.get("toDate");

    if (!fromDateStr || !toDateStr) {
      return NextResponse.json(
        { error: "fromDate and toDate are required for summary report" },
        { status: 400 }
      );
    }

    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    const fromISO = fromDate.toISOString();
    const toISO = toDate.toISOString();
    const branchId = await getReportBranchIdFromRequest(searchParams);

    const supabase = await createClient();

    let bookingsQuery = supabase
      .from("bookings")
      .select("final_amount, total_amount, status")
      .is("deleted_at", null)
      .in("status", [...REPORT_METRICS_BOOKING_STATUSES])
      .gte("check_in", fromISO)
      .lte("check_in", toISO);
    if (branchId) bookingsQuery = bookingsQuery.eq("branch_id", branchId);

    let paymentsQuery = supabase
      .from("payments")
      .select("amount")
      .eq("payment_status", PAYMENT_STATUS.PAID)
      .eq("reporting_status", REPORTING_STATUS.INCLUDED)
      .not("paid_at", "is", null)
      .gte("paid_at", fromISO)
      .lte("paid_at", toISO);
    if (branchId) paymentsQuery = paymentsQuery.eq("branch_id", branchId);

    let roomsQuery = supabase
      .from("rooms")
      .select("id, status")
      .neq("status", ROOM_STATUS.MAINTENANCE)
      .is("deleted_at", null);
    if (branchId) roomsQuery = roomsQuery.eq("branch_id", branchId);

    let occupancyQuery = supabase
      .from("bookings")
      .select(
        "id, room_id, check_in, check_out, actual_check_out, status, booking_rooms(room_id)"
      )
      .is("deleted_at", null)
      .in("status", [...REPORT_METRICS_BOOKING_STATUSES])
      .lt("check_in", toISO)
      .gt("check_out", fromISO);
    if (branchId) occupancyQuery = occupancyQuery.eq("branch_id", branchId);

    let refundsQuery = supabase
      .from("refund_requests")
      .select("amount, bookings!inner(branch_id)")
      .eq("status", REFUND_REQUEST_STATUS.REFUNDED)
      .gte("updated_at", fromISO)
      .lte("updated_at", toISO);
    if (branchId) {
      refundsQuery = refundsQuery.eq("bookings.branch_id", branchId);
    }

    const [
      { data: currentBookings, error: bookingsError },
      { data: paidPaymentsInPeriod, error: paymentsSummaryError },
      { data: currentRefunds, error: refundsError },
      { data: totalRooms, error: roomsError },
      { data: currentBookingsForOccupancy, error: occupancyError },
    ] = await Promise.all([
      bookingsQuery,
      paymentsQuery,
      refundsQuery,
      roomsQuery,
      occupancyQuery,
    ]);

    if (
      bookingsError ||
      paymentsSummaryError ||
      refundsError ||
      roomsError ||
      occupancyError
    ) {
      return NextResponse.json(
        { error: "Error fetching report data" },
        { status: 500 }
      );
    }

    const revenueByCheckIn =
      currentBookings?.reduce(
        (sum, b) => sum + parseBookingRevenueAmount(b),
        0
      ) || 0;
    const grossRevenueByPaidAt =
      paidPaymentsInPeriod?.reduce((sum, p) => {
        const val =
          typeof p.amount === "string"
            ? parseFloat(p.amount)
            : p.amount || 0;
        return sum + (isNaN(val) ? 0 : val);
      }, 0) || 0;
    const bookingsByCheckIn = currentBookings?.length || 0;
    const refundCashflowByUpdatedAt =
      currentRefunds?.reduce(
        (sum, r) => {
          const val =
            typeof r.amount === "string"
              ? parseFloat(r.amount)
              : r.amount || 0;
          return sum + (isNaN(val) ? 0 : val);
        },
        0
      ) || 0;

    const inventoryRoomCount = countInventoryRoomsForOccupancy(totalRooms);
    const sellableRoomsPerDay = Math.max(inventoryRoomCount, 1);
    const availableRoomNightsInRange = sumAvailableRoomNightsInRange(
      fromDate,
      toDate,
      () => sellableRoomsPerDay
    );

    const currentRoomNights = totalRoomNightsInPeriod(
      currentBookingsForOccupancy || [],
      fromDate,
      toDate,
      REPORT_METRICS_BOOKING_STATUSES
    );
    const { roomUsage, earlyCheckOutCount, resoldRoomCount } =
      summarizeRoomUsageInPeriod(
        currentBookingsForOccupancy || [],
        fromDate,
        toDate,
        REPORT_METRICS_BOOKING_STATUSES
      );

    const occupancyPctFromRoomNights =
      availableRoomNightsInRange > 0
        ? (currentRoomNights / availableRoomNightsInRange) * 100
        : 0;
    const roomTurnoverRate =
      inventoryRoomCount > 0 ? roomUsage / inventoryRoomCount : 0;

    const summary: ReportSummary = {
      revenueByCheckIn: isNaN(revenueByCheckIn) ? 0 : revenueByCheckIn,
      grossRevenueByPaidAt: isNaN(grossRevenueByPaidAt)
        ? 0
        : grossRevenueByPaidAt,
      bookingsByCheckIn: isNaN(bookingsByCheckIn) ? 0 : bookingsByCheckIn,
      occupancyPctFromRoomNights: Math.min(
        Math.round(
          (isNaN(occupancyPctFromRoomNights) ? 0 : occupancyPctFromRoomNights) *
            100
        ) / 100,
        100
      ),
      refundCashflowByUpdatedAt: isNaN(refundCashflowByUpdatedAt)
        ? 0
        : refundCashflowByUpdatedAt,
      roomUsage: isNaN(roomUsage) ? 0 : roomUsage,
      roomTurnoverRate: isNaN(roomTurnoverRate)
        ? 0
        : Math.round(roomTurnoverRate * 100) / 100,
      earlyCheckOutCount: isNaN(earlyCheckOutCount) ? 0 : earlyCheckOutCount,
      resoldRoomCount: isNaN(resoldRoomCount) ? 0 : resoldRoomCount,
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error("Error fetching summary report:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
