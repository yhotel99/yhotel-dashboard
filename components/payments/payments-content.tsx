"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { DataTable } from "@/components/data-table";
import { usePayments } from "@/hooks/use-payments";
import type { PaymentsResponse } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { createPaymentsColumns, PAYMENTS_COLUMNS } from "./columns";

export function PaymentsContent({
  initialData,
}: {
  initialData: PaymentsResponse;
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
      router.push(`/dashboard/payments?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Debounce search
  const debouncedSearch = useDebounce(localSearch, 500);

  useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearchParams(1, limit, debouncedSearch);
    }
  }, [debouncedSearch, search, limit, updateSearchParams]);

  const { payments, isLoading, pagination, mutate } = usePayments({
    search,
    page,
    limit,
    fallbackData: initialData,
  });

  // Handle empty page after deletion or invalid page number
  useEffect(() => {
    if (!isLoading && pagination.totalPages > 0) {
      // If current page is beyond total pages, navigate to last page
      if (page > pagination.totalPages) {
        updateSearchParams(pagination.totalPages, limit, search);
        return;
      }
      // If current page is empty (after deletion), navigate to previous page
      if (payments.length === 0 && page > 1) {
        const targetPage = Math.min(page - 1, pagination.totalPages);
        updateSearchParams(targetPage, limit, search);
      }
    }
  }, [
    payments.length,
    pagination.totalPages,
    page,
    limit,
    search,
    isLoading,
    updateSearchParams,
  ]);

  const columns = useMemo(() => createPaymentsColumns(), []);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý thanh toán</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi các giao dịch thanh toán
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={payments}
          searchKey="id"
          searchPlaceholder="Tìm kiếm theo mã thanh toán, mã booking..."
          emptyMessage="Không tìm thấy kết quả."
          entityName="thanh toán"
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
            [PAYMENTS_COLUMNS.PAYMENT_METHOD.accessorKey]: false,
          }}
        />
      </div>
    </div>
  );
}
