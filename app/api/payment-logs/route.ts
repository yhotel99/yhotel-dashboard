import { NextRequest, NextResponse } from "next/server";
import { getPaymentLogsListWithPagination } from "@/services/payment-logs";

/**
 * GET /api/payment-logs
 * Get payment logs with pagination and search
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

    const response = await getPaymentLogsListWithPagination({
      search,
      page,
      limit,
    });

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách lịch sử thanh toán";
    console.error("Error fetching payment logs:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

