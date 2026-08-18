"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserBranchScope } from "@/lib/branch.server";
import { hasViewPermission } from "@/lib/permissions.server";
import { getCheckoutSessionsListWithPagination } from "@/services/checkout-sessions";
import { CHECKOUT_SESSION_STATUS, DASHBOARD_URLS } from "@/lib/constants";
import type { Result } from "@/lib/types";

type FinalizeCheckoutResult = {
  booking_id: string;
  payment_code: string;
  duplicate?: boolean;
};

const FINALIZE_ERROR_MESSAGES: Record<string, string> = {
  ROOM_NOT_AVAILABLE: "Phòng không còn trống. Không thể tạo booking từ phiên này.",
  INVALID_SESSION_STATUS: "Phiên không ở trạng thái có thể tạo booking.",
  SESSION_NOT_FOUND: "Không tìm thấy phiên thanh toán.",
  SESSION_FAILED: "Phiên đã thất bại, không thể tạo booking.",
  MISSING_SESSION: "Thiếu thông tin phiên thanh toán.",
};

function canCreateBookingFromSession(session: {
  status: string;
  booking_id: string | null;
}): boolean {
  return (
    (session.status === CHECKOUT_SESSION_STATUS.PENDING ||
      session.status === CHECKOUT_SESSION_STATUS.EXPIRED) &&
    !session.booking_id
  );
}

export async function finalizeCheckoutSessionAction(
  sessionId: string
): Promise<Result<FinalizeCheckoutResult>> {
  try {
    const { profile } = await getCurrentUserBranchScope();
    if (
      !profile ||
      !(await hasViewPermission(profile.role, "checkout-sessions"))
    ) {
      return {
        ok: false,
        message: "Không có quyền tạo booking từ phiên thanh toán",
      };
    }

    const accessible = await getCheckoutSessionsListWithPagination({
      page: 1,
      limit: 1,
      status: null,
      sessionId,
    });
    const session = accessible.data[0];
    if (!session) {
      return {
        ok: false,
        message: "Không tìm thấy phiên thanh toán hoặc không thuộc chi nhánh của bạn",
      };
    }

    if (!canCreateBookingFromSession(session)) {
      return {
        ok: false,
        message: "Chỉ tạo được booking từ phiên đang chờ hoặc hết hạn, chưa có booking",
      };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("finalize_checkout_session", {
      p_session_id: sessionId,
      p_payment_code: null,
      p_payment_method: "bank_transfer",
    });

    if (error) {
      return {
        ok: false,
        message: error.message || "Không thể tạo booking từ phiên thanh toán",
      };
    }

    const result =
      data && typeof data === "object"
        ? (data as {
            ok?: boolean;
            booking_id?: string;
            payment_code?: string;
            error_code?: string;
            duplicate?: boolean;
          })
        : null;

    if (!result?.ok || !result.booking_id) {
      const errorCode = result?.error_code ?? "INVALID_FINALIZE_RESPONSE";
      return {
        ok: false,
        message:
          FINALIZE_ERROR_MESSAGES[errorCode] ??
          `Không thể tạo booking (${errorCode})`,
      };
    }

    revalidatePath(DASHBOARD_URLS.CHECKOUT_SESSIONS);
    revalidatePath(DASHBOARD_URLS.BOOKINGS);

    return {
      ok: true,
      data: {
        booking_id: result.booking_id,
        payment_code: result.payment_code ?? session.payment_code,
        duplicate: result.duplicate === true,
      },
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tạo booking từ phiên thanh toán";
    console.error("Error finalizing checkout session:", err);
    return { ok: false, message: errorMessage };
  }
}
