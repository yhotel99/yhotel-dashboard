import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/reports
 * This route has been split into separate endpoints:
 * - /api/reports/summary - Summary report
 * - /api/reports/monthly - Monthly report
 * - /api/reports/daily - Daily report
 * - /api/reports/room-stats - Room statistics
 */
export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      error:
        "This endpoint has been split. Please use: /api/reports/summary, /api/reports/monthly, /api/reports/daily, or /api/reports/room-stats",
    },
    { status: 404 }
  );
}
