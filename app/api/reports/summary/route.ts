import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_STATUS, BOOKING_STATUS, REFUND_REQUEST_STATUS } from "@/lib/constants";
import { ReportSummary } from "../types";

/**
 * GET /api/reports/summary
 * Get summary report data
 * Query parameters:
 * - fromDate: Start date (ISO string, required)
 * - toDate: End date (ISO string, required)
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

    const supabase = await createClient();

    // Calculate previous period
    const periodDays = Math.ceil(
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const prevFromDate = new Date(fromDate);
    prevFromDate.setDate(prevFromDate.getDate() - periodDays);
    const prevToDate = new Date(fromDate);
    const prevFromISO = prevFromDate.toISOString();
    const prevToISO = prevToDate.toISOString();



    // Fetch current period data
    const [
      { data: currentPayments, error: paymentsError },
      { data: currentBookings, error: bookingsError },
      { data: currentRefunds, error: refundsError },
      { data: totalRooms, error: roomsError },
      { data: prevPayments, error: prevPaymentsError },
      { data: prevBookings, error: prevBookingsError },
      { data: prevRefunds, error: prevRefundsError },
    ] = await Promise.all([
      // Current period payments (paid)
      supabase
        .from("payments")
        .select("amount")
        .eq("payment_status", PAYMENT_STATUS.PAID)
        .gte("paid_at", fromISO)
        .lte("paid_at", toISO),
      // Current period bookings
      supabase
        .from("bookings")
        .select("total_amount, status")
        .is("deleted_at", null)
        .gte("created_at", fromISO)
        .lte("created_at", toISO),
      // Current period refunds
      supabase
        .from("refund_requests")
        .select("amount")
        .eq("status", REFUND_REQUEST_STATUS.REFUNDED)
        .gte("updated_at", fromISO)
        .lte("updated_at", toISO),
      // Total rooms
      supabase
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      // Previous period payments
      supabase
        .from("payments")
        .select("amount")
        .eq("payment_status", PAYMENT_STATUS.PAID)
        .gte("paid_at", prevFromISO)
        .lte("paid_at", prevToISO),
      // Previous period bookings
      supabase
        .from("bookings")
        .select("total_amount, status")
        .is("deleted_at", null)
        .gte("created_at", prevFromISO)
        .lte("created_at", prevToISO),
      // Previous period refunds
      supabase
        .from("refund_requests")
        .select("amount")
        .eq("status", REFUND_REQUEST_STATUS.REFUNDED)
        .gte("updated_at", prevFromISO)
        .lte("updated_at", prevToISO),
    ]);

    if (
      paymentsError ||
      bookingsError ||
      refundsError ||
      roomsError ||
      prevPaymentsError ||
      prevBookingsError ||
      prevRefundsError
    ) {
      return NextResponse.json(
        { error: "Error fetching report data" },
        { status: 500 }
      );
    }

    // Calculate current period stats
    const totalRevenue =
      currentPayments?.reduce(
        (sum, p) => {
          const val = typeof p.amount === "string" ? parseFloat(p.amount) : (p.amount || 0);
          return sum + (isNaN(val) ? 0 : val);
        },
        0
      ) || 0;
    const totalBookings = currentBookings?.length || 0;
    const totalRefunded =
      currentRefunds?.reduce(
        (sum, r) => {
          const val = typeof r.amount === "string" ? parseFloat(r.amount) : (r.amount || 0);
          return sum + (isNaN(val) ? 0 : val);
        },
        0
      ) || 0;

    // Calculate occupancy (bookings that are checked_in or checked_out)
    const activeBookings =
      currentBookings?.filter(
        (b) =>
          b.status === BOOKING_STATUS.CHECKED_IN ||
          b.status === BOOKING_STATUS.CHECKED_OUT
      ).length || 0;
    const totalRoomsCount = totalRooms?.length || 1; // Avoid division by zero
    const averageOccupancy =
      totalRoomsCount > 0 ? (activeBookings / totalRoomsCount) * 100 : 0;

    // Calculate previous period stats
    const prevTotalRevenue =
      prevPayments?.reduce(
        (sum, p) => {
          const val = typeof p.amount === "string" ? parseFloat(p.amount) : (p.amount || 0);
          return sum + (isNaN(val) ? 0 : val);
        },
        0
      ) || 0;
    const prevTotalBookings = prevBookings?.length || 0;
    const prevTotalRefunded =
      prevRefunds?.reduce(
        (sum, r) => {
          const val = typeof r.amount === "string" ? parseFloat(r.amount) : (r.amount || 0);
          return sum + (isNaN(val) ? 0 : val);
        },
        0
      ) || 0;

    const prevActiveBookings =
      prevBookings?.filter(
        (b) =>
          b.status === BOOKING_STATUS.CHECKED_IN ||
          b.status === BOOKING_STATUS.CHECKED_OUT
      ).length || 0;
    const prevAverageOccupancy =
      totalRoomsCount > 0 ? (prevActiveBookings / totalRoomsCount) * 100 : 0;

    // Calculate growth rates
    const revenueGrowth =
      prevTotalRevenue > 0
        ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
        : 0;
    const bookingGrowth =
      prevTotalBookings > 0
        ? ((totalBookings - prevTotalBookings) / prevTotalBookings) * 100
        : 0;
    const occupancyGrowth =
      prevAverageOccupancy > 0
        ? ((averageOccupancy - prevAverageOccupancy) / prevAverageOccupancy) *
          100
        : 0;
    const refundGrowth =
      prevTotalRefunded > 0
        ? ((totalRefunded - prevTotalRefunded) / prevTotalRefunded) * 100
        : 0;

    const totalRevenueNum = isNaN(totalRevenue) ? 0 : totalRevenue;
    const totalBookingsNum = isNaN(totalBookings) ? 0 : totalBookings;
    const averageOccupancyNum = isNaN(averageOccupancy) ? 0 : averageOccupancy;
    const totalRefundedNum = isNaN(totalRefunded) ? 0 : totalRefunded;

    const summary: ReportSummary = {
      totalRevenue: totalRevenueNum,
      totalBookings: totalBookingsNum,
      averageOccupancy: Math.min(averageOccupancyNum, 100),
      totalRefunded: totalRefundedNum,
      revenueGrowth: isNaN(revenueGrowth) ? 0 : Math.round(revenueGrowth * 10) / 10,
      bookingGrowth: isNaN(bookingGrowth) ? 0 : Math.round(bookingGrowth * 10) / 10,
      occupancyGrowth: isNaN(occupancyGrowth) ? 0 : Math.round(occupancyGrowth * 10) / 10,
      refundGrowth: isNaN(refundGrowth) ? 0 : Math.round(refundGrowth * 10) / 10,
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error("Error fetching summary report:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

