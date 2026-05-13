
import { createClient } from "@/lib/supabase/server";
import type {
  Payment,
  PaymentWithBooking,
  PaginationMeta,
  PaymentType,
  PaymentMethod,
  PaymentStatus,
  PaymentReportingStatus,
  PaymentSearchRow,
  PaymentsResponse,
} from "@/lib/types";
import { PAYMENT_STATUS, PAYMENT_TYPE, REPORTING_STATUS } from "@/lib/constants";

/**
 * Search payments with pagination and search
 * @param search - Search term
 * @param page - Page number
 * @param limit - Items per page
 * @returns Object containing payments array and pagination metadata
 */
export async function searchPayments({
  search,
  page,
  limit,
}: {
  search: string | null;
  page: number;
  limit: number;
}): Promise<{
  data: PaymentWithBooking[];
  pagination: PaginationMeta;
}> {
  try {
    const supabase = await createClient();

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query with bookings join
    const query = supabase.from("payments").select(
      `
        *,
        bookings:booking_id (
          customers:customer_id (
            full_name,
            phone
          ),
          rooms:room_id (
            name
          )
        )
      `,
      { count: "exact" }
    );

    // Note: Search filtering is done in post-processing below
    // because UUID columns cannot use ilike operator

    // Fetch data with pagination
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    let paymentsData = (data || []) as PaymentWithBooking[];

    // Post-process to filter by booking ID, customer name, room name if search term exists
    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim().toLowerCase();
      paymentsData = paymentsData.filter((payment) => {
        const paymentId = payment.id.toLowerCase();
        const bookingId = payment.booking_id.toLowerCase();
        const customerName =
          payment.bookings?.customers?.full_name?.toLowerCase() || "";
        const roomName = payment.bookings?.rooms?.name?.toLowerCase() || "";

        return (
          paymentId.includes(trimmedSearch) ||
          bookingId.includes(trimmedSearch) ||
          customerName.includes(trimmedSearch) ||
          roomName.includes(trimmedSearch)
        );
      });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: paymentsData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách thanh toán";
    throw new Error(errorMessage);
  }
}

/**
 * Create payment
 * @param input - Payment input data
 * @returns Created payment record
 */
export async function createPayment(input: {
  booking_id: string;
  amount: number;
  payment_type: PaymentType;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
}): Promise<Payment> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .insert({
        booking_id: input.booking_id,
        amount: input.amount,
        payment_type: input.payment_type,
        payment_method: input.payment_method || "pay_at_hotel",
        payment_status: input.payment_status || "pending",
        reporting_status:
          input.payment_status === PAYMENT_STATUS.PAID
            ? REPORTING_STATUS.INCLUDED
            : REPORTING_STATUS.EXCLUDED,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Payment;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tạo payment";
    throw new Error(errorMessage);
  }
}

/**
 * Update payment status
 * @param paymentId - Payment ID
 * @param status - New payment status
 * @param paidAt - Paid at timestamp (optional)
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  paidAt?: string | null
): Promise<void> {
  try {
    const supabase = await createClient();
    const updateData: {
      payment_status: string;
      reporting_status?: PaymentReportingStatus;
      paid_at?: string | null;
    } = {
      payment_status: status,
    };

    if (status === "paid" && paidAt) {
      updateData.paid_at = paidAt;
      updateData.reporting_status = REPORTING_STATUS.INCLUDED;
    } else if (status === "paid") {
      updateData.reporting_status = REPORTING_STATUS.INCLUDED;
    } else {
      updateData.paid_at = null;
      updateData.reporting_status = REPORTING_STATUS.EXCLUDED;
    }

    const { error } = await supabase
      .from("payments")
      .update(updateData)
      .eq("id", paymentId);

    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể cập nhật trạng thái payment";
    throw new Error(errorMessage);
  }
}

/**
 * Update payment status by booking ID
 * @param bookingId - Booking ID
 * @param status - New payment status
 * @param paidAt - Paid at timestamp (optional)
 */
export async function updatePaymentStatusByBookingId(
  bookingId: string,
  status: PaymentStatus,
  paidAt?: string | null
): Promise<void> {
  try {
    const supabase = await createClient();
    const updateData: {
      payment_status: string;
      reporting_status?: PaymentReportingStatus;
      paid_at?: string | null;
    } = {
      payment_status: status,
    };

    if (status === "paid" && paidAt) {
      updateData.paid_at = paidAt;
      updateData.reporting_status = REPORTING_STATUS.INCLUDED;
    } else if (status === "paid") {
      updateData.reporting_status = REPORTING_STATUS.INCLUDED;
    } else {
      updateData.paid_at = null;
      updateData.reporting_status = REPORTING_STATUS.EXCLUDED;
    }

    const { error } = await supabase
      .from("payments")
      .update(updateData)
      .eq("booking_id", bookingId);

    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể cập nhật trạng thái payment";
    throw new Error(errorMessage);
  }
}

