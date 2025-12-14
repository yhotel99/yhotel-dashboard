import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/reports/room-status
 * Get room status statistics
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all rooms with their status
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("status")
      .is("deleted_at", null);

    if (roomsError) {
      return NextResponse.json({ error: roomsError.message }, { status: 500 });
    }

    // Count rooms by status
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

    // Group available and clean as "ready" (Sẵn sàng đón khách)
    const readyCount = statusCounts.available + statusCounts.clean;

    // Transform to chart data
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
    ].filter((item) => item.count > 0); // Only include statuses with rooms

    return NextResponse.json(stats);
  } catch (err) {
    console.error("Error fetching room status:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
