"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useShallowSearchParams } from "@/hooks/use-shallow-search-params";
import { useDebouncedUrlSearch } from "@/hooks/use-debounced-url-search";
import { useInitialSwrKey } from "@/hooks/use-initial-swr-key";
import { buildBookingsSwrKey, useBookings } from "@/hooks/use-bookings";
import { useBranch } from "@/contexts/branch-context";
import { buildBranchNameById } from "@/lib/branch";
import type { BookingsResponse } from "@/lib/types";
import { createCustomerBookingColumns } from "@/components/customers/customer-bookings-columns";

export function CustomerBookingsContent({
  customerId,
  initialData,
}: {
  customerId: string;
  initialData: BookingsResponse;
}) {
  const router = useRouter();
  const { searchParams, pushSearchParams } = useShallowSearchParams();
  const { filterBranchId, branches } = useBranch();

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

  const search = useMemo(() => searchParams.get("search") || "", [searchParams]);

  const branchIdForFetch = filterBranchId;

  const updateSearchParams = useCallback(
    (newPage: number, newLimit: number, newSearch: string) => {
      pushSearchParams((params) => {
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
        if (branchIdForFetch) {
          params.set("branchId", branchIdForFetch);
        } else {
          params.delete("branchId");
        }
      });
    },
    [pushSearchParams, branchIdForFetch]
  );

  // Keep ?branchId= in URL so RSC / F5 applies the same server filter
  useEffect(() => {
    const urlBranch = searchParams.get("branchId");
    const next = branchIdForFetch ?? null;
    if ((urlBranch || null) === next) return;
    pushSearchParams((params) => {
      if (next) {
        params.set("branchId", next);
      } else {
        params.delete("branchId");
      }
    });
  }, [branchIdForFetch, searchParams, pushSearchParams]);

  const onSearchCommit = useCallback(
    (value: string) => {
      updateSearchParams(1, limit, value);
    },
    [limit, updateSearchParams]
  );
  const { localSearch, setLocalSearch } = useDebouncedUrlSearch(
    search,
    onSearchCommit
  );

  const initialSwrKey = useInitialSwrKey(() =>
    buildBookingsSwrKey({
      search,
      page,
      limit,
      customerId,
      branchId: branchIdForFetch,
    })
  );

  const { bookings, isLoading, pagination, mutate } = useBookings({
    page,
    limit,
    search,
    customerId,
    branchId: branchIdForFetch,
    fallbackData: initialData,
    initialSwrKey,
  });

  useEffect(() => {
    if (!isLoading && pagination.totalPages > 0) {
      if (page > pagination.totalPages) {
        updateSearchParams(pagination.totalPages, limit, search);
        return;
      }
      if (bookings.length === 0 && page > 1) {
        const targetPage = Math.min(page - 1, pagination.totalPages);
        updateSearchParams(targetPage, limit, search);
      }
    }
  }, [
    bookings.length,
    pagination.totalPages,
    page,
    limit,
    search,
    isLoading,
    updateSearchParams,
  ]);

  const customerInfo = useMemo(() => {
    if (bookings.length > 0 && bookings[0].customers) {
      return {
        name: bookings[0].customers.full_name,
        phone: bookings[0].customers.phone || "",
      };
    }
    const fromInitial =
      initialData.data.length > 0 && initialData.data[0].customers
        ? {
            name: initialData.data[0].customers.full_name,
            phone: initialData.data[0].customers.phone || "",
          }
        : null;
    return (
      fromInitial ?? {
        name: "Khách hàng",
        phone: "",
      }
    );
  }, [bookings, initialData.data]);

  const branchNameById = useMemo(
    () => buildBranchNameById(branches),
    [branches]
  );

  const columns = useMemo(
    () => createCustomerBookingColumns(branchNameById),
    [branchNameById]
  );

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/dashboard/customers")}
          className="h-10 w-10 cursor-pointer"
        >
          <IconArrowLeft className="size-4" />
          <span className="sr-only">Quay lại</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Booking của {customerInfo.name}
          </h1>
          {customerInfo.phone ? (
            <p className="text-muted-foreground text-sm">
              SĐT: {customerInfo.phone}
            </p>
          ) : null}
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={bookings}
          searchKey="search"
          searchPlaceholder="Tìm theo mã booking hoặc số phòng..."
          emptyMessage="Khách hàng chưa có booking."
          entityName="booking"
          getRowId={(row) => row.id}
          fetchData={async () => {
            await mutate();
          }}
          isLoading={isLoading}
          paginationVariant="sequential"
          serverPagination={pagination}
          onPageChange={(newPage) => updateSearchParams(newPage, limit, search)}
          onLimitChange={(newLimit) => updateSearchParams(1, newLimit, search)}
          serverSearch={localSearch}
          onSearchChange={setLocalSearch}
        />
      </div>
    </div>
  );
}
