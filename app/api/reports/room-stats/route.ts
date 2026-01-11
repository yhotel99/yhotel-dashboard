import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { roomTypeLabels } from "@/lib/constants";

/**
 * GET /api/reports/room-stats
 * Get room statistics by type
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all rooms without pagination
    const { data, error } = await supabase
      .from("rooms")
      .select("room_type")
      .is("deleted_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Count rooms by type
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

    // Transform to chart data
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

