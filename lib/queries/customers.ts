import { createClient } from "@/lib/supabase/client";
import type { Customer, CustomerInput, PaginationMeta } from "@/lib/types";

// Query keys
export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (page: number, limit: number, search: string) =>
    [...customerKeys.lists(), page, limit, search] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  byPhone: (phone: string) => [...customerKeys.all, "phone", phone] as const,
  byEmail: (email: string) => [...customerKeys.all, "email", email] as const,
};

// Helper type for customer with bookings
type CustomerWithBookings = Customer & {
  bookings?: Array<{
    id: string;
    total_amount: number;
    deleted_at: string | null;
  }> | null;
};

// Fetch customers query function
export async function fetchCustomersQuery(
  page: number,
  limit: number,
  search: string
): Promise<{ customers: Customer[]; pagination: PaginationMeta }> {
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
  const totalPages = Math.ceil(total / limit);

  return {
    customers: customersData,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

// Fetch single customer query function
export async function fetchCustomerByIdQuery(
  id: string
): Promise<Customer | null> {
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
}

// Fetch customer by phone query function
export async function fetchCustomerByPhoneQuery(
  phone: string
): Promise<Customer | null> {
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
}

// Fetch customer by email query function
export async function fetchCustomerByEmailQuery(
  email: string
): Promise<Customer | null> {
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
}

// Create customer mutation function
export async function createCustomerMutation(
  input: CustomerInput
): Promise<Customer> {
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
}

// Update customer mutation function
export async function updateCustomerMutation({
  id,
  input,
}: {
  id: string;
  input: Partial<CustomerInput>;
}): Promise<Customer> {
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
}

// Delete customer mutation function
export async function deleteCustomerMutation(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

