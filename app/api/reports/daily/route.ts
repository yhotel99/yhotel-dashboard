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

    const fromISO = fromDate.toISOString();
    const toISO = toDate.toISOString();

    const supabase = await createClient();

    const [{ data: bookings, error: bookingsError }, { data: rooms, error: roomsError }] =
      await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, room_id, check_in, check_out, actual_check_out, status, final_amount, total_amount, booking_rooms(room_id)"
          )
          .is("deleted_at", null)
          .in("status", [...REPORT_METRICS_BOOKING_STATUSES])
          .lt("check_in", toISO)
          .gt("check_out", fromISO),
        supabase.from("rooms").select("id, status").is("deleted_at", null),
      ]);

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

    const fromDateOnly = new Date(fromDate);
    fromDateOnly.setHours(0, 0, 0, 0);
    const toDateOnly = new Date(toDate);
    toDateOnly.setHours(23, 59, 59, 999);

    const dateRange: string[] = [];
    const currentDate = new Date(fromDateOnly);
    while (currentDate <= toDateOnly) {
      const y = currentDate.getFullYear();
      const m = String(currentDate.getMonth() + 1).padStart(2, "0");
      const d = String(currentDate.getDate()).padStart(2, "0");
      dateRange.push(`${y}-${m}-${d}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }

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
