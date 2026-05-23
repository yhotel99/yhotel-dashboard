import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UserBookingsKpiRow } from "../types";
import { getReportBranchIdFromRequest } from "@/lib/reports/branch-filter";

/**
 * GET /api/reports/users
 * KPI bookings by user/profile (created_by)
 * Query parameters:
 * - fromDate: Start date (ISO string, required)
 * - toDate: End date (ISO string, required)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDateStr = searchParams.get("fromDate");
    const toDateStr = searchParams.get("toDate");

    if (!fromDateStr || !toDateStr) {
      return NextResponse.json(
        { error: "fromDate and toDate are required for users report" },
        { status: 400 }
      );
    }

    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const fromISO = fromDate.toISOString();
    const toISO = toDate.toISOString();

    const supabase = await createClient();
    const branchId = await getReportBranchIdFromRequest(searchParams);

    let bookingsQuery = supabase
      .from("bookings")
      .select("id, created_by, status")
      .is("deleted_at", null)
      .gte("created_at", fromISO)
      .lte("created_at", toISO);
    if (branchId) bookingsQuery = bookingsQuery.eq("branch_id", branchId);
    const { data: bookings, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
      return NextResponse.json({ error: bookingsError.message }, { status: 500 });
    }

    const counts = new Map<
      string | null,
      {
        totalBookings: number;
        pendingBookings: number;
        confirmedBookings: number;
        checkedInBookings: number;
        checkedOutBookings: number;
      }
    >();

    for (const b of bookings ?? []) {
      const key = (b.created_by as string | null) ?? null;
      const current = counts.get(key) || {
        totalBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        checkedInBookings: 0,
        checkedOutBookings: 0,
      };

      current.totalBookings += 1;
      const status = (b.status as string | null) ?? null;
      if (status === "pending") {
        current.pendingBookings += 1;
      }
      if (status === "confirmed") {
        current.confirmedBookings += 1;
      }
      if (status === "checked_in") {
        current.checkedInBookings += 1;
      }
      if (status === "checked_out") {
        current.checkedOutBookings += 1;
      }

      counts.set(key, current);
    }

    const userIds = Array.from(counts.keys()).filter(
      (id): id is string => typeof id === "string" && id.length > 0
    );

    const profileMap = new Map<
      string,
      { full_name: string | null; email: string | null }
    >();

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) {
        return NextResponse.json(
          { error: profilesError.message },
          { status: 500 }
        );
      }

      for (const p of profiles ?? []) {
        profileMap.set(p.id as string, {
          full_name: (p.full_name as string | null) ?? null,
          email: (p.email as string | null) ?? null,
        });
      }
    }

    const rows: UserBookingsKpiRow[] = Array.from(counts.entries()).map(
      ([userId, metric]) => {
        const processedBookings =
          metric.confirmedBookings +
          metric.checkedInBookings +
          metric.checkedOutBookings;
        const processingRate =
          metric.totalBookings > 0
            ? (processedBookings / metric.totalBookings) * 100
            : 0;
        const pendingRate =
          metric.totalBookings > 0
            ? (metric.pendingBookings / metric.totalBookings) * 100
            : 0;

        if (!userId) {
          return {
            userId: null,
            fullName: null,
            email: null,
            totalBookings: metric.totalBookings,
            pendingBookings: metric.pendingBookings,
            confirmedBookings: metric.confirmedBookings,
            checkedInBookings: metric.checkedInBookings,
            checkedOutBookings: metric.checkedOutBookings,
            processingRate: Math.round(processingRate * 100) / 100,
            pendingRate: Math.round(pendingRate * 100) / 100,
          };
        }
        const profile = profileMap.get(userId);
        return {
          userId,
          fullName: profile?.full_name ?? null,
          email: profile?.email ?? null,
          totalBookings: metric.totalBookings,
          pendingBookings: metric.pendingBookings,
          confirmedBookings: metric.confirmedBookings,
          checkedInBookings: metric.checkedInBookings,
          checkedOutBookings: metric.checkedOutBookings,
          processingRate: Math.round(processingRate * 100) / 100,
          pendingRate: Math.round(pendingRate * 100) / 100,
        };
      }
    );

    rows.sort((a, b) => b.totalBookings - a.totalBookings);

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Error fetching users KPI report:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