/**
 * Check advance payment status by booking ID
 * @param bookingId - Booking ID
 * @returns Object with advance payment status information
 */
export async function checkAdvancePaymentStatus(bookingId: string): Promise<{
  hasAdvancePayment: boolean;
  isPaid: boolean;
  paymentId: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .select("id, payment_status")
      .eq("booking_id", bookingId)
      .eq("payment_type", PAYMENT_TYPE.ADVANCE_PAYMENT)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return {
        hasAdvancePayment: false,
        isPaid: false,
        paymentId: null,
      };
    }

    return {
      hasAdvancePayment: true,
      isPaid: data.payment_status === PAYMENT_STATUS.PAID,
      paymentId: data.id,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể kiểm tra trạng thái đặt cọc";
    throw new Error(errorMessage);
  }
}

/**
 * Mark advance payment as paid
 * @param bookingId - Booking ID
 */
export async function markAdvancePaymentAsPaid(
  bookingId: string
): Promise<void> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("payments")
      .update({
        payment_status: PAYMENT_STATUS.PAID,
        paid_at: now,
        reporting_status: REPORTING_STATUS.INCLUDED,
      })
      .eq("booking_id", bookingId)
      .eq("payment_type", PAYMENT_TYPE.ADVANCE_PAYMENT);

    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể đánh dấu đặt cọc";
    throw new Error(errorMessage);
  }
}

/**
 * Get payments by booking ID
 * @param bookingId - Booking ID
 * @returns Array of payment records
 */
export async function getPaymentsByBookingId(
  bookingId: string
): Promise<PaymentWithBooking[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as PaymentWithBooking[];
  } catch (err) {
    console.error("Error fetching payments by booking ID:", err);
    throw err;
  }
}

/**
 * Get payments list with pagination
 * @param search - Search term (optional)
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @param bookingId - Filter by booking ID (optional)
 * @param customerId - Filter by customer ID (optional)
 * @returns Object with payments data and pagination metadata
 */
export async function getPaymentsListWithPagination({
  search,
  page = 1,
  limit = 10,
  bookingId,
  customerId,
  paymentStatus,
  paymentType,
  dateField,
  dateFrom,
  dateTo,
}: {
  search?: string | null;
  page?: number;
  limit?: number;
  bookingId?: string | null;
  customerId?: string | null;
  paymentStatus?: PaymentStatus | null;
  paymentType?: PaymentType | null;
  dateField?: "created_at" | "paid_at" | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  }): Promise<PaymentsResponse> {
  try {
    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      throw new Error("Page and limit must be greater than 0");
    }

    const supabase = await createClient();

    // Use RPC functions for search
    const trimmedSearch = search?.trim() || null;

    // Single RPC: rows + total_count
    const paymentsResult = await supabase.rpc("search_payments", {
      p_search: trimmedSearch,
      p_page: page,
      p_limit: limit,
      p_customer_id: customerId || null,
      p_booking_id: bookingId || null,
      p_payment_status: paymentStatus || null,
      p_payment_type: paymentType || null,
      p_date_field: dateField || "created_at",
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
    });

    if (paymentsResult.error) {
      throw new Error(paymentsResult.error.message);
    }

    const searchRows = (paymentsResult.data || []) as PaymentSearchRow[];
    const total =
      searchRows.length > 0
        ? Number(searchRows[0].total_count || 0)
        : 0;

    // Map payment_search_row to PaymentWithBooking format
    const paymentsData: PaymentWithBooking[] = searchRows.map((row) => ({
      id: row.id,
      booking_id: row.booking_id,
      amount:
        typeof row.amount === "string" ? parseFloat(row.amount) : row.amount,
      payment_type: (row.payment_type || "room_charge") as PaymentType,
      payment_method: row.payment_method as PaymentMethod,
      payment_status: row.payment_status as PaymentStatus,
      reporting_status:
        (row.reporting_status as PaymentReportingStatus) ??
        (row.payment_status === PAYMENT_STATUS.PAID
          ? REPORTING_STATUS.INCLUDED
          : REPORTING_STATUS.EXCLUDED),
      paid_at: row.paid_at,
      verified_at: row.verified_at,
      refunded_at: row.refunded_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      bookings: {
        customers: row.customers?.full_name
          ? {
              full_name: row.customers.full_name,
              phone: row.customers.phone,
            }
          : null,
        rooms:
          row.rooms != null
            ? {
                name: row.rooms.name ?? "",
                items: (row.rooms.items ?? []).map((item) => ({
                  id: item.id,
                  name: item.name ?? undefined,
                })),
              }
            : null,
      },
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data: paymentsData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách thanh toán";
    console.error("Error fetching payments list:", err);
    throw new Error(errorMessage);
  }
}
