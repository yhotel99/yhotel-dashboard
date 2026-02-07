import { NextRequest, NextResponse } from "next/server";
import { getCustomersListWithPagination } from "@/services/customers";

/**
 * GET /api/customers
 * Get customers list with pagination and search
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

    const result = await getCustomersListWithPagination({
      search: search.trim() || null,
      page,
      limit,
    });

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách khách hàng";
    console.error("Error fetching customers:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
