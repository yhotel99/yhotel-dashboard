"use server";

import { createClient } from "@/lib/supabase/server";
import type { BookingRecord, ResultVoid } from "@/lib/types";
import { DEFAULT_BRANCH_CODE, DEFAULT_BRANCH_ID } from "@/lib/constants";

async function resolveBranchCodeForBooking(
  supabase: Awaited<ReturnType<typeof createClient>>,
  booking: BookingRecord
): Promise<string> {
  const branchId = booking.branch_id ?? DEFAULT_BRANCH_ID;
  const { data } = await supabase
    .from("branches")
    .select("code")
    .eq("id", branchId)
    .maybeSingle();
  return data?.code ?? DEFAULT_BRANCH_CODE;
}

/**
 * Update QR display state for the booking's branch (Realtime on /qr/{branchCode} only).
 */
export async function updateQRDisplayAction(
  booking: BookingRecord
): Promise<ResultVoid & { branchCode?: string }> {
  try {
    const supabase = await createClient();
    const branchCode = await resolveBranchCodeForBooking(supabase, booking);

    const { error } = await supabase.rpc("upsert_qr_display_state", {
      p_booking_id: booking.id,
      p_booking_code: booking.booking_code,
      p_customer_name: booking.customers?.full_name || null,
      p_room_name: booking.rooms?.name || null,
      p_check_in: booking.check_in,
      p_check_out: booking.check_out,
      p_total_amount: booking.total_amount,
      p_final_amount: booking.final_amount ?? null,
      p_branch_code: branchCode,
    });

    if (error) {
      console.error("Error updating QR display state:", error);
      return {
        ok: false,
        message: "Không thể cập nhật trạng thái hiển thị QR",
      };
    }

    return { ok: true, branchCode };
  } catch (error) {
    console.error("Error updating QR display state:", error);
    return {
      ok: false,
      message: "Lỗi hệ thống khi cập nhật trạng thái hiển thị QR",
    };
  }
}
