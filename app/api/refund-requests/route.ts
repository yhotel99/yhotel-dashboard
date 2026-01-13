import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { RefundRequestWithRelations } from "@/lib/types";

/**
 * GET /api/refund-requests
 * Fetch refund requests with pagination and search
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query with bookings join and user profiles
    let query = supabase.from("refund_requests").select(
      `
        *,
        bookings:booking_id (
          id,
          customers:customer_id (
            full_name,
            phone
          ),
          rooms:room_id (
            name
          )
        ),
        request_by_profile:request_by (
          full_name
        ),
        approved_by_profile:approved_by (
          full_name
        ),
        refunded_by_profile:refunded_by (
          full_name
        )
      `,
      { count: "exact" }
    );

    // Add search filter if search term exists (only on text fields)
    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim();
      query = query.or(
        `id.ilike.%${trimmedSearch}%,reason.ilike.%${trimmedSearch}%,note.ilike.%${trimmedSearch}%`
      );
    }

    // Fetch data with pagination
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const refundRequestsData = (data || []) as RefundRequestWithRelations[];
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: refundRequestsData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách yêu cầu hoàn tiền";
    console.error("Error fetching refund requests:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
