import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Customer, PaginationMeta } from "@/lib/types";
import { BOOKING_STATUS, PAYMENT_STATUS, REFUND_REQUEST_STATUS } from "@/lib/constants";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Calculate customer stats (total bookings and total spent)
 */
async function calculateCustomerStats(customerId: string, supabase: SupabaseClient) {
  // Get all completed bookings (confirmed, checked_in, checked_out)
  const { data: bookingsData, error: bookingsError } = await supabase
    .from("bookings")
    .select("id")
    .eq("customer_id", customerId)
    .in("status", [
      BOOKING_STATUS.CONFIRMED,
      BOOKING_STATUS.CHECKED_IN,
      BOOKING_STATUS.CHECKED_OUT,
    ])
    .is("deleted_at", null);

  if (bookingsError) {
    console.error("Error fetching bookings for customer stats:", bookingsError);
    return { total_bookings: 0, total_spent: 0, total_refunded: 0 };
  }

  const bookingIds = (bookingsData || []).map((b: { id: string }) => b.id);
  const total_bookings = bookingIds.length;

  // Get all paid payments for this customer (from all their bookings)
  const { data: allBookingIdsData, error: allBookingsError } = await supabase
    .from("bookings")
    .select("id")
    .eq("customer_id", customerId)
    .is("deleted_at", null);

  if (allBookingsError) {
    console.error("Error fetching all bookings for payments:", allBookingsError);
    return { total_bookings, total_spent: 0, total_refunded: 0 };
  }

  const allBookingIds = (allBookingIdsData || []).map((b: { id: string }) => b.id);

  // Calculate total spent from all paid payments
  const { data: paymentsData, error: paymentsError } = await supabase
    .from("payments")
    .select("amount")
    .in("booking_id", allBookingIds)
    .eq("payment_status", PAYMENT_STATUS.PAID);

  if (paymentsError) {
    console.error("Error fetching payments for customer stats:", paymentsError);
  }

  const total_spent = (paymentsData || []).reduce(
    (sum: number, payment: { amount: number }) => sum + Number(payment.amount || 0),
    0
  );

  // Calculate total refunded amount
  const { data: refundsData, error: refundsError } = await supabase
    .from("refund_requests")
    .select("amount")
    .eq("customer_id", customerId)
    .eq("status", REFUND_REQUEST_STATUS.REFUNDED);

  if (refundsError) {
    console.error("Error fetching refunds for customer stats:", refundsError);
  }

  const total_refunded = (refundsData || []).reduce(
    (sum: number, refund: { amount: number }) => sum + Number(refund.amount || 0),
    0
  );

  return { total_bookings, total_spent, total_refunded };
}

/**
 * GET /api/customers
 * Search customers with pagination and search
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

    // First, get customers with pagination and search
    let query = supabase
      .from("customers")
      .select("*", { count: "exact" })
      .is("deleted_at", null);

    // Add search filter if search term exists
    // Search by full_name, email, or phone
    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim();
      query = query.or(
        `full_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%,phone.ilike.%${trimmedSearch}%`
      );
    }

    // Fetch data with pagination
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Calculate stats for each customer
    const customersData = await Promise.all(
      (data || []).map(async (customer: Customer) => {
        const stats = await calculateCustomerStats(customer.id, supabase);
        return {
          ...customer,
          total_bookings: stats.total_bookings,
          total_spent: stats.total_spent,
          total_refunded: stats.total_refunded,
        } as Customer;
      })
    );

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const response: {
      data: Customer[];
      pagination: PaginationMeta;
    } = {
      data: customersData,
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
      err instanceof Error ? err.message : "Không thể tải danh sách khách hàng";
    console.error("Error fetching customers:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
