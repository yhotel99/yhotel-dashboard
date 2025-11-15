"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BookingRecord, BookingInput, PaginationMeta } from "@/lib/types";
import {
  bookingKeys,
  fetchBookingsQuery,
  fetchBookingByIdQuery,
  fetchBookingByIdWithDetailsQuery,
  fetchBookingsByCustomerIdQuery,
  createBookingMutation,
  updateBookingMutation,
  updateBookingNotesMutation,
  checkoutBookingMutation,
  deleteBookingMutation,
} from "@/lib/queries/bookings";

// Re-export types for backward compatibility
export type {
  BookingRecord,
  BookingInput,
  BookingStatus,
  PaginationMeta,
} from "@/lib/types";

// Hook for managing bookings list
export function useBookings(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const queryClient = useQueryClient();

  // Fetch bookings with React Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: bookingKeys.list(page, limit, search),
    queryFn: () => fetchBookingsQuery(page, limit, search),
  });

  const bookings = data?.bookings || [];
  const pagination = data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  // Create booking mutation
  const createBookingMutationHook = useMutation({
    mutationFn: createBookingMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });

  // Update booking mutation
  const updateBookingMutationHook = useMutation({
    mutationFn: updateBookingMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.details() });
    },
  });

  // Update booking notes mutation
  const updateBookingNotesMutationHook = useMutation({
    mutationFn: updateBookingNotesMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.details() });
    },
  });

  // Checkout booking mutation
  const checkoutBookingMutationHook = useMutation({
    mutationFn: checkoutBookingMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.details() });
    },
  });

  // Delete booking mutation
  const deleteBookingMutationHook = useMutation({
    mutationFn: deleteBookingMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });

  return {
    bookings,
    isLoading,
    error: error ? (error as Error).message : null,
    pagination,
    fetchBookings: async () => {
      await refetch();
    },
    createBooking: async (input: BookingInput) => {
      return createBookingMutationHook.mutateAsync(input);
    },
    updateBooking: async (id: string, input: Partial<BookingInput>) => {
      return updateBookingMutationHook.mutateAsync({ id, input });
    },
    updateBookingNotes: async (
      id: string,
      notes: string | null
    ): Promise<BookingRecord> => {
      const updated = await updateBookingNotesMutationHook.mutateAsync({
        id,
        notes,
      });
      // Fetch full booking with relations
      const fullBooking = await fetchBookingByIdQuery(id);
      return fullBooking || updated;
    },
    checkoutBooking: async (id: string) => {
      return checkoutBookingMutationHook.mutateAsync(id);
    },
    deleteBooking: async (id: string) => {
      return deleteBookingMutationHook.mutateAsync(id);
    },
    getBookingById: async (id: string) => {
      return fetchBookingByIdQuery(id);
    },
    getBookingByIdWithDetails: async (id: string) => {
      return fetchBookingByIdWithDetailsQuery(id);
    },
    getBookingsByCustomerId: async (customerId: string) => {
      return fetchBookingsByCustomerIdQuery(customerId);
    },
  };
}

// Hook for getting a single booking by ID
export function useBookingById(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => fetchBookingByIdQuery(id),
    enabled: !!id,
  });
}

// Hook for getting bookings by customer ID
export function useBookingsByCustomerId(customerId: string) {
  return useQuery({
    queryKey: bookingKeys.byCustomer(customerId),
    queryFn: () => fetchBookingsByCustomerIdQuery(customerId),
    enabled: !!customerId,
  });
}
