import { createClient } from "@/lib/supabase/client";
import type {
  BookingRecord,
  BookingInput,
  PaginationMeta,
} from "@/lib/types";

// Query keys
export const bookingKeys = {
  all: ["bookings"] as const,
  lists: () => [...bookingKeys.all, "list"] as const,
  list: (page: number, limit: number, search: string) =>
    [...bookingKeys.lists(), page, limit, search] as const,
  details: () => [...bookingKeys.all, "detail"] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
  byCustomer: (customerId: string) =>
    [...bookingKeys.all, "customer", customerId] as const,
};

// Fetch bookings query function
export async function fetchBookingsQuery(
  page: number,
  limit: number,
  search: string
): Promise<{ bookings: BookingRecord[]; pagination: PaginationMeta }> {
  const supabase = createClient();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("bookings")
    .select(
      `
      *,
      customers (
        id,
        full_name
      ),
      rooms (
        id,
        name
      )
      `,
      { count: "exact" }
    )
    .is("deleted_at", null);

  if (search && search.trim() !== "") {
    const trimmed = search.trim();
    query = query.or(`notes.ilike.%${trimmed}%,status.eq.${trimmed}`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const bookingsData = (data || []) as BookingRecord[];
  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    bookings: bookingsData,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

// Fetch single booking query function
export async function fetchBookingByIdQuery(
  id: string
): Promise<BookingRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return null;
  }

  return data as BookingRecord;
}

// Fetch booking by ID with customer details
export async function fetchBookingByIdWithDetailsQuery(
  id: string
): Promise<BookingRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      customers (
        id,
        full_name,
        phone,
        email
      )
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as BookingRecord) || null;
}

// Fetch bookings by customer ID
export async function fetchBookingsByCustomerIdQuery(
  customerId: string
): Promise<BookingRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      customers (
        id,
        full_name
      ),
      rooms (
        id,
        name
      )
      `
    )
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as BookingRecord[];
}

// Create booking mutation function
export async function createBookingMutation(
  input: BookingInput
): Promise<BookingRecord> {
  const supabase = createClient();

  // Gọi RPC function để tạo booking (atomic, tránh race condition)
  const { data: bookingId, error: rpcError } = await supabase.rpc(
    "create_booking_secure",
    {
      p_customer_id: input.customer_id || null,
      p_room_id: input.room_id || null,
      p_check_in: input.check_in,
      p_check_out: input.check_out,
      p_number_of_nights: input.number_of_nights || 0,
      p_total_amount: input.total_amount,
      p_total_guests: input.total_guests ?? 1,
      p_notes: input.notes || null,
      p_advance_payment: input.advance_payment ?? 0,
    }
  );

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  if (!bookingId) {
    throw new Error("Không thể tạo booking");
  }

  // Fetch lại booking vừa tạo với đầy đủ relations
  const { data: bookingData, error: fetchError } = await supabase
    .from("bookings")
    .select(
      `
      *,
      customers (
        id,
        full_name
      ),
      rooms (
        id,
        name
      )
      `
    )
    .eq("id", bookingId)
    .single();

  if (fetchError || !bookingData) {
    throw new Error(
      fetchError?.message || "Không thể lấy thông tin booking vừa tạo"
    );
  }

  return bookingData as BookingRecord;
}

// Update booking mutation function
export async function updateBookingMutation({
  id,
  input,
}: {
  id: string;
  input: Partial<BookingInput>;
}): Promise<BookingRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as BookingRecord;
}

// Update booking notes mutation function
export async function updateBookingNotesMutation({
  id,
  notes,
}: {
  id: string;
  notes: string | null;
}): Promise<BookingRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ notes })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as BookingRecord;
}

// Checkout booking mutation function
export async function checkoutBookingMutation(id: string): Promise<void> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "checked_out",
      actual_check_out: now,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

// Delete booking mutation function
export async function deleteBookingMutation(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

