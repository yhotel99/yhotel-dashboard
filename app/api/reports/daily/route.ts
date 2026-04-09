import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_STATUS, BOOKING_STATUS, ROOM_STATUS } from "@/lib/constants";
import { DailyReportData } from "../types";

/**
 * GET /api/reports/daily
 * Get daily report data
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

    // Fetch all bookings that overlap with the date range
    // Get bookings where check_in_date <= toDate AND check_out_date >= fromDate
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, check_in, check_out, status, total_amount, created_at")
      .is("deleted_at", null)
      .lte("check_in", toISO)
      .gte("check_out", fromISO.split("T")[0]);

    if (bookingsError) {
      return NextResponse.json(
        { error: bookingsError.message },
        { status: 500 }
      );
    }

    // Fetch all payments in the date range
    // Use paid_at if available, otherwise use created_at
    const [
      { data: paymentsByPaidAt, error: paymentsByPaidAtError },
      { data: paymentsByCreatedAt, error: paymentsByCreatedAtError },
    ] = await Promise.all([
      supabase
        .from("payments")
        .select("amount, paid_at")
        .eq("payment_status", PAYMENT_STATUS.PAID)
        .not("paid_at", "is", null)
        .gte("paid_at", fromISO)
        .lte("paid_at", toISO),
      supabase
        .from("payments")
        .select("amount, created_at")
        .eq("payment_status", PAYMENT_STATUS.PAID)
        .is("paid_at", null)
        .gte("created_at", fromISO)
        .lte("created_at", toISO),
    ]);

    if (paymentsByPaidAtError || paymentsByCreatedAtError) {
      return NextResponse.json(
        {
          error:
            paymentsByPaidAtError?.message || paymentsByCreatedAtError?.message,
        },
        { status: 500 }
      );
    }

    const payments = [
      ...(paymentsByPaidAt || []),
      ...(paymentsByCreatedAt || []).map((p) => ({
        amount: p.amount,
        paid_at: p.created_at,
      })),
    ];

    // Fetch sellable rooms (exclude maintenance rooms)
    const { count: sellableRoomsCount } = await supabase
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .neq("status", ROOM_STATUS.MAINTENANCE)
      .is("deleted_at", null);

    const totalRoomsCount = Math.max(sellableRoomsCount || 0, 1);

    // Generate all dates in the range
    const fromDateOnly = new Date(fromDate);
    fromDateOnly.setHours(0, 0, 0, 0);
    const toDateOnly = new Date(toDate);
    toDateOnly.setHours(23, 59, 59, 999);

    const dateRange: string[] = [];
    const currentDate = new Date(fromDateOnly);
    while (currentDate <= toDateOnly) {
      dateRange.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Group data by date - only for dates in range
    const dailyDataMap = new Map<string, DailyReportData>();

    // Initialize all dates in range with zero values
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

    // Process bookings - only count for dates in range
    bookings?.forEach((booking) => {
      const checkInDate = booking.check_in?.split("T")[0];
      const checkOutDate = booking.check_out?.split("T")[0];

      if (checkInDate && dateRange.includes(checkInDate)) {
        const dayData = dailyDataMap.get(checkInDate);
        if (dayData) {
          dayData.bookings++;
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

    // Process payments - only for dates in range
    payments?.forEach((payment) => {
      if (payment.paid_at) {
        const paymentDate = payment.paid_at.split("T")[0];
        if (dateRange.includes(paymentDate)) {
          const dayData = dailyDataMap.get(paymentDate);
          if (dayData) {
            dayData.revenue +=
              typeof payment.amount === "string"
                ? parseFloat(payment.amount)
                : payment.amount || 0;
          }
        }
      }
    });

    // Calculate occupancy for each day
    const dailyDataArray = Array.from(dailyDataMap.values()).map((day) => {
      // Count active bookings for this day
      const activeBookingsOnDay =
        bookings?.filter((b) => {
          const checkIn = b.check_in?.split("T")[0];
          const checkOut = b.check_out?.split("T")[0];
          return (
            checkIn &&
            checkOut &&
            checkIn <= day.date &&
            checkOut >= day.date &&
            (b.status === BOOKING_STATUS.CHECKED_IN ||
              b.status === BOOKING_STATUS.CHECKED_OUT)
          );
        }).length || 0;

      day.occupancy = Math.min(
        (activeBookingsOnDay / totalRoomsCount) * 100,
        100
      );
      return day;
    });

    // Sort by date
    dailyDataArray.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(dailyDataArray);
  } catch (err) {
    console.error("Error fetching daily report:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
