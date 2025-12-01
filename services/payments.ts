import { createClient } from "@/lib/supabase/client";
import type {
  Payment,
  PaymentWithBooking,
  PaginationMeta,
  PaymentType,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/types";
import { PAYMENT_STATUS, PAYMENT_TYPE } from "@/lib/constants";

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
    const supabase = createClient();

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
    const supabase = createClient();
    const { data, error } = await supabase
      .from("payments")
      .insert({
        booking_id: input.booking_id,
        amount: input.amount,
        payment_type: input.payment_type,
        payment_method: input.payment_method || "pay_at_hotel",
        payment_status: input.payment_status || "pending",
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
    const supabase = createClient();
    const updateData: {
      payment_status: string;
      paid_at?: string | null;
    } = {
      payment_status: status,
    };

    if (status === "paid" && paidAt) {
      updateData.paid_at = paidAt;
    } else if (status !== "paid") {
      updateData.paid_at = null;
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
    const supabase = createClient();
    const updateData: {
      payment_status: string;
      paid_at?: string | null;
    } = {
      payment_status: status,
    };

    if (status === "paid" && paidAt) {
      updateData.paid_at = paidAt;
    } else if (status !== "paid") {
      updateData.paid_at = null;
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
    const supabase = createClient();
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
    const supabase = createClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("payments")
      .update({
        payment_status: PAYMENT_STATUS.PAID,
        paid_at: now,
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
    const supabase = createClient();
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
