"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Branch, CustomerInput, Customer, Result, ResultVoid } from "@/lib/types";
import { BOOKING_STATUS, DEFAULT_BRANCH_ID } from "@/lib/constants";
import { getCurrentUserBranchScope, resolveBranchFilterId } from "@/lib/branch.server";
import { buildBranchNameById } from "@/lib/branch";

export type RelatedCustomerRow = {
  id: string;
  full_name: string;
  branch_id: string;
  branch_name: string;
};

/**
 * Search customers (simple search without stats - for booking dialogs)
 * Only returns basic customer info: id, full_name, email, phone
 * @param search - Search term
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of customer records (basic info only, no stats)
 */
export async function searchCustomersAction(
  search: string,
  limit: number = 10,
  requestedBranchId?: string | null
): Promise<Result<Customer[]>> {
  try {
    if (!search || search.trim().length < 2) {
      return {
        ok: true,
        data: [],
      };
    }

    const supabase = await createClient();
    const trimmedSearch = search.trim();
    const { scope } = await getCurrentUserBranchScope();
    const filterBranchId = resolveBranchFilterId(scope, requestedBranchId);

    let query = supabase
      .from("customers")
      .select(
        "id, full_name, email, phone, branch_id, customer_type, source, created_at, updated_at, deleted_at"
      )
      .is("deleted_at", null)
      .or(
        `full_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%,phone.ilike.%${trimmedSearch}%`
      );
    if (filterBranchId) {
      query = query.eq("branch_id", filterBranchId);
    }
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error searching customers:", error);
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: true,
      data: (data || []) as Customer[],
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tìm kiếm khách hàng";
    console.error("Error searching customers:", err);
    return {
      ok: false,
      message: errorMessage,
    };
  }
}

/**
 * Create a new customer
 * @param input - Customer input data
 */
export async function createCustomerAction(
  input: CustomerInput
): Promise<Result<Customer>> {
  const supabase = await createClient();
  const { scope } = await getCurrentUserBranchScope();
  const branchId =
    resolveBranchFilterId(scope, input.branch_id) ?? DEFAULT_BRANCH_ID;

  const { data, error } = await supabase
    .from("customers")
    .insert([{ ...input, branch_id: branchId }])
    .select()
    .single();

  if (error) {
    console.error("Error creating customer:", error);
    
    if (error.code === "23505") {
      const isBranchEmail =
        error.message.includes("customers_branch_email_unique") ||
        error.message.includes("customers_email_key");
      return {
        ok: false,
        message: isBranchEmail
          ? "Email này đã tồn tại tại chi nhánh này. Vui lòng sử dụng email khác."
          : "Email này đã tồn tại. Vui lòng sử dụng email khác.",
      };
    }

    return {
      ok: false,
      message: error.message,
    };
  }

  if (!data) {
    return {
      ok: false,
      message: "Không thể tạo khách hàng",
    };
  }

  // Revalidate customers page after creating
  revalidatePath("/dashboard/customers");

  return {
    ok: true,
    data: data as Customer,
  };
}

/**
 * Update customer
 * @param id - Customer ID
 * @param input - Partial customer input data
 */
export async function updateCustomerAction(
  id: string,
  input: Partial<CustomerInput>
): Promise<ResultVoid> {
  const supabase = await createClient();

  const { branch_id: _branchId, ...updatePayload } = input;

  const { error } = await supabase
    .from("customers")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    console.error("Error updating customer:", error);
    
    if (error.code === "23505") {
      const isBranchEmail =
        error.message.includes("customers_branch_email_unique") ||
        error.message.includes("customers_email_key");
      return {
        ok: false,
        message: isBranchEmail
          ? "Email này đã tồn tại tại chi nhánh này. Vui lòng sử dụng email khác."
          : "Email này đã tồn tại. Vui lòng sử dụng email khác.",
      };
    }

    return {
      ok: false,
      message: "Không thể cập nhật khách hàng",
    };
  }

  // Revalidate customers page after updating
  revalidatePath("/dashboard/customers");
  
  return { ok: true };
}

/**
 * Delete customer (soft delete)
 * @param id - Customer ID
 */
export async function deleteCustomerAction(
  id: string
): Promise<ResultVoid> {
  const supabase = await createClient();

  // 1. Check booking active
  const { data: activeBooking, error: bookingError } = await supabase
    .from("bookings")
    .select("id")
    .eq("customer_id", id)
    .in("status", [
      BOOKING_STATUS.PENDING,
      BOOKING_STATUS.CONFIRMED,
      BOOKING_STATUS.CHECKED_IN,
    ])
    .limit(1);

  if (bookingError) {
    console.error("Error checking active bookings:", bookingError);
    return {
      ok: false,
      message: "Không thể kiểm tra booking của khách hàng",
    };
  }

  if (activeBooking && activeBooking.length > 0) {
    return {
      ok: false,
      message: "Không thể xóa khách đang có booking",
    };
  }

  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error deleting customer:", error);
    return {
      ok: false,
      message: "Không thể xóa khách hàng",
    };
  }

  // Revalidate customers page after deleting
  revalidatePath("/dashboard/customers");
  
  return { ok: true };
}

/**
 * Find customers with same email or phone at other branches (for duplicate hints).
 */
export async function findRelatedCustomersAction(params: {
  email?: string;
  phone?: string;
  excludeId?: string;
  currentBranchId?: string | null;
}): Promise<Result<RelatedCustomerRow[]>> {
  const email = params.email?.trim();
  const phone = params.phone?.trim();

  if (!email && !phone) {
    return { ok: true, data: [] };
  }

  try {
    const supabase = await createClient();

    let query = supabase
      .from("customers")
      .select("id, full_name, branch_id")
      .is("deleted_at", null);

    if (email && phone) {
      query = query.or(`email.ilike.${email},phone.eq.${phone}`);
    } else if (email) {
      query = query.ilike("email", email);
    } else if (phone) {
      query = query.eq("phone", phone);
    }

    if (params.excludeId) {
      query = query.neq("id", params.excludeId);
    }

    if (params.currentBranchId) {
      query = query.neq("branch_id", params.currentBranchId);
    }

    const { data, error } = await query.limit(10);

    if (error) {
      return { ok: false, message: error.message };
    }

    const { data: branches } = await supabase
      .from("branches")
      .select("id, name, code")
      .is("deleted_at", null);

    const branchNameById = buildBranchNameById((branches || []) as Branch[]);

    const rows: RelatedCustomerRow[] = (data || []).map((row) => ({
      id: row.id,
      full_name: row.full_name,
      branch_id: row.branch_id,
      branch_name: branchNameById[row.branch_id] ?? "—",
    }));

    return { ok: true, data: rows };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error ? err.message : "Không thể tra cứu khách liên quan",
    };
  }
}
