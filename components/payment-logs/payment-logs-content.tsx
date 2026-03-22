"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { usePaymentLogs } from "@/hooks/use-payment-logs";
import type { PaymentLogsResponse } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { createPaymentLogColumns, PAYMENT_LOG_COLUMNS } from "./columns";
import { useRoomNumberLookup } from "@/hooks/use-room-number-lookup";

export function PaymentLogsContent({
  initialData,
}: {
  initialData: PaymentLogsResponse;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = useState("");

  // Get pagination and search from URL params
  const page = useMemo(() => {
    const pageParam = searchParams.get("page");
    const pageNum = pageParam ? parseInt(pageParam, 10) : 1;
    return pageNum > 0 ? pageNum : 1;
  }, [searchParams]);

  const limit = useMemo(() => {
    const limitParam = searchParams.get("limit");
    const limitNum = limitParam ? parseInt(limitParam, 10) : 10;
    return limitNum > 0 ? limitNum : 10;
  }, [searchParams]);

  const search = useMemo(() => {
    return searchParams.get("search") || "";
  }, [searchParams]);

  // Update search params
  const updateSearchParams = useCallback(
    (newPage: number, newLimit: number, newSearch: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) {
        params.set("page", newPage.toString());
      } else {
        params.delete("page");
      }
      if (newLimit !== 10) {
        params.set("limit", newLimit.toString());
      } else {
        params.delete("limit");
      }
      if (newSearch) {
        params.set("search", newSearch);
      } else {
        params.delete("search");
      }
      router.push(`/dashboard/payment-logs?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Debounce search
  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearchParams(1, limit, debouncedSearch);
    }
  }, [debouncedSearch, search, limit, updateSearchParams]);

  const { paymentLogs, isLoading, pagination, mutate } = usePaymentLogs({
    search,
    page,
    limit,
    fallbackData: initialData,
  });

  const { data: roomNumberById } = useRoomNumberLookup();

  // Handle empty page after deletion or invalid page number
  useEffect(() => {
    if (!isLoading && pagination.totalPages > 0) {
      // If current page is beyond total pages, navigate to last page
      if (page > pagination.totalPages) {
        updateSearchParams(pagination.totalPages, limit, search);
        return;
      }
      // If current page is empty (after deletion), navigate to previous page
      if (paymentLogs.length === 0 && page > 1) {
        const targetPage = Math.min(page - 1, pagination.totalPages);
        updateSearchParams(targetPage, limit, search);
      }
    }
  }, [
    paymentLogs.length,
    pagination.totalPages,
    page,
    limit,
    search,
    isLoading,
    updateSearchParams,
  ]);

  const columns = useMemo(
    () =>
      createPaymentLogColumns(
        roomNumberById ? { roomNumberById } : undefined
      ),
    [roomNumberById]
  );

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Lịch sử Webhook Thanh toán</h1>
          <p className="text-muted-foreground text-sm">
            Xem và theo dõi lịch sử webhook thanh toán từ hệ thống
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={paymentLogs}
          searchKey="id"
          searchPlaceholder="Tìm kiếm theo mã booking, mã giao dịch, nội dung..."
          emptyMessage="Không tìm thấy kết quả."
          entityName="lịch sử thanh toán"
          getRowId={(row) => row.id}
          fetchData={async () => {
            await mutate();
          }}
          isLoading={isLoading}
          serverPagination={pagination}
          onPageChange={(newPage) => updateSearchParams(newPage, limit, search)}
          onLimitChange={(newLimit) => updateSearchParams(1, newLimit, search)}
          serverSearch={localSearch}
          onSearchChange={setLocalSearch}
          initialColumnVisibility={{
            [PAYMENT_LOG_COLUMNS.CONTENT.accessorKey]: false,
            [PAYMENT_LOG_COLUMNS.CREATED_AT.accessorKey]: false,
          }}
        />
      </div>
    </div>
  );
}
