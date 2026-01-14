"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CustomerInput, Customer, Result, ResultVoid } from "@/lib/types";
import { BOOKING_STATUS } from "@/lib/constants";

/**
 * Create a new customer
 * @param input - Customer input data
 */
export async function createCustomerAction(
  input: CustomerInput
): Promise<Result<Customer>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert([input])
    .select()
    .single();

  if (error) {
    console.error("Error creating customer:", error);
    return {
      ok: false,
      message: "Không thể tạo khách hàng",
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

  // Update customer data
  const { error } = await supabase
    .from("customers")
    .update(input)
    .eq("id", id);

  if (error) {
    console.error("Error updating customer:", error);
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
