"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CustomerInput, Customer } from "@/lib/types";

/**
 * Create a new customer
 * @param input - Customer input data
 */
export async function createCustomerAction(
  input: CustomerInput
): Promise<Customer> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customers")
      .insert([input])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate customers page after creating
    revalidatePath("/dashboard/customers");

    return data as Customer;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tạo khách hàng";
    throw new Error(errorMessage);
  }
}

/**
 * Update customer
 * @param id - Customer ID
 * @param input - Partial customer input data
 */
export async function updateCustomerAction(
  id: string,
  input: Partial<CustomerInput>
): Promise<Customer> {
  try {
    const supabase = await createClient();

    // Update customer data
    const { data, error } = await supabase
      .from("customers")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate customers page after updating
    revalidatePath("/dashboard/customers");

    return data as Customer;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể cập nhật khách hàng";
    throw new Error(errorMessage);
  }
}

/**
 * Delete customer (soft delete)
 * @param id - Customer ID
 */
export async function deleteCustomerAction(id: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("customers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate customers page after deleting
    revalidatePath("/dashboard/customers");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể xóa khách hàng";
    throw new Error(errorMessage);
  }
}
