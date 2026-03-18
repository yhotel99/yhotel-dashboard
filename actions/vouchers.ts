"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin/server";
import type { ResultVoid, VoucherInput } from "@/lib/types";

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

    const { error } = await supabase
      .from("vouchers")
      .update(payload)
      .eq("id", id);

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

    // Use service role for writes to avoid RLS mismatches
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

