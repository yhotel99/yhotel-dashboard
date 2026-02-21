import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/payment-methods
 * Returns payment method statistics from payments table
 * Query params: fromDate, toDate (ISO strings)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("payments")
      .select("payment_method, created_at")

    // Apply date filters if provided
    if (fromDate) {
      query = query.gte("created_at", fromDate);
    }
    if (toDate) {
      query = query.lte("created_at", toDate);
    }

    const { data, error } = await query;


    if (error) {
      console.error("Error fetching payment methods:", error);
      return NextResponse.json(
        { error: "Failed to fetch payment methods" },
        { status: 500 }
      );
    }

    // Count payment methods
    const paymentMethodCounts: Record<string, number> = {};
    data.forEach((payment) => {
      const method = payment.payment_method || "unknown";
      paymentMethodCounts[method] = (paymentMethodCounts[method] || 0) + 1;
    });

    // Map to label format
    const paymentMethodLabels: Record<string, string> = {
      pay_at_hotel: "Thanh toán tại khách sạn",
      bank_transfer: "Chuyển khoản ngân hàng",
      unknown: "Không xác định",
    };

    const result = Object.entries(paymentMethodCounts).map(([method, count]) => ({
      method,
      label: paymentMethodLabels[method] || method,
      count,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in payment methods API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
