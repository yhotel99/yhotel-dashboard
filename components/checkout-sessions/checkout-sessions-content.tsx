"use client";

import { useMemo, useEffect, useCallback } from "react";
import { useShallowSearchParams } from "@/hooks/use-shallow-search-params";
import { useInitialSwrKey } from "@/hooks/use-initial-swr-key";
import { DataTable } from "@/components/data-table";
import {
  buildCheckoutSessionsSwrKey,
  useCheckoutSessions,
} from "@/hooks/use-checkout-sessions";
import { useDebouncedUrlSearch } from "@/hooks/use-debounced-url-search";
import { useBranch } from "@/contexts/branch-context";
import { useRoomNumberLookup } from "@/hooks/use-room-number-lookup";
import {
  createCheckoutSessionColumns,
  CHECKOUT_SESSION_COLUMNS,
} from "./columns";
import type { CheckoutSessionsResponse } from "@/lib/types";
import {
  CHECKOUT_SESSION_STATUS,
  checkoutSessionStatusLabels,
} from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_STATUS = "all";

export function CheckoutSessionsContent({
  initialData,
}: {
  initialData: CheckoutSessionsResponse;
}) {
  const { searchParams, pushSearchParams } = useShallowSearchParams();
  const { filterBranchId } = useBranch();

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

  const status = useMemo(() => {
    return (
      searchParams.get("status") || CHECKOUT_SESSION_STATUS.NEEDS_ACTION
    );
  }, [searchParams]);

  const updateSearchParams = useCallback(
    (
      newPage: number,
      newLimit: number,
      newSearch: string,
      newStatus: string
    ) => {
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
        if (newStatus && newStatus !== CHECKOUT_SESSION_STATUS.NEEDS_ACTION) {
          params.set("status", newStatus);
        } else {
          params.delete("status");
        }
      });
    },
    [pushSearchParams]
  );

  const onSearchCommit = useCallback(
    (value: string) => {
      updateSearchParams(1, limit, value, status);
    },
    [limit, status, updateSearchParams]
  );
  const { localSearch, setLocalSearch } = useDebouncedUrlSearch(
    search,
    onSearchCommit
  );

  const initialSwrKey = useInitialSwrKey(() =>
    buildCheckoutSessionsSwrKey({
      search,
      page,
      limit,
      status,
      branchId: filterBranchId,
    })
  );

  const { sessions, isLoading, pagination, mutate } = useCheckoutSessions({
    search,
    page,
    limit,
    status,
    branchId: filterBranchId,
    fallbackData: initialData,
    initialSwrKey,
  });

  const { data: roomNumberById } = useRoomNumberLookup();

  useEffect(() => {
    if (!isLoading && pagination.totalPages > 0) {
      if (page > pagination.totalPages) {
        updateSearchParams(pagination.totalPages, limit, search, status);
        return;
      }
      if (sessions.length === 0 && page > 1) {
        const targetPage = Math.min(page - 1, pagination.totalPages);
        updateSearchParams(targetPage, limit, search, status);
      }
    }
  }, [
    sessions.length,
    pagination.totalPages,
    page,
    limit,
    search,
    status,
    isLoading,
    updateSearchParams,
  ]);

  const columns = useMemo(
    () =>
      createCheckoutSessionColumns({
        roomNumberById,
        onCreated: () => {
          void mutate();
        },
      }),
    [mutate, roomNumberById]
  );

  const statusSelectValue = status || CHECKOUT_SESSION_STATUS.NEEDS_ACTION;

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Phiên thanh toán online</h1>
          <p className="text-muted-foreground text-sm">
            Phiên QR/chuyển khoản trước khi tạo booking. Tạo booking thủ công
            nếu khách chuyển tiền sau khi mã hết hạn.
          </p>
        </div>
        <Select
          value={statusSelectValue}
          onValueChange={(value) => {
            updateSearchParams(1, limit, search, value);
          }}
        >
          <SelectTrigger className="h-9 w-full lg:w-[220px]">
            <SelectValue placeholder="Lọc trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CHECKOUT_SESSION_STATUS.NEEDS_ACTION}>
              Cần xử lý
            </SelectItem>
            <SelectItem value={ALL_STATUS}>Tất cả trạng thái</SelectItem>
            <SelectItem value={CHECKOUT_SESSION_STATUS.PENDING}>
              {checkoutSessionStatusLabels[CHECKOUT_SESSION_STATUS.PENDING]}
            </SelectItem>
            <SelectItem value={CHECKOUT_SESSION_STATUS.EXPIRED}>
              {checkoutSessionStatusLabels[CHECKOUT_SESSION_STATUS.EXPIRED]}
            </SelectItem>
            <SelectItem value={CHECKOUT_SESSION_STATUS.COMPLETED}>
              {checkoutSessionStatusLabels[CHECKOUT_SESSION_STATUS.COMPLETED]}
            </SelectItem>
            <SelectItem value={CHECKOUT_SESSION_STATUS.FAILED}>
              {checkoutSessionStatusLabels[CHECKOUT_SESSION_STATUS.FAILED]}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={sessions}
          searchKey="id"
          searchPlaceholder="Tìm mã thanh toán, tên, SĐT, email, phòng..."
          emptyMessage="Không tìm thấy kết quả."
          entityName="phiên thanh toán"
          getRowId={(row) => row.id}
          fetchData={async () => {
            await mutate();
          }}
          isLoading={isLoading}
          serverPagination={pagination}
          paginationVariant="sequential"
          onPageChange={(newPage) =>
            updateSearchParams(newPage, limit, search, status)
          }
          onLimitChange={(newLimit) =>
            updateSearchParams(1, newLimit, search, status)
          }
          serverSearch={localSearch}
          onSearchChange={setLocalSearch}
          initialColumnVisibility={{
            [CHECKOUT_SESSION_COLUMNS.PHONE.accessorKey]: false,
          }}
        />
      </div>
    </div>
  );
}
