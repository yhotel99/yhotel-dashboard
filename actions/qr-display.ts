"use server";

import { createClient } from "@/lib/supabase/server";
import type { BookingRecord, ResultVoid } from "@/lib/types";

/**
 * Update QR display state for realtime display
 * This will trigger realtime update on all connected QR display screens
 */
export async function updateQRDisplayAction(
  booking: BookingRecord
): Promise<ResultVoid> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc("upsert_qr_display_state", {
      p_booking_id: booking.id,
      p_booking_code: booking.booking_code,
      p_customer_name: booking.customers?.full_name || null,
      p_room_name: booking.rooms?.name || null,
      p_check_in: booking.check_in,
      p_check_out: booking.check_out,
      p_total_amount: booking.total_amount,
      p_final_amount: booking.final_amount ?? null,
    });

    if (error) {
      console.error("Error updating QR display state:", error);
      return {
        ok: false,
        message: "Không thể cập nhật trạng thái hiển thị QR",
      };
    }

    return { ok: true };
  } catch (error) {
    console.error("Error updating QR display state:", error);
    return {
      ok: false,
      message: "Lỗi hệ thống khi cập nhật trạng thái hiển thị QR",
    };
  }
}
