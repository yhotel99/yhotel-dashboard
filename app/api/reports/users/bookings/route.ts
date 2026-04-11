import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { REPORT_METRICS_BOOKING_STATUSES } from "@/lib/constants";
import { UserBookingDetailRow } from "../../types";
import { parseBookingRevenueAmount } from "@/lib/reports/booking-revenue";

/**
 * GET /api/reports/users/bookings
 * List bookings created by one user in a date range
 * Query parameters:
 * - userId: user/profile id (required)
 * - fromDate: Start date (ISO string, required)
 * - toDate: End date (ISO string, required)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const fromDateStr = searchParams.get("fromDate");
    const toDateStr = searchParams.get("toDate");

    if (!userId || !fromDateStr || !toDateStr) {
      return NextResponse.json(
        { error: "userId, fromDate and toDate are required" },
        { status: 400 }
      );
    }

    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const fromISO = fromDate.toISOString();
    const toISO = toDate.toISOString();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, booking_code, check_in, check_out, status, final_amount, total_amount, created_at, customers:customer_id(full_name), booking_rooms(rooms:room_id(name))"
      )
      .is("deleted_at", null)
      .in("status", [...REPORT_METRICS_BOOKING_STATUSES])
      .eq("created_by", userId)
      .gte("created_at", fromISO)
      .lte("created_at", toISO)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows: UserBookingDetailRow[] = (data ?? []).map((item) => {
      const bookingRooms = (item.booking_rooms as Array<{
        rooms?: { name?: string | null } | null;
      }>) ?? [];
      const roomNames = bookingRooms
        .map((br) => br.rooms?.name)
        .filter((name): name is string => Boolean(name && name.trim()));

      const customerObj = item.customers as { full_name?: string | null } | null;
      const totalAmount = parseBookingRevenueAmount({
        final_amount: item.final_amount,
        total_amount: item.total_amount,
      });

      return {
        id: item.id as string,
        bookingCode: (item.booking_code as string | null) ?? null,
        customerName: customerObj?.full_name ?? null,
        roomName: roomNames.length > 0 ? roomNames.join(", ") : null,
        checkIn: (item.check_in as string | null) ?? null,
        checkOut: (item.check_out as string | null) ?? null,
        status: (item.status as string | null) ?? null,
        totalAmount,
        createdAt: (item.created_at as string | null) ?? null,
      };
    });

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Error fetching user booking details:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách booking";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

