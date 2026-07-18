import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BOOKING_STATUS, REPORT_METRICS_BOOKING_STATUSES } from "@/lib/constants";
import { parseBookingRevenueAmount } from "@/lib/reports/booking-revenue";
import {
  countInventoryRoomsForOccupancy,
  parseLocalDateOnly,
  totalRoomNightsInPeriod,
} from "@/lib/reports/occupancy-room-nights";
import { DailyReportData } from "../types";
import { getReportBranchIdFromRequest } from "@/lib/reports/branch-filter";
import {
  endOfDayVNFromKey,
  iterateYyyyMmDdInclusive,
  startOfDayVNFromKey,
  toYyyyMmDdVN,
} from "@/lib/reports/revenue-dashboard-math";

/**
 * GET /api/reports/daily
 *
 * Occupancy per row = **sold room-nights that calendar day** / **inventory room-nights that day**
 * (inventory = rooms not in `maintenance`; per-day denominator uses current snapshot).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDateStr = searchParams.get("fromDate");
    const toDateStr = searchParams.get("toDate");

    if (!fromDateStr || !toDateStr) {
      return NextResponse.json(
        { error: "fromDate and toDate are required for daily report" },
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

    const fromKey = toYyyyMmDdVN(fromDate);
    const toKey = toYyyyMmDdVN(toDate);
    if (fromKey > toKey) {
      return NextResponse.json(
        { error: "fromDate must be <= toDate" },
        { status: 400 }
      );
    }

    const fromISO = startOfDayVNFromKey(fromKey).toISOString();
    const toISO = endOfDayVNFromKey(toKey).toISOString();

    const branchId = await getReportBranchIdFromRequest(searchParams);
    const supabase = await createClient();

    let bookingsQuery = supabase
      .from("bookings")
      .select(
        "id, room_id, check_in, check_out, actual_check_out, status, final_amount, total_amount, booking_rooms(room_id)"
      )
      .is("deleted_at", null)
      .in("status", [...REPORT_METRICS_BOOKING_STATUSES])
      .lt("check_in", toISO)
      .gt("check_out", fromISO);
    if (branchId) bookingsQuery = bookingsQuery.eq("branch_id", branchId);

    let roomsQuery = supabase.from("rooms").select("id, status").is("deleted_at", null);
    if (branchId) roomsQuery = roomsQuery.eq("branch_id", branchId);

    const [{ data: bookings, error: bookingsError }, { data: rooms, error: roomsError }] =
      await Promise.all([bookingsQuery, roomsQuery]);

    if (bookingsError || roomsError) {
      return NextResponse.json(
        { error: bookingsError?.message || roomsError?.message },
        { status: 500 }
      );
    }

    const sellableRoomsPerDay = Math.max(
      countInventoryRoomsForOccupancy(rooms),
      1
    );

    // Lịch VN — không dùng setHours trên server UTC (Vercel).
    const dateRange = iterateYyyyMmDdInclusive(fromKey, toKey);

    const dailyDataMap = new Map<string, DailyReportData>();

    dateRange.forEach((date) => {
      dailyDataMap.set(date, {
        date,
        revenue: 0,
        bookings: 0,
        checkIns: 0,
        checkOuts: 0,
        occupancy: 0,
      });
    });

    bookings?.forEach((booking) => {
      const checkInDate = booking.check_in?.split("T")[0];
      const checkOutDate = booking.check_out?.split("T")[0];

      if (checkInDate && dateRange.includes(checkInDate)) {
        const dayData = dailyDataMap.get(checkInDate);
        if (dayData) {
          dayData.bookings++;
          dayData.revenue += parseBookingRevenueAmount(booking);
          if (booking.status === BOOKING_STATUS.CHECKED_IN) {
            dayData.checkIns++;
          }
        }
      }

      if (
        checkOutDate &&
        checkOutDate !== checkInDate &&
        dateRange.includes(checkOutDate)
      ) {
        const dayData = dailyDataMap.get(checkOutDate);
        if (dayData) {
          if (booking.status === BOOKING_STATUS.CHECKED_OUT) {
            dayData.checkOuts++;
          }
        }
      }
    });

    const dailyDataArray = Array.from(dailyDataMap.values()).map((day) => {
      const dayStart = parseLocalDateOnly(day.date);
      const soldRoomNights = totalRoomNightsInPeriod(
        bookings || [],
        dayStart,
        dayStart,
        REPORT_METRICS_BOOKING_STATUSES
      );
      day.occupancy =
        sellableRoomsPerDay > 0
          ? Math.min((soldRoomNights / sellableRoomsPerDay) * 100, 100)
          : 0;
      return day;
    });

    dailyDataArray.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(dailyDataArray);
  } catch (err) {
    console.error("Error fetching daily report:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
