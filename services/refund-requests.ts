
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentUserBranchScope,
  resolveBranchFilterId,
} from "@/lib/branch.server";
import type {
  RefundRequestWithRelations,
  RefundRequestsResponse,
} from "@/lib/types";

/**
 * List: chỉ lấy dữ liệu cần cho bảng (id, khách hàng, số tiền, trạng thái, ngày tạo, người yêu cầu).
 * Chi tiết gọi getRefundRequestById.
 */
export async function getRefundRequestsListWithPagination({
  search,
  page = 1,
  limit = 10,
  branchId: requestedBranchId,
}: {
  search?: string | null;
  page?: number;
  limit?: number;
  branchId?: string | null;
}): Promise<RefundRequestsResponse> {
  try {
    if (page < 1 || limit < 1) {
      throw new Error("Page and limit must be greater than 0");
    }

    const supabase = await createClient();
    const { scope } = await getCurrentUserBranchScope();
    const branchId = resolveBranchFilterId(scope, requestedBranchId);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from("refund_requests").select(
      `
        id,
        booking_id,
        amount,
        status,
        created_at,
        request_by,
        bookings:booking_id!inner (
          branch_id,
          customers:customer_id ( full_name )
        ),
        request_by_profile:request_by ( full_name )
      `,
      { count: "exact" }
    );

    if (branchId) {
      query = query.eq("bookings.branch_id", branchId);
    }

    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim();
      query = query.or(
        `reason.ilike.%${trimmedSearch}%,note.ilike.%${trimmedSearch}%`
      );
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    const refundRequestsData = (data || []) as unknown as RefundRequestWithRelations[];
    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: refundRequestsData,
      pagination: { total, page, limit, totalPages },
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách yêu cầu hoàn tiền";
    console.error("Error fetching refund requests list:", err);
    throw new Error(errorMessage);
  }
}

/**
 * Chi tiết 1 yêu cầu hoàn tiền (đủ thông tin + tên phòng từ booking_rooms).
 */
export async function getRefundRequestById(
  id: string
): Promise<RefundRequestWithRelations | null> {
  try {
    const supabase = await createClient();

    const { data: row, error } = await supabase
      .from("refund_requests")
      .select(
        `
        *,
        bookings:booking_id (
          id,
          customers:customer_id ( full_name, phone ),
          rooms:room_id ( name )
        ),
        request_by_profile:request_by ( full_name ),
        approved_by_profile:approved_by ( full_name ),
        refunded_by_profile:refunded_by ( full_name )
      `
      )
      .eq("id", id)
      .single();

    if (error || !row) return null;

    const refund = row as RefundRequestWithRelations;
    const bookingId = refund.booking_id;

    if (bookingId && refund.bookings && !refund.bookings.rooms?.name) {
      const { data: brData } = await supabase
        .from("booking_rooms")
        .select("booking_id, rooms:room_id(name)")
        .eq("booking_id", bookingId);

      const names: string[] = [];
      for (const r of brData ?? []) {
        const room = r?.rooms as { name?: string } | { name?: string }[] | null;
        const name = Array.isArray(room)
          ? room[0]?.name?.trim()
          : (room as { name?: string })?.name?.trim();
        if (name) names.push(name);
      }
      (refund.bookings as { rooms?: { name: string } }).rooms = {
        name: names.length ? names.join(", ") : "-",
      };
    }

    return refund;
  } catch (err) {
    console.error("Error fetching refund request detail:", err);
    return null;
  }
}
