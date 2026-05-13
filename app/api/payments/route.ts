import { NextRequest, NextResponse } from "next/server";
import { getPaymentsListWithPagination } from "@/services/payments";
import type { PaymentStatus, PaymentType } from "@/lib/types";
import { PAYMENT_TYPE } from "@/lib/constants";

/**
 * GET /api/payments
 * Search payments with pagination and search
 * Query parameters:
 * - search: Search term (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - bookingId: Filter by booking ID (optional)
 * - customerId: Filter by customer ID (optional)
 * - paymentStatus: Filter by payment status (optional)
 * - paymentType: Filter by payment type (optional)
 * - dateField: Date field for range filter (`created_at` | `paid_at`)
 * - dateFrom: Start datetime for selected dateField (optional, ISO)
 * - dateTo: End datetime for selected dateField (optional, ISO)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const bookingId = searchParams.get("bookingId") || null;
    const customerId = searchParams.get("customerId") || null;
    const paymentStatus = (searchParams.get("paymentStatus") || null) as PaymentStatus | null;
    const paymentTypeRaw = searchParams.get("paymentType") || null;
    const paymentTypes = Object.values(PAYMENT_TYPE) as PaymentType[];
    const paymentType =
      paymentTypeRaw && paymentTypes.includes(paymentTypeRaw as PaymentType)
        ? (paymentTypeRaw as PaymentType)
        : null;
    const dateFieldRaw = searchParams.get("dateField") || "created_at";
    const dateField =
      dateFieldRaw === "paid_at" ? "paid_at" : "created_at";
    const dateFrom = searchParams.get("dateFrom") || null;
    const dateTo = searchParams.get("dateTo") || null;

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Page and limit must be greater than 0" },
        { status: 400 }
      );
    }

    const response = await getPaymentsListWithPagination({
      search,
      page,
      limit,
      bookingId,
      customerId,
      paymentStatus,
      paymentType,
      dateField,
      dateFrom,
      dateTo,
    });

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách thanh toán";
    console.error("Error fetching payments:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
