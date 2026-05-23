import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CUSTOMER_SOURCE, customerSourceLabels } from "@/lib/constants";
import { getReportBranchIdFromRequest } from "@/lib/reports/branch-filter";

/**
 * GET /api/reports/customer-sources
 * Get customer source statistics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = await getReportBranchIdFromRequest(searchParams);
    const supabase = await createClient();

    let query = supabase
      .from("bookings")
      .select(
        `
        id,
        customers:customer_id (
          source
        )
      `
      )
      .is("deleted_at", null);
    if (branchId) query = query.eq("branch_id", branchId);

    const { data: bookings, error: bookingsError } = await query;

    if (bookingsError) {
      return NextResponse.json(
        { error: bookingsError.message },
        { status: 500 }
      );
    }

    const sourceCounts: Record<
      (typeof CUSTOMER_SOURCE)[keyof typeof CUSTOMER_SOURCE],
      number
    > = {
      [CUSTOMER_SOURCE.WEBSITE]: 0,
      [CUSTOMER_SOURCE.AGODA]: 0,
      [CUSTOMER_SOURCE.BOOKING]: 0,
      [CUSTOMER_SOURCE.TRAVELOKA]: 0,
      [CUSTOMER_SOURCE.OTHER]: 0,
    };

    (bookings || []).forEach((booking: unknown) => {
      const bookingData = booking as {
        customers?: { source?: string | null } | null;
      };
      const source = bookingData.customers?.source?.toLowerCase()?.trim() || null;

      if (!source) {
        sourceCounts[CUSTOMER_SOURCE.OTHER]++;
        return;
      }

      if (source === CUSTOMER_SOURCE.WEBSITE) {
        sourceCounts[CUSTOMER_SOURCE.WEBSITE]++;
      } else if (source === CUSTOMER_SOURCE.AGODA) {
        sourceCounts[CUSTOMER_SOURCE.AGODA]++;
      } else if (
        source === CUSTOMER_SOURCE.BOOKING ||
        source.includes("booking.com") ||
        source.includes("booking_com")
      ) {
        sourceCounts[CUSTOMER_SOURCE.BOOKING]++;
      } else if (source === CUSTOMER_SOURCE.TRAVELOKA) {
        sourceCounts[CUSTOMER_SOURCE.TRAVELOKA]++;
      } else {
        sourceCounts[CUSTOMER_SOURCE.OTHER]++;
      }
    });

    const stats = Object.values(CUSTOMER_SOURCE)
      .map((source) => ({
        source,
        label: customerSourceLabels[source],
        count: sourceCounts[source],
      }))
      .filter((item) => item.count > 0);

    return NextResponse.json(stats);
  } catch (err) {
    console.error("Error fetching customer sources:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
