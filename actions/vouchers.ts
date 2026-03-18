"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin/server";
import type { Result, ResultVoid, VoucherInput, Voucher } from "@/lib/types";

export async function createVoucher(input: VoucherInput): Promise<ResultVoid> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Unauthorized" };
    }

    const payload = {
      ...input,
      code: input.code.trim(),
      name: input.name.trim(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("vouchers").insert([payload]);
    if (error) {
      return { ok: false, message: error.message || "Không thể tạo voucher" };
    }

    revalidatePath("/dashboard/vouchers", "page");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tạo voucher";
    return { ok: false, message };
  }
}

export async function updateVoucher(
  id: string,
  input: Partial<VoucherInput>
): Promise<ResultVoid> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Unauthorized" };
    }

    const payload: Record<string, unknown> = {
      ...input,
      updated_at: new Date().toISOString(),
    };
    if (typeof input.code === "string") payload.code = input.code.trim();
    if (typeof input.name === "string") payload.name = input.name.trim();

    const { error } = await supabase.from("vouchers").update(payload).eq("id", id);

    if (error) {
      return {
        ok: false,
        message: error.message || "Không thể cập nhật voucher",
      };
    }

    revalidatePath("/dashboard/vouchers", "page");
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không thể cập nhật voucher";
    return { ok: false, message };
  }
}

export async function deleteVoucher(id: string): Promise<ResultVoid> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Unauthorized" };
    }

    // Use service role for writes (bypass RLS)
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("vouchers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .select("id");

    if (error) {
      return { ok: false, message: error.message || "Không thể xóa voucher" };
    }

    if (!data || data.length === 0) {
      return {
        ok: false,
        message:
          "Không thể xóa voucher (không có quyền hoặc voucher không tồn tại).",
      };
    }

    revalidatePath("/dashboard/vouchers", "page");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể xóa voucher";
    return { ok: false, message };
  }
}

export async function toggleVoucherActive(
  id: string,
  isActive: boolean
): Promise<ResultVoid> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Unauthorized" };
    }

    const { error } = await supabase
      .from("vouchers")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return {
        ok: false,
        message: error.message || "Không thể cập nhật trạng thái voucher",
      };
    }

    revalidatePath("/dashboard/vouchers", "page");
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Không thể cập nhật trạng thái voucher";
    return { ok: false, message };
  }
}

export async function validateVoucherForBooking(input: {
  code: string;
  totalAmount: number;
}): Promise<Result<{ voucher: Voucher; discount: number; finalAmount: number }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Unauthorized" };
    }

    const code = input.code.trim();
    if (!code) {
      return { ok: false, message: "Vui lòng nhập mã voucher" };
    }
    if (!Number.isFinite(input.totalAmount) || input.totalAmount <= 0) {
      return { ok: false, message: "Tổng tiền không hợp lệ" };
    }

    const { data, error } = await supabase
      .from("vouchers")
      .select("*")
      .is("deleted_at", null)
      .eq("is_active", true)
      .ilike("code", code)
      .limit(1)
      .maybeSingle();

    if (error) {
      return { ok: false, message: error.message };
    }
    if (!data) {
      return { ok: false, message: "Voucher không tồn tại hoặc đã bị tắt" };
    }

    const now = new Date();
    if (data.start_at && new Date(data.start_at) > now) {
      return { ok: false, message: "Voucher chưa đến thời gian hiệu lực" };
    }
    if (data.end_at && new Date(data.end_at) < now) {
      return { ok: false, message: "Voucher đã hết hạn" };
    }

    const total = input.totalAmount;
    let discount = 0;
    if (data.discount_type === "percent") {
      discount = (total * (Number(data.discount_value) || 0)) / 100;
    } else {
      discount = Number(data.discount_value) || 0;
    }
    if (!Number.isFinite(discount) || discount < 0) discount = 0;
    if (discount > total) discount = total;

    const finalAmount = Math.max(0, total - discount);
    return { ok: true, data: { voucher: data as Voucher, discount, finalAmount } };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không thể kiểm tra voucher";
    return { ok: false, message };
  }
}

