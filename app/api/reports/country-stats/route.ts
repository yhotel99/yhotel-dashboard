import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getReportBranchIdFromRequest } from "@/lib/reports/branch-filter";

type CountryStat = { country: string; label: string; count: number };

/**
 * GET /api/reports/country-stats
 * Get booking statistics by customer nationality (country)
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
          nationality
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

    const countryCounts: Record<string, number> = {};

    (bookings || []).forEach((booking: unknown) => {
      const bookingData = booking as {
        customers?: { nationality?: string | null } | null;
      };
      const nationality =
        bookingData.customers?.nationality?.trim() || "Không xác định";

      countryCounts[nationality] = (countryCounts[nationality] ?? 0) + 1;
    });

    const stats: CountryStat[] = Object.entries(countryCounts)
      .map(([country, count]) => ({
        country,
        label: country,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json(stats);
  } catch (err) {
    console.error("Error fetching country stats:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
