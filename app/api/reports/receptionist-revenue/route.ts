import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_STATUS, REFUND_REQUEST_STATUS, REPORTING_STATUS } from "@/lib/constants";
import { getReportBranchIdFromRequest } from "@/lib/reports/branch-filter";
import {
  buildReceptionistRevenueReport,
  type BookingCreatorRow,
  type CashPaymentRow,
  type CashRefundRow,
} from "@/lib/reports/receptionist-revenue";
import {
  endOfDayVNFromKey,
  startOfDayVNFromKey,
  toYyyyMmDdVN,
} from "@/lib/reports/revenue-dashboard-math";

const PAGE_SIZE = 1000;
/** PostgREST `.in()` is unreliable with large UUID lists. */
const IN_CHUNK_SIZE = 100;

async function fetchAllPayments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fromISO: string,
  toISO: string,
  branchId: string | null
): Promise<CashPaymentRow[]> {
  const rows: CashPaymentRow[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from("payments")
      .select("booking_id, amount, payment_status, reporting_status")
      .eq("payment_status", PAYMENT_STATUS.PAID)
      .eq("reporting_status", REPORTING_STATUS.INCLUDED)
      .not("paid_at", "is", null)
      .gte("paid_at", fromISO)
      .lte("paid_at", toISO)
      .range(offset, offset + PAGE_SIZE - 1);
    if (branchId) query = query.eq("branch_id", branchId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const batch = (data ?? []) as CashPaymentRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

async function fetchAllRefunds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fromISO: string,
  toISO: string,
  branchId: string | null
): Promise<CashRefundRow[]> {
  const rows: CashRefundRow[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from("refund_requests")
      .select("booking_id, amount, status")
      .eq("status", REFUND_REQUEST_STATUS.REFUNDED)
      .gte("updated_at", fromISO)
      .lte("updated_at", toISO)
      .range(offset, offset + PAGE_SIZE - 1);
    if (branchId) query = query.eq("branch_id", branchId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const batch = (data ?? []) as CashRefundRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

async function fetchBookingsByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingIds: string[],
  branchId: string | null
): Promise<BookingCreatorRow[]> {
  const bookings: BookingCreatorRow[] = [];

  for (let i = 0; i < bookingIds.length; i += IN_CHUNK_SIZE) {
    const chunk = bookingIds.slice(i, i + IN_CHUNK_SIZE);
    let bookingsQuery = supabase
      .from("bookings")
      .select("id, created_by")
      .in("id", chunk)
      .is("deleted_at", null);
    if (branchId) bookingsQuery = bookingsQuery.eq("branch_id", branchId);

    const { data, error } = await bookingsQuery;
    if (error) throw new Error(error.message);
    bookings.push(...((data ?? []) as BookingCreatorRow[]));
  }

  return bookings;
}

async function fetchProfilesByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[]
): Promise<Map<string, { full_name: string | null; email: string | null }>> {
  const profiles = new Map<
    string,
    { full_name: string | null; email: string | null }
  >();

  for (let i = 0; i < userIds.length; i += IN_CHUNK_SIZE) {
    const chunk = userIds.slice(i, i + IN_CHUNK_SIZE);
    const { data: profileRows, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", chunk);

    if (profilesError) throw new Error(profilesError.message);

    for (const profile of profileRows ?? []) {
      profiles.set(profile.id as string, {
        full_name: (profile.full_name as string | null) ?? null,
        email: (profile.email as string | null) ?? null,
      });
    }
  }

  return profiles;
}

/**
 * GET /api/reports/receptionist-revenue
 *
 * Tiền về túi theo lễ tân (cùng chuẩn với card Net trên dashboard):
 * - Thu: payments paid+included, theo `paid_at`
 * - Trừ: refund_requests status=refunded, theo `updated_at`
 * - Gán: booking.created_by
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDateStr = searchParams.get("fromDate");
    const toDateStr = searchParams.get("toDate");

    if (!fromDateStr || !toDateStr) {
      return NextResponse.json(
        {
          error:
            "fromDate and toDate are required for receptionist revenue report",
        },
        { status: 400 }
      );
    }

    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const fromKey = toYyyyMmDdVN(fromDate);
    const toKey = toYyyyMmDdVN(toDate);
    if (fromKey > toKey) {
      return NextResponse.json(
        { error: "fromDate must be <= toDate" },
        { status: 400 }
      );
    }

    const fromISO = startOfDayVNFromKey(fromKey).toISOString();
    const toISO = endOfDayVNFromKey(toKey).toISOString();

    const supabase = await createClient();
    const branchId = await getReportBranchIdFromRequest(searchParams);

    const [payments, refunds] = await Promise.all([
      fetchAllPayments(supabase, fromISO, toISO, branchId),
      fetchAllRefunds(supabase, fromISO, toISO, branchId),
    ]);

    const bookingIds = [
      ...new Set(
        [...payments, ...refunds]
          .map((row) => row.booking_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      ),
    ];

    const bookings =
      bookingIds.length > 0
        ? await fetchBookingsByIds(supabase, bookingIds, branchId)
        : [];

    const userIds = [
      ...new Set(
        bookings
          .map((b) => b.created_by)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      ),
    ];

    const profiles =
      userIds.length > 0
        ? await fetchProfilesByIds(supabase, userIds)
        : new Map<
            string,
            { full_name: string | null; email: string | null }
          >();

    const report = buildReceptionistRevenueReport({
      fromDate: fromISO,
      toDate: toISO,
      payments,
      refunds,
      bookings,
      profiles,
    });

    return NextResponse.json(report);
  } catch (err) {
    console.error("Error fetching receptionist revenue report:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải dữ liệu báo cáo";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
