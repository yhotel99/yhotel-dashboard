"use client";

import { useState, useEffect, useCallback } from "react";
import type { Customer, CustomerInput, PaginationMeta } from "@/lib/types";
import {
  searchCustomers,
  createCustomer as createCustomerService,
  updateCustomer as updateCustomerService,
  deleteCustomer as deleteCustomerService,
  getCustomerById as getCustomerByIdService,
  getCustomerByPhone as getCustomerByPhoneService,
  getCustomerByEmail as getCustomerByEmailService,
} from "@/services/customers";

// Re-export types for backward compatibility
export type { Customer, CustomerInput, PaginationMeta } from "@/lib/types";

// Hook for managing customers
export function useCustomers(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // Fetch customers with pagination and search
  const fetchCustomers = useCallback(
    async (
      pageNum: number = page,
      limitNum: number = limit,
      searchTerm: string = search
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        const trimmedSearch = searchTerm?.trim() || null;
        const { customers: customersData, total } = await searchCustomers(
          trimmedSearch,
          pageNum,
          limitNum
        );

        const totalPages = Math.ceil(total / limitNum);

        setCustomers(customersData);
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
            : "Không thể tải danh sách khách hàng";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [page, limit, search]
  );

  // Load customers on mount or when page/limit/search changes
  useEffect(() => {
    fetchCustomers(page, limit, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search]);

  // Create customer
  const createCustomer = useCallback(
    async (input: CustomerInput) => {
      try {
        const newCustomer = await createCustomerService(input);

        // Refetch current page to update total count
        await fetchCustomers(page, limit, search);
        return newCustomer;
      } catch (err) {
        throw err;
      }
    },
    [fetchCustomers, page, limit, search]
  );

  // Update customer
  const updateCustomer = useCallback(
    async (id: string, input: Partial<CustomerInput>) => {
      try {
        const updatedCustomer = await updateCustomerService(id, input);

        // Refetch current page to ensure consistency
        await fetchCustomers(page, limit, search);
        return updatedCustomer;
      } catch (err) {
        throw err;
      }
    },
    [fetchCustomers, page, limit, search]
  );

  // Delete customer (soft delete)
  const deleteCustomer = useCallback(
    async (id: string) => {
      try {
        await deleteCustomerService(id);

        // Refetch current page to ensure consistency
        await fetchCustomers(page, limit, search);
      } catch (err) {
        throw err;
      }
    },
    [fetchCustomers, page, limit, search]
  );

  // Get customer by ID
  const getCustomerById = useCallback(
    async (id: string): Promise<Customer | null> => {
      return getCustomerByIdService(id);
    },
    []
  );

  // Get customer by phone
  const getCustomerByPhone = useCallback(
    async (phone: string): Promise<Customer | null> => {
      return getCustomerByPhoneService(phone);
    },
    []
  );

  // Get customer by email
  const getCustomerByEmail = useCallback(
    async (email: string): Promise<Customer | null> => {
      return getCustomerByEmailService(email);
    },
    []
  );

  return {
    customers,
    isLoading,
    error,
    pagination,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    getCustomerByPhone,
    getCustomerByEmail,
  };
}
