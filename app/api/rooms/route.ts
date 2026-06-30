import { NextRequest, NextResponse } from "next/server";
import { getRoomsListWithPagination } from "@/services/rooms";

/**
 * GET /api/rooms
 * Search rooms with pagination and search
 * Query parameters:
 * - search: Search term (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - branchId: Branch filter (optional, resolved server-side)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const branchId = searchParams.get("branchId");

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Page and limit must be greater than 0" },
        { status: 400 }
      );
    }

    const result = await getRoomsListWithPagination({
      search,
      page,
      limit,
      branchId,
    });

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách phòng";
    console.error("Error fetching rooms:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
