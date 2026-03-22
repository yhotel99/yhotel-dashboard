import { NextRequest, NextResponse } from "next/server";
import { getPaymentsListWithPagination } from "@/services/payments";

/**
 * GET /api/payments
 * Search payments with pagination and search
 * Query parameters:
 * - search: Search term (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - bookingId: Filter by booking ID (optional)
 * - customerId: Filter by customer ID (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const bookingId = searchParams.get("bookingId") || null;
    const customerId = searchParams.get("customerId") || null;

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Page and limit must be greater than 0" },
        { status: 400 }
      );
    }

    const response = await getPaymentsListWithPagination({
      search,
      page,
      limit,
      bookingId,
      customerId,
    });

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách thanh toán";
    console.error("Error fetching payments:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
