import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { BookingStatus, Customer, PaginationMeta } from "@/lib/types";
import { BOOKING_STATUS } from "@/lib/constants";

// Type for customer with bookings (internal use)
type CustomerWithBookings = Customer & {
  bookings?: Array<{
    id: string;
    total_amount: number;
    status: BookingStatus;
    deleted_at: string | null;
  }>;
};

/**
 * Process customer data and calculate stats from bookings
 */
function processCustomerData(customer: CustomerWithBookings): Customer {
  const bookings = customer.bookings || [];

  // Filter out deleted bookings
  const activeBookings = bookings.filter(
    (b) => !b.deleted_at && b.status === BOOKING_STATUS.CHECKED_OUT
  );

  // Calculate total bookings count
  const total_bookings = activeBookings.length;

  // Calculate total spent (sum of total_amount)
  const total_spent = activeBookings.reduce(
    (sum, booking) => sum + Number(booking.total_amount || 0),
    0
  );

  // Remove bookings from customer object and add computed fields
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { bookings: _, ...customerWithoutBookings } = customer;

  return {
    ...customerWithoutBookings,
    total_bookings,
    total_spent,
  } as Customer;
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

    // Build query with bookings join to calculate stats
    let query = supabase
      .from("customers")
      .select(
        `
        *,
        bookings (
          id,
          total_amount,
          status,
          deleted_at
        )
      `,
        { count: "exact" }
      )
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

    // Process customers data and calculate stats from bookings
    const customersData = ((data || []) as CustomerWithBookings[]).map(
      processCustomerData
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
