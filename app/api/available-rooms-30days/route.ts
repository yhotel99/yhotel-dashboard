import { NextResponse } from "next/server";
import { getAvailableRoomsIn30Days } from "@/services/reservation";

/**
 * GET /api/available-rooms-30days
 * Fetch available rooms in the next 30 days with their availability periods
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") || null;
    const result = await getAvailableRoomsIn30Days(branchId);
    return NextResponse.json({ data: result });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách phòng trống";
    console.error("Error fetching available rooms:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}