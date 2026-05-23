import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { roomTypeLabels } from "@/lib/constants";
import { getReportBranchIdFromRequest } from "@/lib/reports/branch-filter";

/**
 * GET /api/reports/room-stats
 * Get room statistics by type
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = await getReportBranchIdFromRequest(searchParams);
    const supabase = await createClient();

    let query = supabase
      .from("rooms")
      .select("room_type")
      .is("deleted_at", null);
    if (branchId) query = query.eq("branch_id", branchId);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const typeCounts: Record<string, number> = {
      standard: 0,
      deluxe: 0,
      superior: 0,
      family: 0,
    };

    (data || []).forEach((room: { room_type: string }) => {
      if (room.room_type && typeCounts[room.room_type] !== undefined) {
        typeCounts[room.room_type]++;
      }
    });

    const stats = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      label: roomTypeLabels[type as keyof typeof roomTypeLabels] || type,
      count,
    }));

    return NextResponse.json(stats);
  } catch (err) {
    console.error("Error fetching room stats:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
