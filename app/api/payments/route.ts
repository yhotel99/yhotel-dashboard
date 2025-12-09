import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PaymentWithBooking, PaginationMeta } from "@/lib/types";

/**
 * GET /api/payments
 * Search payments with pagination and search
 * Query parameters:
 * - search: Search term (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const bookingId = searchParams.get("bookingId");

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Page and limit must be greater than 0" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query with bookings join
    let query = supabase.from("payments").select(
      `
        *,
        bookings:booking_id (
          customers:customer_id (
            full_name,
            phone
          ),
          rooms:room_id (
            name
          )
        )
      `,
      { count: "exact" }
    );

    // Filter by bookingId if provided
    if (bookingId) {
      query = query.eq("booking_id", bookingId);
    }

    // Note: Search filtering is done in post-processing below
    // because UUID columns cannot use ilike operator

    // Fetch data with pagination (only if bookingId is not provided, otherwise return all)
    const { data, error, count } = bookingId
      ? await query.order("created_at", { ascending: false })
      : await query.order("created_at", { ascending: false }).range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    let paymentsData = (data || []) as PaymentWithBooking[];

    // Post-process to filter by payment ID, booking ID, customer name, room name if search term exists
    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim().toLowerCase();
      paymentsData = paymentsData.filter((payment) => {
        const paymentId = payment.id.toLowerCase();
        const bookingId = payment.booking_id.toLowerCase();
        const customerName =
          payment.bookings?.customers?.full_name?.toLowerCase() || "";
        const roomName = payment.bookings?.rooms?.name?.toLowerCase() || "";

        return (
          paymentId.includes(trimmedSearch) ||
          bookingId.includes(trimmedSearch) ||
          customerName.includes(trimmedSearch) ||
          roomName.includes(trimmedSearch)
        );
      });
    }

    const total = count || 0;
    const totalPages = bookingId ? 1 : Math.ceil(total / limit);

    const response: {
      data: PaymentWithBooking[];
      pagination: PaginationMeta;
    } = {
      data: paymentsData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách thanh toán";
    console.error("Error fetching payments:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
