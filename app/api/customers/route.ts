import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Customer, PaginationMeta } from "@/lib/types";

/**
 * GET /api/customers
 * Search customers with pagination and stats (optimized with RPC)
 * Query parameters:
 * - search: Search term (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * 
 * Performance: Uses get_customers_with_stats RPC function
 * - Before: 41 queries (1 + 10 customers × 4 queries each)
 * - After: 1 query (single RPC call)
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

    // 🔥 Call optimized RPC function (1 query instead of 41 queries)
    const { data, error } = await supabase.rpc("get_customers_with_stats", {
      p_search: search.trim() || null,
      p_from: from,
      p_to: to,
    });

    if (error) {
      console.error("Error fetching customers:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Get total from first row (count(*) over() returns same value for all rows)
    const total = data?.[0]?.total_count || 0;
    const totalPages = Math.ceil(total / limit);

    const response: {
      data: Customer[];
      pagination: PaginationMeta;
    } = {
      data: data || [],
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
