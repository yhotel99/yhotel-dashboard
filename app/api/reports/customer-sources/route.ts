import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/reports/customer-sources
 * Get customer source statistics
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch all bookings with customer source
    const { data: bookings, error: bookingsError } = await supabase
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

    if (bookingsError) {
      return NextResponse.json(
        { error: bookingsError.message },
        { status: 500 }
      );
    }

    // Count bookings by source
    const sourceCounts: Record<string, number> = {
      booking_com: 0,
      agoda: 0,
      walk_in: 0,
      website: 0,
      other: 0,
    };

    (bookings || []).forEach((booking: any) => {
      const source = booking.customers?.source?.toLowerCase() || null;
      
      if (!source) {
        sourceCounts.other++;
        return;
      }

      // Normalize source names
      if (source.includes("booking.com") || source.includes("booking_com")) {
        sourceCounts.booking_com++;
      } else if (source.includes("agoda")) {
        sourceCounts.agoda++;
      } else if (
        source.includes("vãng lai") ||
        source.includes("vang lai") ||
        source.includes("walk") ||
        source.includes("walk_in")
      ) {
        sourceCounts.walk_in++;
      } else if (
        source.includes("website") ||
        source.includes("web") ||
        source.includes("site")
      ) {
        sourceCounts.website++;
      } else {
        sourceCounts.other++;
      }
    });

    // Transform to chart data
    const stats = [
      {
        source: "booking_com",
        label: "Booking.com",
        count: sourceCounts.booking_com,
      },
      {
        source: "agoda",
        label: "Agoda",
        count: sourceCounts.agoda,
      },
      {
        source: "walk_in",
        label: "Vãng lai",
        count: sourceCounts.walk_in,
      },
      {
        source: "website",
        label: "Website",
        count: sourceCounts.website,
      },
    ].filter((item) => item.count > 0); // Only include sources with bookings

    return NextResponse.json(stats);
  } catch (err) {
    console.error("Error fetching customer sources:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

