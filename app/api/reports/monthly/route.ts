import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_STATUS } from "@/lib/constants";
import { MonthlyRevenueData } from "../types";

/**
 * GET /api/reports/monthly
 * Get monthly report data for the last N months
 * Query parameters:
 * - months: Number of months to fetch (default: 6, max: 12)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monthsParam = searchParams.get("months");
    const numberOfMonths = Math.min(
      Math.max(parseInt(monthsParam || "6", 10), 1),
      12
    );

    const supabase = await createClient();

    // Calculate date range for last N months
    const now = new Date();
    const months: MonthlyRevenueData[] = [];

    for (let i = numberOfMonths - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1
      );
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      const monthStartISO = monthStart.toISOString();
      const monthEndISO = monthEnd.toISOString();

      // Fetch payments and bookings for this month
      // Use paid_at if available, otherwise use created_at
      const [paymentsByPaidAt, paymentsByCreatedAt, bookingsResult] =
        await Promise.all([
          // Payments with paid_at in this month
          supabase
            .from("payments")
            .select("amount")
            .eq("payment_status", PAYMENT_STATUS.PAID)
            .not("paid_at", "is", null)
            .gte("paid_at", monthStartISO)
            .lte("paid_at", monthEndISO),
          // Payments without paid_at but created_at in this month
          supabase
            .from("payments")
            .select("amount")
            .eq("payment_status", PAYMENT_STATUS.PAID)
            .is("paid_at", null)
            .gte("created_at", monthStartISO)
            .lte("created_at", monthEndISO),
          supabase
            .from("bookings")
            .select("id")
            .is("deleted_at", null)
            .gte("created_at", monthStartISO)
            .lte("created_at", monthEndISO),
        ]);

      if (
        paymentsByPaidAt.error ||
        paymentsByCreatedAt.error ||
        bookingsResult.error
      ) {
        console.error("Error fetching monthly data:", {
          paymentsByPaidAtError: paymentsByPaidAt.error,
          paymentsByCreatedAtError: paymentsByCreatedAt.error,
          bookingsError: bookingsResult.error,
        });
        continue;
      }

      // Calculate revenue from both sources
      const revenueFromPaidAt =
        paymentsByPaidAt.data?.reduce(
          (sum, p) =>
            sum +
            (typeof p.amount === "string"
              ? parseFloat(p.amount)
              : p.amount || 0),
          0
        ) || 0;

      const revenueFromCreatedAt =
        paymentsByCreatedAt.data?.reduce(
          (sum, p) =>
            sum +
            (typeof p.amount === "string"
              ? parseFloat(p.amount)
              : p.amount || 0),
          0
        ) || 0;

      const revenue = revenueFromPaidAt + revenueFromCreatedAt;
      const bookings = bookingsResult.data?.length || 0;

      months.push({
        month: `Tháng ${monthDate.getMonth() + 1}`,
        revenue,
        bookings,
      });
    }

    return NextResponse.json(months);
  } catch (err) {
    console.error("Error fetching monthly report:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

