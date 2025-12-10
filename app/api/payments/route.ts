import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  PaymentWithBooking,
  PaginationMeta,
  PaymentType,
  PaymentMethod,
  PaymentStatus,
  PaymentSearchRow,
} from "@/lib/types";

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

    // If bookingId is provided, use regular query (function doesn't support bookingId filter)
    if (bookingId) {
      const { data, error, count } = await supabase
        .from("payments")
        .select(
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
        `
        )
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      const paymentsData = (data || []) as PaymentWithBooking[];

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return NextResponse.json({
        data: paymentsData,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      });
    }

    // Use RPC functions for search
    const trimmedSearch = search.trim() || null;
    const customerId = searchParams.get("customerId") || null;

    // Call both RPC functions in parallel
    const [paymentsResult, countResult] = await Promise.all([
      supabase.rpc("search_payments", {
        p_search: trimmedSearch,
        p_page: page,
        p_limit: limit,
        p_customer_id: customerId || null,
      }),
      supabase.rpc("count_payments", {
        p_search: trimmedSearch,
        p_customer_id: customerId || null,
      }),
    ]);

    if (paymentsResult.error) {
      return NextResponse.json(
        { error: paymentsResult.error.message },
        { status: 400 }
      );
    }

    if (countResult.error) {
      return NextResponse.json(
        { error: countResult.error.message },
        { status: 400 }
      );
    }

    const searchRows = (paymentsResult.data || []) as PaymentSearchRow[];
    const total = (countResult.data as number) || 0;

    // Get payment_type for each payment (not included in search result)
    const paymentIds = searchRows.map((row) => row.id);
    const { data: paymentTypesData } = await supabase
      .from("payments")
      .select("id, payment_type")
      .in("id", paymentIds);

    // Create a map of payment_id -> payment_type
    const paymentTypeMap = new Map<string, string>();
    (paymentTypesData || []).forEach((p) => {
      paymentTypeMap.set(p.id, p.payment_type);
    });

    // Map payment_search_row to PaymentWithBooking format
    const paymentsData: PaymentWithBooking[] = searchRows.map((row) => ({
      id: row.id,
      booking_id: row.booking_id,
      amount:
        typeof row.amount === "string" ? parseFloat(row.amount) : row.amount,
      payment_type: (paymentTypeMap.get(row.id) ||
        "room_charge") as PaymentType,
      payment_method: row.payment_method as PaymentMethod,
      payment_status: row.payment_status as PaymentStatus,
      paid_at: row.paid_at,
      verified_at: row.verified_at,
      refunded_at: row.refunded_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      bookings: {
        customers: row.customers?.full_name
          ? {
              full_name: row.customers.full_name,
              phone: row.customers.phone,
            }
          : null,
        rooms: row.rooms?.name
          ? {
              name: row.rooms.name,
            }
          : null,
      },
    }));

    const totalPages = Math.ceil(total / limit);

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
