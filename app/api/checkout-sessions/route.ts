import { NextRequest, NextResponse } from "next/server";
import { getCheckoutSessionsListWithPagination } from "@/services/checkout-sessions";
import { CHECKOUT_SESSION_STATUS } from "@/lib/constants";

/**
 * GET /api/checkout-sessions
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const status =
      searchParams.get("status") || CHECKOUT_SESSION_STATUS.NEEDS_ACTION;
    const branchId = searchParams.get("branchId") || null;

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Page and limit must be greater than 0" },
        { status: 400 }
      );
    }

    const response = await getCheckoutSessionsListWithPagination({
      search,
      page,
      limit,
      status,
      branchId,
    });

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách phiên thanh toán";
    console.error("Error fetching checkout sessions:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
