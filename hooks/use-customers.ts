"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Customer, CustomerInput, PaginationMeta } from "@/lib/types";
import {
  customerKeys,
  fetchCustomersQuery,
  fetchCustomerByIdQuery,
  fetchCustomerByPhoneQuery,
  fetchCustomerByEmailQuery,
  createCustomerMutation,
  updateCustomerMutation,
  deleteCustomerMutation,
} from "@/lib/queries/customers";

// Re-export types for backward compatibility
export type { Customer, CustomerInput, PaginationMeta } from "@/lib/types";

// Hook for managing customers list
export function useCustomers(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const queryClient = useQueryClient();

  // Fetch customers with React Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: customerKeys.list(page, limit, search),
    queryFn: () => fetchCustomersQuery(page, limit, search),
  });

  const customers = data?.customers || [];
  const pagination = data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  // Create customer mutation
  const createCustomerMutationHook = useMutation({
    mutationFn: createCustomerMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });

  // Update customer mutation
  const updateCustomerMutationHook = useMutation({
    mutationFn: updateCustomerMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.details() });
    },
  });

  // Delete customer mutation
  const deleteCustomerMutationHook = useMutation({
    mutationFn: deleteCustomerMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });

  return {
    customers,
    isLoading,
    error: error ? (error as Error).message : null,
    pagination,
    fetchCustomers: async () => {
      await refetch();
    },
    createCustomer: async (input: CustomerInput) => {
      return createCustomerMutationHook.mutateAsync(input);
    },
    updateCustomer: async (id: string, input: Partial<CustomerInput>) => {
      return updateCustomerMutationHook.mutateAsync({ id, input });
    },
    deleteCustomer: async (id: string) => {
      return deleteCustomerMutationHook.mutateAsync(id);
    },
    getCustomerById: async (id: string) => {
      return fetchCustomerByIdQuery(id);
    },
    getCustomerByPhone: async (phone: string) => {
      return fetchCustomerByPhoneQuery(phone);
    },
    getCustomerByEmail: async (email: string) => {
      return fetchCustomerByEmailQuery(email);
    },
  };
}

// Hook for getting a single customer by ID
export function useCustomerById(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => fetchCustomerByIdQuery(id),
    enabled: !!id,
  });
}
