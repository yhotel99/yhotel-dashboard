import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { BookingRecord, PaginationMeta } from "@/lib/types";

/**
 * GET /api/bookings
 * Search bookings with pagination and search
 * Query parameters:
 * - search: Search term (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - customerId: Customer ID to filter (optional)
 * - status: booking status, matches public.booking_status (optional)
 * - cursorCreatedAt + cursorId: keyset page tiếp theo (cả hai bắt buộc nếu dùng keyset)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const customerId = searchParams.get("customerId") || null;
    const status = searchParams.get("status") || null;
    const cursorCreatedAt = searchParams.get("cursorCreatedAt") || null;
    const cursorId = searchParams.get("cursorId") || null;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Page and limit must be greater than 0" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Use RPC function for search
    const trimmedSearch = search.trim() || null;
    const trimmedCustomerId = customerId?.trim() || null;

    const trimmedStatus = status?.trim() || null;
    const trimmedCursorAt = cursorCreatedAt?.trim() || null;
    const trimmedCursorId = cursorId?.trim() || null;
    const useKeyset = Boolean(trimmedCursorAt && trimmedCursorId);

    const { data, error } = await supabase.rpc("list_bookings_json", {
      p_search: trimmedSearch,
      p_page: page,
      p_limit: limit,
      p_customer_id: trimmedCustomerId,
      p_status: trimmedStatus,
      p_cursor_created_at: useKeyset ? trimmedCursorAt : null,
      p_cursor_id: useKeyset ? trimmedCursorId : null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const payload = data as {
      items?: BookingRecord[];
      total?: number;
      next_cursor?: { created_at?: string; id?: string } | null;
    } | null;
    const bookings = (payload?.items ?? []) as BookingRecord[];
    const total = Number(payload?.total ?? 0);
    const totalPages = Math.ceil(total / limit);
    const nc = payload?.next_cursor;
    const nextCursor =
      nc &&
      typeof nc === "object" &&
      nc.id != null &&
      nc.created_at != null
        ? { created_at: String(nc.created_at), id: String(nc.id) }
        : null;

    const response: {
      data: BookingRecord[];
      pagination: PaginationMeta;
    } = {
      data: bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        nextCursor,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách booking";
    console.error("Error fetching bookings:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
