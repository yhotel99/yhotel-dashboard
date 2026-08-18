import { createClient } from "@/lib/supabase/server";
import {
  getCurrentUserBranchScope,
  resolveBranchFilterId,
} from "@/lib/branch.server";
import { CHECKOUT_SESSION_STATUS } from "@/lib/constants";
import type {
  CheckoutSessionRecord,
  CheckoutSessionRoom,
  CheckoutSessionStatusValue,
  CheckoutSessionsResponse,
} from "@/lib/types";

type CheckoutSessionSearchRow = {
  id: string;
  payment_code: string;
  customer_id: string;
  branch_code: string | null;
  branch_id: string | null;
  check_in: string;
  check_out: string;
  number_of_nights: number | string | null;
  total_guests: number | string | null;
  notes: string | null;
  total_amount: number | string | null;
  final_amount: number | string | null;
  payment_method: string;
  status: CheckoutSessionStatusValue;
  expires_at: string;
  booking_id: string | null;
  failure_reason: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  created_at: string;
  updated_at: string;
  rooms: CheckoutSessionRoom[] | null;
  payment_log_status: string | null;
  payment_log_id: string | null;
  total_count: number | string;
};

function toNumber(value: number | string | null | undefined, fallback = 0): number {
  if (value == null) return fallback;
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapRoom(room: CheckoutSessionRoom): CheckoutSessionRoom {
  return {
    id: room.id,
    name: room.name ?? null,
    room_number: room.room_number ?? null,
    room_type: room.room_type ?? null,
    category_code: room.category_code ?? null,
    check_in: room.check_in ?? null,
    check_out: room.check_out ?? null,
    number_of_nights: toNumber(room.number_of_nights, 0),
    amount: toNumber(room.amount),
  };
}

function mapRow(row: CheckoutSessionSearchRow): CheckoutSessionRecord {
  return {
    id: row.id,
    payment_code: row.payment_code,
    customer_id: row.customer_id,
    branch_code: row.branch_code,
    branch_id: row.branch_id,
    check_in: row.check_in,
    check_out: row.check_out,
    number_of_nights: toNumber(row.number_of_nights, 1),
    total_guests: toNumber(row.total_guests, 1),
    notes: row.notes,
    total_amount: toNumber(row.total_amount),
    final_amount: toNumber(row.final_amount),
    payment_method: row.payment_method,
    status: row.status,
    expires_at: row.expires_at,
    booking_id: row.booking_id,
    failure_reason: row.failure_reason,
    guest_name: row.guest_name,
    guest_email: row.guest_email,
    guest_phone: row.guest_phone,
    created_at: row.created_at,
    updated_at: row.updated_at,
    rooms: Array.isArray(row.rooms) ? row.rooms.map(mapRoom) : [],
    payment_log_status: row.payment_log_status,
    payment_log_id: row.payment_log_id,
  };
}

export async function getCheckoutSessionsListWithPagination({
  search,
  page = 1,
  limit = 10,
  status = CHECKOUT_SESSION_STATUS.NEEDS_ACTION,
  branchId: requestedBranchId,
  sessionId,
}: {
  search?: string | null;
  page?: number;
  limit?: number;
  status?: string | null;
  branchId?: string | null;
  sessionId?: string | null;
}): Promise<CheckoutSessionsResponse> {
  try {
    if (page < 1 || limit < 1) {
      throw new Error("Page and limit must be greater than 0");
    }

    const supabase = await createClient();
    const { scope } = await getCurrentUserBranchScope();
    const branchId = resolveBranchFilterId(scope, requestedBranchId);
    const trimmedSearch = search?.trim() || null;
    const normalizedStatus = status?.trim() || null;
    const rpcStatus =
      !normalizedStatus || normalizedStatus === "all" ? null : normalizedStatus;

    const { data, error } = await supabase.rpc("list_checkout_sessions", {
      p_search: trimmedSearch,
      p_page: page,
      p_limit: limit,
      p_status: rpcStatus,
      p_branch_id: branchId,
      p_id: sessionId || null,
    });

    if (error) {
      throw new Error(error.message);
    }

    const searchRows = (data || []) as CheckoutSessionSearchRow[];
    const total =
      searchRows.length > 0 ? Number(searchRows[0].total_count || 0) : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: searchRows.map(mapRow),
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách phiên thanh toán";
    console.error("Error fetching checkout sessions list:", err);
    throw new Error(errorMessage);
  }
}
