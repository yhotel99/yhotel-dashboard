import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { BookingRecord, PaginationMeta } from "@/lib/types";

/**
 * GET /api/bookings
 * Search bookings with pagination and search
 * Query parameters:
 * - search: Search term (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - customerId: Customer ID to filter (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const customerId = searchParams.get("customerId") || null;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Page and limit must be greater than 0" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Use RPC function for search
    const trimmedSearch = search.trim() || null;
    const trimmedCustomerId = customerId?.trim() || null;

    // Call both RPC functions in parallel
    const [bookingsData, countData] = await Promise.all([
      supabase.rpc("search_bookings_json", {
        p_search: trimmedSearch,
        p_page: page,
        p_limit: limit,
        p_customer_id: trimmedCustomerId,
      }),
      supabase.rpc("count_bookings_json", {
        p_search: trimmedSearch,
        p_customer_id: trimmedCustomerId,
      }),
    ]);

    if (bookingsData.error) {
      return NextResponse.json(
        { error: bookingsData.error.message },
        { status: 400 }
      );
    }

    if (countData.error) {
      return NextResponse.json(
        { error: countData.error.message },
        { status: 400 }
      );
    }

    const bookings = (bookingsData.data || []) as BookingRecord[];
    const total = (countData.data as number) || 0;
    const totalPages = Math.ceil(total / limit);

    const response: {
      data: BookingRecord[];
      pagination: PaginationMeta;
    } = {
      data: bookings,
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
      err instanceof Error ? err.message : "Không thể tải danh sách booking";
    console.error("Error fetching bookings:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
