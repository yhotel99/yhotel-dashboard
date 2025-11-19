import { createClient } from "@/lib/supabase/client";
import type { Customer, CustomerInput } from "@/lib/types";

/**
 * Customer with bookings for stats calculation
 */
type CustomerWithBookings = Customer & {
  bookings?: Array<{
    id: string;
    total_amount: number;
    deleted_at: string | null;
  }> | null;
};

/**
 * Search customers with pagination and calculate stats from bookings
 * @param search - Search term (searches in full_name, email, phone)
 * @param page - Page number
 * @param limit - Items per page
 * @returns Object with customers array and total count
 */
export async function searchCustomers(
  search: string | null,
  page: number,
  limit: number
): Promise<{ customers: Customer[]; total: number }> {
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
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    // Process customers data and calculate stats from bookings
    const customersData = ((data || []) as CustomerWithBookings[]).map(
      (customer) => {
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
    );

    const total = count || 0;

    return {
      customers: customersData,
      total,
    };
  } catch (err) {
    console.error("Error searching customers:", err);
    throw err;
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
    console.error("Error creating customer:", err);
    throw err;
  }
}

/**
 * Update customer
 * @param id - Customer ID
 * @param input - Update data
 * @returns Updated customer record
 */
export async function updateCustomer(
  id: string,
  input: Partial<CustomerInput>
): Promise<Customer> {
  try {
    const supabase = createClient();
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
    console.error("Error updating customer:", err);
    throw err;
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
    console.error("Error deleting customer:", err);
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
    console.error("Error fetching customer:", err);
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
 * Get customer by email
 * @param email - Email address
 * @returns Customer record or null
 */
export async function getCustomerByEmail(
  email: string
): Promise<Customer | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("email", email)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Customer;
  } catch (err) {
    console.error("Error fetching customer by email:", err);
    return null;
  }
}

