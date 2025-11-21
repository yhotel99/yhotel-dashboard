"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BookingInput, BookingRecord, PaginationMeta } from "@/lib/types";
import {
  BOOKING_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
} from "@/lib/constants";
import {
  searchBookings,
  countBookings,
  createBookingSecure,
  getBookingByIdWithRelations,
} from "@/services/bookings";

// Re-export types for backward compatibility
export type { BookingRecord, PaginationMeta } from "@/lib/types";

// Hook for managing bookings
export function useBookings(options?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const search = options?.search ?? "";

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // Fetch all bookings with pagination and search (no customer filter)
  const fetchBookings = useCallback(
    async (
      pageNum: number = page,
      limitNum: number = limit,
      searchTerm: string = search
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        const trimmedSearch = searchTerm?.trim() || null;

        // Call both service functions in parallel for better performance
        const [bookingsData, total] = await Promise.all([
          searchBookings(trimmedSearch, pageNum, limitNum),
          countBookings(trimmedSearch),
        ]);

        const totalPages = Math.ceil(total / limitNum);

        setBookings(bookingsData);
        setPagination({
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách booking";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [page, limit, search]
  );

  // Helper function to update booking status
  const updateBookingStatusInternal = useCallback(
    async (bookingId: string, status: BookingRecord["status"]) => {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("bookings")
          .update({ status })
          .eq("id", bookingId);

        if (error) {
          throw new Error(error.message);
        }
        setBookings((prev) =>
          prev.map((booking) =>
            booking.id === bookingId ? { ...booking, status } : booking
          )
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể cập nhật trạng thái booking";
        throw new Error(errorMessage);
      }
    },
    []
  );

  // Update booking status to pending
  const pendingBooking = useCallback(
    async (bookingId: string) => {
      await updateBookingStatusInternal(bookingId, BOOKING_STATUS.PENDING);
    },
    [updateBookingStatusInternal]
  );

  // Update booking status to confirmed
  const confirmedBooking = useCallback(
    async (bookingId: string) => {
      try {
        // Update booking status
        await updateBookingStatusInternal(bookingId, BOOKING_STATUS.CONFIRMED);

        // Update payment status to paid for all payments of this booking
        const supabase = createClient();
        const now = new Date().toISOString();
        const { error } = await supabase
          .from("payments")
          .update({
            payment_status: PAYMENT_STATUS.PAID,
            paid_at: now,
          })
          .eq("booking_id", bookingId);

        if (error) {
          console.error("Error updating payment status:", error);
          // Don't throw error here, booking is already confirmed
          // Just log the error
        }
      } catch (err) {
        // Re-throw booking status update errors
        throw err;
      }
    },
    [updateBookingStatusInternal]
  );

  // Update booking status to checked_in
  const checkedInBooking = useCallback(
    async (bookingId: string) => {
      await updateBookingStatusInternal(bookingId, BOOKING_STATUS.CHECKED_IN);
    },
    [updateBookingStatusInternal]
  );

  // Update booking status to checked_out
  const checkedOutBooking = useCallback(
    async (bookingId: string) => {
      await updateBookingStatusInternal(bookingId, BOOKING_STATUS.CHECKED_OUT);
    },
    [updateBookingStatusInternal]
  );

  // Update booking status to cancelled
  const cancelledBooking = useCallback(
    async (bookingId: string) => {
      await updateBookingStatusInternal(bookingId, BOOKING_STATUS.CANCELLED);
    },
    [updateBookingStatusInternal]
  );

  // Generic update booking status (for backward compatibility)
  const updateBookingStatus = useCallback(
    async (bookingId: string, status: BookingRecord["status"]) => {
      await updateBookingStatusInternal(bookingId, status);
    },
    [updateBookingStatusInternal]
  );

  // Get bookings by customer ID (simple version - all bookings without pagination)
  const getBookingsByCustomerId = useCallback(
    async (customerIdParam: string): Promise<BookingRecord[]> => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            *,
            rooms:room_id (
              name
            )
          `
          )
          .eq("customer_id", customerIdParam)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (error) {
          throw new Error(error.message);
        }

        return (data || []) as BookingRecord[];
      } catch (err) {
        console.error("Error fetching bookings:", err);
        return [];
      }
    },
    []
  );

  // Fetch bookings by customer ID with pagination and search
  const fetchBookingsByCustomerId = useCallback(
    async (
      customerIdParam: string,
      pageNum: number = 1,
      limitNum: number = 10,
      searchTerm: string | null = null
    ) => {
      try {
        setIsLoading(true);
        setError(null);
        const supabase = createClient();

        // Calculate offset
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        // Build query with rooms join
        let query = supabase
          .from("bookings")
          .select(
            `
            *,
            rooms:room_id (
              name
            )
          `,
            { count: "exact" }
          )
          .eq("customer_id", customerIdParam)
          .is("deleted_at", null);

        // Add search filter if search term exists
        if (searchTerm && searchTerm.trim() !== "") {
          const trimmedSearch = searchTerm.trim();
          query = query.ilike("id", `%${trimmedSearch}%`);
        }

        // Fetch data with pagination
        const { data, error, count } = await query
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) {
          throw new Error(error.message);
        }

        let bookingsData = (data || []) as BookingRecord[];

        // Post-process to filter by room name and booking ID if search term exists
        if (searchTerm && searchTerm.trim() !== "") {
          const trimmedSearch = searchTerm.trim().toLowerCase();
          bookingsData = bookingsData.filter((booking) => {
            const roomName = booking.rooms?.name?.toLowerCase() || "";
            const bookingId = booking.id.toLowerCase();
            return (
              roomName.includes(trimmedSearch) ||
              bookingId.includes(trimmedSearch)
            );
          });
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / limitNum);

        setBookings(bookingsData);
        setPagination({
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách bookings";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Get booking by ID
  const getBookingById = useCallback(
    async (bookingId: string): Promise<BookingRecord | null> => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            *,
            rooms:room_id (
              name
            ),
            customers:customer_id (
              full_name,
              phone
            )
          `
          )
          .eq("id", bookingId)
          .is("deleted_at", null)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // No rows returned
            return null;
          }
          throw new Error(error.message);
        }

        return (data || null) as BookingRecord | null;
      } catch (err) {
        console.error("Error fetching booking:", err);
        throw err;
      }
    },
    []
  );

  // Create booking
  const createBooking = useCallback(
    async (input: BookingInput): Promise<BookingRecord> => {
      try {
        // Create booking using secure RPC function
        const bookingId = await createBookingSecure(input);

        // Fetch booking with relations
        const bookingData = await getBookingByIdWithRelations(bookingId);

        if (!bookingData) {
          // If can't fetch, still refresh list
          await fetchBookings(page, limit, search);
          throw new Error("Không thể lấy thông tin booking vừa tạo");
        }

        // Create payments for the booking
        const supabase = createClient();
        const paymentsToCreate = [];

        // Payment 1: advance_payment (only if advance_payment > 0)
        if (bookingData.advance_payment > 0) {
          paymentsToCreate.push({
            booking_id: bookingData.id,
            amount: bookingData.advance_payment,
            payment_type: PAYMENT_TYPE.ADVANCE_PAYMENT,
            payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
            payment_status: PAYMENT_STATUS.PENDING,
          });
        }

        // Payment 2: room_charge (remaining amount after advance_payment)
        const roomChargeAmount =
          bookingData.total_amount - bookingData.advance_payment;
        if (roomChargeAmount > 0) {
          paymentsToCreate.push({
            booking_id: bookingData.id,
            amount: roomChargeAmount,
            payment_type: PAYMENT_TYPE.ROOM_CHARGE,
            payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
            payment_status: PAYMENT_STATUS.PENDING,
          });
        }

        // Insert payments
        if (paymentsToCreate.length > 0) {
          const { error: paymentsError } = await supabase
            .from("payments")
            .insert(paymentsToCreate);

          if (paymentsError) {
            console.error("Error creating payments:", paymentsError);
            throw new Error(
              `Đã tạo booking nhưng không thể tạo payments: ${paymentsError.message}`
            );
          }
        }

        return bookingData;
      } catch (err) {
        throw err;
      }
    },
    [fetchBookings, page, limit, search]
  );

  // Update booking (simple fields only: total_guests, notes, etc.)
  const updateBooking = useCallback(
    async (bookingId: string, input: BookingInput): Promise<BookingRecord> => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("bookings")
          .update(input)
          .eq("id", bookingId)
          .select(
            `
            *,
            rooms:room_id (
              name
            ),
            customers:customer_id (
              full_name,
              phone
            )
          `
          )
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return data as BookingRecord;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể cập nhật booking";
        throw new Error(errorMessage);
      }
    },
    []
  );

  // Transfer booking (update room, check-in, check-out, advance_payment and handle payments)
  const transferBooking = useCallback(
    async (
      bookingId: string,
      input: {
        room_id?: string | null;
        check_in?: string;
        check_out?: string;
        number_of_nights?: number;
        total_amount?: number;
        advance_payment?: number;
      }
    ): Promise<BookingRecord> => {
      try {
        const supabase = createClient();

        // Step 1: Get current booking to check status
        const { data: currentBooking, error: fetchError } = await supabase
          .from("bookings")
          .select("status, advance_payment, total_amount")
          .eq("id", bookingId)
          .single();

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        if (!currentBooking) {
          throw new Error("Không tìm thấy booking");
        }

        // Step 2: Check if booking is pending (only allow transfer for pending bookings)
        if (currentBooking.status !== BOOKING_STATUS.PENDING) {
          throw new Error(
            "Chỉ có thể chuyển phòng khi booking ở trạng thái pending"
          );
        }

        // Step 3: Update booking
        const { error: updateError } = await supabase
          .from("bookings")
          .update(input)
          .eq("id", bookingId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        // Step 4: Fetch updated booking with relations
        const { data: updatedBooking, error: fetchUpdatedError } =
          await supabase
            .from("bookings")
            .select(
              `
            *,
            rooms:room_id (
              name
            ),
            customers:customer_id (
              full_name,
              phone
            )
          `
            )
            .eq("id", bookingId)
            .single();

        if (fetchUpdatedError) {
          throw new Error(fetchUpdatedError.message);
        }

        if (!updatedBooking) {
          throw new Error("Không tìm thấy booking sau khi cập nhật");
        }

        // Step 5: Calculate payment amounts from updated booking
        const finalTotalAmount = updatedBooking.total_amount ?? 0;
        const finalAdvancePayment = updatedBooking.advance_payment ?? 0;
        const finalRoomChargeAmount = finalTotalAmount - finalAdvancePayment;

        // Step 6: Get existing payments (only pending payments can be updated)
        const { data: existingPayments, error: paymentsError } = await supabase
          .from("payments")
          .select("id, payment_type, payment_status")
          .eq("booking_id", bookingId)
          .eq("payment_status", PAYMENT_STATUS.PENDING);

        if (paymentsError) {
          console.error("Error fetching payments:", paymentsError);
          // Continue anyway - we'll try to create/update payments
        }

        // Step 7: Handle ADVANCE_PAYMENT
        const existingAdvancePayment = existingPayments?.find(
          (p) => p.payment_type === PAYMENT_TYPE.ADVANCE_PAYMENT
        );

        if (existingAdvancePayment) {
          // Payment exists - update or delete
          if (finalAdvancePayment > 0) {
            const { error: updateError } = await supabase
              .from("payments")
              .update({ amount: finalAdvancePayment })
              .eq("id", existingAdvancePayment.id);

            if (updateError) {
              throw new Error(
                `Không thể cập nhật advance payment: ${updateError.message}`
              );
            }
          } else {
            // Delete if advance_payment is 0
            const { error: deleteError } = await supabase
              .from("payments")
              .delete()
              .eq("id", existingAdvancePayment.id);

            if (deleteError) {
              throw new Error(
                `Không thể xóa advance payment: ${deleteError.message}`
              );
            }
          }
        } else {
          // Payment doesn't exist - create if needed
          if (finalAdvancePayment > 0) {
            const { error: createError } = await supabase
              .from("payments")
              .insert({
                booking_id: bookingId,
                amount: finalAdvancePayment,
                payment_type: PAYMENT_TYPE.ADVANCE_PAYMENT,
                payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
                payment_status: PAYMENT_STATUS.PENDING,
              });

            if (createError) {
              throw new Error(
                `Không thể tạo advance payment: ${createError.message}`
              );
            }
          }
        }

        // Step 8: Handle ROOM_CHARGE
        const existingRoomCharge = existingPayments?.find(
          (p) => p.payment_type === PAYMENT_TYPE.ROOM_CHARGE
        );

        if (existingRoomCharge) {
          // Payment exists - update or delete
          if (finalRoomChargeAmount > 0) {
            const { error: updateError } = await supabase
              .from("payments")
              .update({ amount: finalRoomChargeAmount })
              .eq("id", existingRoomCharge.id);

            if (updateError) {
              throw new Error(
                `Không thể cập nhật room charge: ${updateError.message}`
              );
            }
          } else {
            // Delete if room_charge is 0 or negative
            const { error: deleteError } = await supabase
              .from("payments")
              .delete()
              .eq("id", existingRoomCharge.id);

            if (deleteError) {
              throw new Error(
                `Không thể xóa room charge: ${deleteError.message}`
              );
            }
          }
        } else {
          // Payment doesn't exist - create if needed
          if (finalRoomChargeAmount > 0) {
            const { error: createError } = await supabase
              .from("payments")
              .insert({
                booking_id: bookingId,
                amount: finalRoomChargeAmount,
                payment_type: PAYMENT_TYPE.ROOM_CHARGE,
                payment_method: PAYMENT_METHOD.PAY_AT_HOTEL,
                payment_status: PAYMENT_STATUS.PENDING,
              });

            if (createError) {
              throw new Error(
                `Không thể tạo room charge: ${createError.message}`
              );
            }
          }
        }

        // Step 9: Update local state with new values
        let updatedBookingRecord: BookingRecord | null = null;

        setBookings((prevBookings) =>
          prevBookings.map((booking) => {
            if (booking.id === bookingId) {
              const updated = {
                ...booking,
                ...input,
                total_amount: finalTotalAmount,
                advance_payment: finalAdvancePayment,
                // Keep existing relations
                customers: booking.customers,
                rooms: booking.rooms,
              };
              updatedBookingRecord = updated;
              return updated;
            }
            return booking;
          })
        );

        // Return updated booking record
        if (updatedBookingRecord) {
          return updatedBookingRecord;
        }

        // Fallback: return a constructed booking record (should not happen)
        return {
          ...currentBooking,
          ...input,
          total_amount: finalTotalAmount,
          advance_payment: finalAdvancePayment,
        } as BookingRecord;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể chuyển phòng";
        throw new Error(errorMessage);
      }
    },
    []
  );

  return {
    bookings,
    isLoading,
    error,
    pagination,
    fetchBookings,
    updateBookingStatus,
    pendingBooking,
    confirmedBooking,
    checkedInBooking,
    checkedOutBooking,
    cancelledBooking,
    getBookingsByCustomerId,
    fetchBookingsByCustomerId,
    getBookingById,
    createBooking,
    updateBooking,
    transferBooking,
  };
}
