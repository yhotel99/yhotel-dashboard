"use client";

import { useMemo, useCallback } from "react";
import useSWR from "swr";
import type { Customer, CustomerInput, PaginationMeta } from "@/lib/types";
import {
  searchCustomers,
  countCustomers,
  createCustomer as createCustomerService,
  updateCustomer as updateCustomerService,
  deleteCustomer as deleteCustomerService,
} from "@/services/customers";

// Type for SWR data
type CustomersData = {
  customers: Customer[];
  pagination: PaginationMeta;
};

// Fetcher function for SWR
async function customersFetcher(key: string): Promise<CustomersData> {
  const [, page, limit, search] = key.split(":");
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const trimmedSearch = search === "null" ? null : search;

  // Call both service functions in parallel for better performance
  const [customersData, total] = await Promise.all([
    searchCustomers({
      search: trimmedSearch,
      page: pageNum,
      limit: limitNum,
    }),
    countCustomers({ search: trimmedSearch }),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  return {
    customers: customersData,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
  };
}

/**
 * Hook for managing customers with SWR
 * @param page - Page number
 * @param limit - Items per page
 * @param search - Search term
 */
export function useCustomersQuery(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  // Create SWR key from params
  const swrKey = useMemo(
    () => `customers:${page}:${limit}:${search?.trim() || "null"}`,
    [page, limit, search]
  );

  // Use SWR to fetch customers
  const { data, error, isLoading, mutate } = useSWR<CustomersData>(
    swrKey,
    customersFetcher
  );

  const customers = data?.customers || [];
  const pagination: PaginationMeta = data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  // Create customer
  const createCustomer = useCallback(
    async (input: CustomerInput) => {
      try {
        const newCustomer = await createCustomerService(input);

        // Revalidate SWR cache
        await mutate();
        return newCustomer;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Update customer
  const updateCustomer = useCallback(
    async (id: string, input: Partial<CustomerInput>) => {
      try {
        const updatedCustomer = await updateCustomerService(id, input);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            customers: current.customers.map((customer) => {
              if (customer.id === id) {
                // Merge updated data with existing customer to preserve computed fields
                return {
                  ...updatedCustomer,
                  total_bookings: customer.total_bookings,
                  total_spent: customer.total_spent,
                } as Customer;
              }
              return customer;
            }),
          };
        }, false);

        return updatedCustomer;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Delete customer (soft delete)
  const deleteCustomer = useCallback(
    async (id: string) => {
      try {
        await deleteCustomerService(id);

        // Revalidate SWR cache
        await mutate();
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Refetch customers
  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    customers,
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách khách hàng"
      : null,
    pagination,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    refetch,
    mutate,
  };
}
