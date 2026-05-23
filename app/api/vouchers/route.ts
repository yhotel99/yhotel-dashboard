import { NextRequest, NextResponse } from "next/server";
import { getVouchersListWithPagination } from "@/services/vouchers";

/**
 * GET /api/vouchers
 * Query parameters:
 * - search: Search by code/name (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - branchId: Filter by branch (optional; includes global vouchers with null branch_id)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const branchId = searchParams.get("branchId") || null;

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Page and limit must be greater than 0" },
        { status: 400 }
      );
    }

    const response = await getVouchersListWithPagination({
      search: search.trim() || null,
      page,
      limit,
      branchId,
    });

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách voucher";
    console.error("Error fetching vouchers:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
