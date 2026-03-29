import { NextRequest, NextResponse } from "next/server";
import { getBookingsListWithPagination } from "@/services/bookings";

/**
 * GET /api/bookings
 * Search bookings with pagination and search
 * Query parameters:
 * - search: Search term (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - customerId: Customer ID to filter (optional)
 * - status: booking status, matches public.booking_status (optional)
 * - cursorCreatedAt + cursorId: keyset page tiếp theo (cả hai bắt buộc nếu dùng keyset)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const customerId = searchParams.get("customerId") || null;
    const status = searchParams.get("status") || null;
    const cursorCreatedAt = searchParams.get("cursorCreatedAt") || null;
    const cursorId = searchParams.get("cursorId") || null;

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Page and limit must be greater than 0" },
        { status: 400 }
      );
    }

    const result = await getBookingsListWithPagination({
      search,
      page,
      limit,
      customerId: customerId?.trim() || null,
      status,
      cursorCreatedAt,
      cursorId,
    });

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách booking";
    console.error("Error fetching bookings:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
