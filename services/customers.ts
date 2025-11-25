import { createClient } from "@/lib/supabase/client";
import type { Customer, CustomerInput } from "@/lib/types";

// Type for customer with bookings (internal use)
type CustomerWithBookings = Customer & {
  bookings?: Array<{
    id: string;
    total_amount: number;
    deleted_at: string | null;
  }>;
};

/**
 * Process customer data and calculate stats from bookings
 */
function processCustomerData(
  customer: CustomerWithBookings
): Customer {
  const bookings = customer.bookings || [];

  // Filter out deleted bookings
  const activeBookings = bookings.filter((b) => !b.deleted_at);

  // Calculate total bookings count
  const total_bookings = activeBookings.length;

  // Calculate total spent (sum of total_amount)
  const total_spent = activeBookings.reduce(
    (sum, booking) => sum + Number(booking.total_amount || 0),
    0
  );

  // Remove bookings from customer object and add computed fields
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { bookings: _, ...customerWithoutBookings } = customer;

  return {
    ...customerWithoutBookings,
    total_bookings,
    total_spent,
  } as Customer;
}

/**
 * Search customers with pagination and search
 * @param search - Search term
 * @param page - Page number
 * @param limit - Items per page
 * @returns Array of customer records with computed stats
 */
export async function searchCustomers({
  search,
  page,
  limit,
}: {
  search: string | null;
  page: number;
  limit: number;
}): Promise<Customer[]> {
  try {
    const supabase = createClient();

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query with bookings join to calculate stats
    let query = supabase
      .from("customers")
      .select(
        `
        *,
        bookings (
          id,
          total_amount,
          deleted_at
        )
      `,
        { count: "exact" }
      )
      .is("deleted_at", null);

    // Add search filter if search term exists
    // Search by full_name, email, or phone
    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim();
      query = query.or(
        `full_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%,phone.ilike.%${trimmedSearch}%`
      );
    }

    // Fetch data with pagination
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    // Process customers data and calculate stats from bookings
    const customersData = ((data || []) as CustomerWithBookings[]).map(
      processCustomerData
    );

    return customersData;
  } catch (err) {
    console.error("Error searching customers:", err);
    throw err;
  }
}

/**
 * Count customers matching search criteria
 * @param search - Search term
 * @returns Total count
 */
export async function countCustomers({
  search,
}: {
  search: string | null;
}): Promise<number> {
  try {
    const supabase = createClient();

    // Build query
    let query = supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    // Add search filter if search term exists
    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim();
      query = query.or(
        `full_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%,phone.ilike.%${trimmedSearch}%`
      );
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return count || 0;
  } catch (err) {
    console.error("Error counting customers:", err);
    throw err;
  }
}

/**
 * Get customer by ID
 * @param id - Customer ID
 * @returns Customer record or null
 */
export async function getCustomerById(
  id: string
): Promise<Customer | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Customer;
  } catch (err) {
    console.error("Error fetching customer by ID:", err);
    return null;
  }
}

/**
 * Get customer by phone
 * @param phone - Phone number
 * @returns Customer record or null
 */
export async function getCustomerByPhone(
  phone: string
): Promise<Customer | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", phone)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Customer;
  } catch (err) {
    console.error("Error fetching customer by phone:", err);
    return null;
  }
}

/**
 * Create a new customer
 * @param input - Customer input data
 * @returns Created customer record
 */
export async function createCustomer(
  input: CustomerInput
): Promise<Customer> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .insert([input])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Customer;
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tạo khách hàng";
    throw new Error(errorMessage);
  }
}

/**
 * Update customer
 * @param id - Customer ID
 * @param input - Partial customer input data
 * @returns Updated customer record
 */
export async function updateCustomer(
  id: string,
  input: Partial<CustomerInput>
): Promise<Customer> {
  try {
    const supabase = createClient();

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

    return data as Customer;
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể cập nhật khách hàng";
    throw new Error(errorMessage);
  }
}

/**
 * Delete customer (soft delete)
 * @param id - Customer ID
 */
export async function deleteCustomer(id: string): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("customers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể xóa khách hàng";
    throw new Error(errorMessage);
  }
}

