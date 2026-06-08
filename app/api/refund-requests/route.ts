import { NextRequest, NextResponse } from "next/server";
import { getRefundRequestsListWithPagination } from "@/services/refund-requests";

/**
 * GET /api/refund-requests
 * Fetch refund requests with pagination and search (dùng service để có tên phòng từ booking_rooms).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const branchId = searchParams.get("branchId") || null;

    const result = await getRefundRequestsListWithPagination({
      search: search || null,
      page,
      limit,
      branchId,
    });

    return NextResponse.json(result);
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách yêu cầu hoàn tiền";
    console.error("Error fetching refund requests:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
