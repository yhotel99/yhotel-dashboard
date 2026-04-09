import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  BOOKING_STATUS,
  REFUND_REQUEST_STATUS,
  ROOM_STATUS,
} from "@/lib/constants";
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

    // Calculate previous period (inclusive day count)
    const periodDays = Math.floor(
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    const prevFromDate = new Date(fromDate);
    prevFromDate.setDate(prevFromDate.getDate() - periodDays);
    const prevToDate = new Date(fromDate);
    prevToDate.setDate(prevToDate.getDate() - 1);
    const prevFromISO = prevFromDate.toISOString();
    const prevToISO = prevToDate.toISOString();



    // Fetch current period data
    const [
      { data: currentBookings, error: bookingsError },
      { data: currentRefunds, error: refundsError },
      { data: totalRooms, error: roomsError },
      { data: prevBookings, error: prevBookingsError },
      { data: prevRefunds, error: prevRefundsError },
      { data: currentBookingsForOccupancy, error: occupancyError },
      { data: prevBookingsForOccupancy, error: prevOccupancyError },
    ] = await Promise.all([
      // Current period bookings - for revenue calculation
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
      // Sellable rooms (exclude maintenance rooms)
      supabase
        .from("rooms")
        .select("id, status")
        .neq("status", ROOM_STATUS.MAINTENANCE)
        .is("deleted_at", null),
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
      // Current period bookings for occupancy - fetch all bookings that overlap with period
      supabase
        .from("bookings")
        .select("id, check_in, check_out, status, booking_rooms(room_id)")
        .is("deleted_at", null)
        .lt("check_in", toISO)
        .gt("check_out", fromISO),
      // Previous period bookings for occupancy
      supabase
        .from("bookings")
        .select("id, check_in, check_out, status, booking_rooms(room_id)")
        .is("deleted_at", null)
        .lt("check_in", prevToISO)
        .gt("check_out", prevFromISO),
    ]);

    if (
      bookingsError ||
      refundsError ||
      roomsError ||
      prevBookingsError ||
      prevRefundsError ||
      occupancyError ||
      prevOccupancyError
    ) {
      return NextResponse.json(
        { error: "Error fetching report data" },
        { status: 500 }
      );
    }

    // Calculate current period stats
    // Total Revenue = Sum of booking amounts from valid revenue statuses only
    const revenueStatuses = [
      BOOKING_STATUS.CONFIRMED,
      BOOKING_STATUS.CHECKED_IN,
      BOOKING_STATUS.CHECKED_OUT,
    ];
    const totalRevenue =
      currentBookings?.reduce(
        (sum, b) => {
          if (!revenueStatuses.includes(b.status)) {
            return sum;
          }
          const val = typeof b.total_amount === "string" ? parseFloat(b.total_amount) : (b.total_amount || 0);
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

    // Calculate occupancy rate using daily-based approach (industry standard)
    const totalRoomsCount = totalRooms?.length || 1;
    
    // Helper function to calculate occupied room-nights using daily iteration
    type OccupancyBooking = {
      check_in: string | null;
      check_out: string | null;
      status: (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];
      booking_rooms?: Array<{ room_id: string }> | null;
    };

    const calculateOccupiedRoomNights = (
      bookings: OccupancyBooking[],
      periodStart: Date,
      periodEnd: Date
    ): number => {
      const occupancyMap = new Map<string, number>();
      
      // Valid booking statuses for occupancy calculation
      const validStatuses: OccupancyBooking["status"][] = [
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.CHECKED_IN,
        BOOKING_STATUS.CHECKED_OUT
      ];
      
      for (const booking of bookings) {
        if (!booking.check_in || !booking.check_out || !validStatuses.includes(booking.status)) {
          continue;
        }
        
        const checkIn = new Date(booking.check_in);
        const checkOut = new Date(booking.check_out);
        
        // Normalize to date-only (remove time component for accurate comparison)
        checkIn.setHours(0, 0, 0, 0);
        checkOut.setHours(0, 0, 0, 0);
        
        // Count rooms for this booking (handle multi-room bookings)
        const roomCount = booking.booking_rooms?.length || 1;
        
        // Iterate each day in the report period
        const currentDay = new Date(periodStart);
        currentDay.setHours(0, 0, 0, 0);
        
        const periodEndNormalized = new Date(periodEnd);
        periodEndNormalized.setHours(0, 0, 0, 0);
        
        while (currentDay <= periodEndNormalized) {
          const dayKey = currentDay.toISOString().split('T')[0];
          
          // Room is occupied on day D if: check_in <= D AND check_out > D
          if (checkIn <= currentDay && checkOut > currentDay) {
            occupancyMap.set(dayKey, (occupancyMap.get(dayKey) || 0) + roomCount);
          }
          
          currentDay.setDate(currentDay.getDate() + 1);
        }
      }
      
      // Sum all occupied room-nights
      return Array.from(occupancyMap.values()).reduce((sum, count) => sum + count, 0);
    };
    
    // Calculate current period occupancy
    const currentRoomNights = calculateOccupiedRoomNights(
      currentBookingsForOccupancy || [],
      fromDate,
      toDate
    );
    
    const totalPossibleRoomNights = totalRoomsCount * periodDays;
    const averageOccupancy = totalPossibleRoomNights > 0 
      ? (currentRoomNights / totalPossibleRoomNights) * 100 
      : 0;

    // Calculate previous period stats
    const prevTotalRevenue =
      prevBookings?.reduce(
        (sum, b) => {
          if (!revenueStatuses.includes(b.status)) {
            return sum;
          }
          const val = typeof b.total_amount === "string" ? parseFloat(b.total_amount) : (b.total_amount || 0);
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

    // Calculate previous period occupancy
    const prevRoomNights = calculateOccupiedRoomNights(
      prevBookingsForOccupancy || [],
      prevFromDate,
      prevToDate
    );
    
    const prevAverageOccupancy = totalPossibleRoomNights > 0 
      ? (prevRoomNights / totalPossibleRoomNights) * 100 
      : 0;

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
      averageOccupancy: Math.min(Math.round(averageOccupancyNum * 100) / 100, 100),
      totalRefunded: totalRefundedNum,
      revenueGrowth: isNaN(revenueGrowth) ? 0 : Math.round(revenueGrowth * 100) / 100,
      bookingGrowth: isNaN(bookingGrowth) ? 0 : Math.round(bookingGrowth * 100) / 100,
      occupancyGrowth: isNaN(occupancyGrowth) ? 0 : Math.round(occupancyGrowth * 100) / 100,
      refundGrowth: isNaN(refundGrowth) ? 0 : Math.round(refundGrowth * 100) / 100,
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error("Error fetching summary report:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

