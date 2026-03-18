import { NextResponse } from "next/server";
import { getUpcomingCheckinsWithPagination } from "@/services/reservation";

/**
 * GET /api/upcoming-checkins
 * Fetch upcoming check-ins in the next 30 days
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 100;
    const search = searchParams.get("search") || "";

    const result = await getUpcomingCheckinsWithPagination({
      page,
      limit,
      search,
    });

    return NextResponse.json(result);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách phòng sắp nhận";
    console.error("Error fetching upcoming check-ins:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}