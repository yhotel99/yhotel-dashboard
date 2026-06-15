import { NextRequest, NextResponse } from "next/server";
import { getRefundsForReport } from "@/services/refund-requests";
import { getReportBranchIdFromRequest } from "@/lib/reports/branch-filter";

/**
 * GET /api/reports/refunds
 * Recent refunded rows in date range (by updated_at), optional branch filter.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "10", 10), 1),
      50
    );

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "fromDate and toDate are required" },
        { status: 400 }
      );
    }

    const branchId = await getReportBranchIdFromRequest(searchParams);
    const data = await getRefundsForReport({
      fromDate,
      toDate,
      branchId,
      limit,
    });

    return NextResponse.json({ data });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải báo cáo hoàn tiền";
    console.error("Error fetching refund report:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
