import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CountryStat = { country: string; label: string; count: number };

/**
 * GET /api/reports/country-stats
 * Get booking statistics by customer nationality (country)
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: bookings, error: bookingsError } = await supabase
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
