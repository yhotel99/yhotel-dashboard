import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getReportBranchIdFromRequest } from "@/lib/reports/branch-filter";

/**
 * GET /api/reports/room-status
 * Get room status statistics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = await getReportBranchIdFromRequest(searchParams);
    const supabase = await createClient();

    let query = supabase.from("rooms").select("status").is("deleted_at", null);
    if (branchId) query = query.eq("branch_id", branchId);

    const { data: rooms, error: roomsError } = await query;

    if (roomsError) {
      return NextResponse.json({ error: roomsError.message }, { status: 500 });
    }

    const statusCounts: Record<string, number> = {
      available: 0,
      clean: 0,
      not_clean: 0,
      maintenance: 0,
    };

    (rooms || []).forEach((room: { status: string }) => {
      if (room.status && statusCounts[room.status] !== undefined) {
        statusCounts[room.status]++;
      }
    });

    const readyCount = statusCounts.available + statusCounts.clean;

    const stats = [
      {
        status: "ready",
        label: "Sẵn sàng đón khách",
        count: readyCount,
        color: "green",
      },
      {
        status: "not_clean",
        label: "Chưa dọn / Bẩn",
        count: statusCounts.not_clean,
        color: "red",
      },
      {
        status: "maintenance",
        label: "Đang bảo trì",
        count: statusCounts.maintenance,
        color: "orange",
      },
    ].filter((item) => item.count > 0);

    return NextResponse.json(stats);
  } catch (err) {
    console.error("Error fetching room status:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
