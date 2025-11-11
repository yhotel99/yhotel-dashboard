"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Customer, CustomerInput, PaginationMeta } from "@/lib/types";

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
        const supabase = createClient();

        // Calculate offset
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        // Build query
        let query = supabase
          .from("customers")
          .select("*", { count: "exact" })
          .is("deleted_at", null);

        // Add search filter if search term exists
        // Search by full_name, email, or phone
        if (searchTerm && searchTerm.trim() !== "") {
          const trimmedSearch = searchTerm.trim();
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

        const customersData = (data || []) as Customer[];

        const total = count || 0;
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
        const supabase = createClient();
        const { data, error } = await supabase
          .from("customers")
          .insert([input])
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        const newCustomer = data as Customer;

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
        const supabase = createClient();

        // Update customer data
        const { data, error } = await supabase
          .from("customers")
          .update(input)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        const updatedCustomer = data as Customer;

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
        const supabase = createClient();
        const { error } = await supabase
          .from("customers")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", id);

        if (error) {
          throw new Error(error.message);
        }

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
      } catch {
        return null;
      }
    },
    []
  );

  // Get customer by phone
  const getCustomerByPhone = useCallback(
    async (phone: string): Promise<Customer | null> => {
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
      } catch {
        return null;
      }
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
  };
}
