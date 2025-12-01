"use client";

import { useMemo, useCallback } from "react";
import useSWR from "swr";
import type {
  RefundRequestInput,
  RefundRequestStatus,
  PaginationMeta,
  RefundRequestWithRelations,
} from "@/lib/types";
import {
  searchRefundRequests,
  createRefundRequest as createRefundRequestService,
  updateRefundRequestStatus as updateRefundRequestStatusService,
} from "@/services/refund-requests";

// Type for SWR data
type RefundRequestsData = {
  refundRequests: RefundRequestWithRelations[];
  pagination: PaginationMeta;
};

// Fetcher function for SWR
async function refundRequestsFetcher(key: string): Promise<RefundRequestsData> {
  const [, page, limit, search] = key.split(":");
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const trimmedSearch = search === "null" ? null : search;

  const { data, count } = await searchRefundRequests({
    search: trimmedSearch,
    page: pageNum,
    limit: limitNum,
  });

  const total = count || 0;
  const totalPages = Math.ceil(total / limitNum);

  return {
    refundRequests: data,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
  };
}

/**
 * Hook for managing refund requests with SWR
 * @param page - Page number
 * @param limit - Items per page
 * @param search - Search term
 */
export function useRefundRequestsQuery(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  // Create SWR key from params
  const swrKey = useMemo(
    () => `refund-requests:${page}:${limit}:${search?.trim() || "null"}`,
    [page, limit, search]
  );

  // Use SWR to fetch refund requests
  const { data, error, isLoading, mutate } = useSWR<RefundRequestsData>(
    swrKey,
    refundRequestsFetcher
  );

  const refundRequests = data?.refundRequests || [];
  const pagination: PaginationMeta = data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  // Create refund request
  const createRefundRequest = useCallback(
    async (input: RefundRequestInput) => {
      try {
        const newRefundRequest = await createRefundRequestService(input);

        // Revalidate SWR cache
        await mutate();
        return newRefundRequest;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Update refund request status
  const updateRefundRequestStatus = useCallback(
    async (id: string, status: RefundRequestStatus) => {
      try {
        const updatedRefundRequest = await updateRefundRequestStatusService(
          id,
          status
        );

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            refundRequests: current.refundRequests.map((request) => {
              if (request.id === id) {
                return {
                  ...request,
                  status: updatedRefundRequest.status,
                  approved_by: updatedRefundRequest.approved_by,
                  refunded_by: updatedRefundRequest.refunded_by,
                };
              }
              return request;
            }),
          };
        }, false);

        // Revalidate to ensure consistency
        await mutate();
        return updatedRefundRequest;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Refetch refund requests
  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    refundRequests,
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách yêu cầu hoàn tiền"
      : null,
    pagination,
    createRefundRequest,
    updateRefundRequestStatus,
    refetch,
    mutate,
  };
}
