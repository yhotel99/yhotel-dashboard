"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { DataTable } from "@/components/data-table";
import { usePayments } from "@/hooks/use-payments";
import type { PaymentStatus, PaymentType, PaymentsResponse } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { createPaymentsColumns, PAYMENTS_COLUMNS } from "./columns";
import { useRoomNumberLookup } from "@/hooks/use-room-number-lookup";
import {
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  paymentStatusLabels,
  paymentTypeLabels,
} from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal } from "lucide-react";
import { DateRangePicker } from "@/components/date-range/date-range-picker";
import { useBranch } from "@/contexts/branch-context";

const toDateParam = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export function PaymentsContent({
  initialData,
}: {
  initialData: PaymentsResponse;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { filterBranchId, branches } = useBranch();
  const branchNameById = useMemo(
    () => Object.fromEntries(branches.map((b) => [b.id, b.name])),
    [branches]
  );
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
  const paymentStatus = useMemo(
    () => searchParams.get("paymentStatus"),
    [searchParams]
  );
  const paymentType = useMemo(() => searchParams.get("paymentType"), [searchParams]);
  const dateField = useMemo(
    () => (searchParams.get("dateField") === "paid_at" ? "paid_at" : "created_at"),
    [searchParams]
  );
  const dateFrom = useMemo(
    () => searchParams.get("dateFrom"),
    [searchParams]
  );
  const dateTo = useMemo(() => searchParams.get("dateTo"), [searchParams]);

  // Update search params
  const updateSearchParams = useCallback(
    (
      newPage: number,
      newLimit: number,
      newSearch: string,
      overrides?: Partial<{
        paymentStatus: string | null;
        paymentType: string | null;
        dateField: "created_at" | "paid_at";
        dateFrom: string | null;
        dateTo: string | null;
      }>
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      const hasOverride = <K extends string>(key: K) =>
        Boolean(overrides && key in overrides);
      const resolvedPaymentStatus = hasOverride("paymentStatus")
        ? overrides?.paymentStatus ?? null
        : paymentStatus ?? null;
      const resolvedPaymentType = hasOverride("paymentType")
        ? overrides?.paymentType ?? null
        : paymentType ?? null;
      const resolvedDateField = hasOverride("dateField")
        ? overrides?.dateField ?? "created_at"
        : dateField;
      const resolvedDateFrom = hasOverride("dateFrom")
        ? overrides?.dateFrom ?? null
        : dateFrom ?? null;
      const resolvedDateTo = hasOverride("dateTo")
        ? overrides?.dateTo ?? null
        : dateTo ?? null;

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
      if (resolvedPaymentStatus) {
        params.set("paymentStatus", resolvedPaymentStatus);
      } else {
        params.delete("paymentStatus");
      }
      if (resolvedPaymentType) {
        params.set("paymentType", resolvedPaymentType);
      } else {
        params.delete("paymentType");
      }
      if (resolvedDateField) {
        params.set("dateField", resolvedDateField);
      } else {
        params.delete("dateField");
      }
      if (resolvedDateFrom) {
        params.set("dateFrom", resolvedDateFrom);
      } else {
        params.delete("dateFrom");
      }
      if (resolvedDateTo) {
        params.set("dateTo", resolvedDateTo);
      } else {
        params.delete("dateTo");
      }
      router.push(`/dashboard/payments?${params.toString()}`);
    },
    [router, searchParams, paymentStatus, paymentType, dateField, dateFrom, dateTo]
  );

  // Debounce search
  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearchParams(1, limit, debouncedSearch);
    }
  }, [debouncedSearch, search, limit, updateSearchParams]);

  const { payments, isLoading, pagination, mutate } = usePayments({
    search,
    page,
    limit,
    paymentStatus,
    paymentType,
    dateField,
    dateFrom,
    dateTo,
    branchId: filterBranchId,
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

  const columns = useMemo(
    () =>
      createPaymentsColumns({
        ...(roomNumberById ? { roomNumberById } : {}),
        branchNameById,
      }),
    [roomNumberById, branchNameById]
  );
  const hasActiveFilters = Boolean(
    (paymentStatus && paymentStatus !== "all") ||
    (paymentType && paymentType !== "all") ||
    (dateField && dateField !== "created_at") ||
    dateFrom ||
    dateTo
  );

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
        <div className="mb-4 rounded-xl border bg-card px-3 py-2 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-1 text-xs font-medium text-muted-foreground">
              Bộ lọc:
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <SlidersHorizontal className="size-4" />
                  Bộ lọc
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[340px] p-4">
                <div className="mb-3 text-sm font-medium">Lọc thanh toán</div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                    <Select
                      value={paymentStatus || "all"}
                      onValueChange={(value) =>
                        updateSearchParams(1, limit, search, {
                          paymentStatus: value === "all" ? null : value,
                        })
                      }
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Tất cả trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        {Object.values(PAYMENT_STATUS).map((status) => (
                          <SelectItem key={status} value={status}>
                            {paymentStatusLabels[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Loại thanh toán</Label>
                    <Select
                      value={paymentType || "all"}
                      onValueChange={(value) =>
                        updateSearchParams(1, limit, search, {
                          paymentType: value === "all" ? null : value,
                        })
                      }
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Tất cả loại thanh toán" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả loại thanh toán</SelectItem>
                        {Object.values(PAYMENT_TYPE).map((type) => (
                          <SelectItem key={type} value={type}>
                            {paymentTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Lọc theo ngày</Label>
                    <Select
                      value={dateField}
                      onValueChange={(value) =>
                        updateSearchParams(1, limit, search, {
                          dateField: value === "paid_at" ? "paid_at" : "created_at",
                        })
                      }
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Ngày tạo</SelectItem>
                        <SelectItem value="paid_at">Ngày thanh toán</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Khoảng ngày</Label>
                  <div className="w-full">
                    <DateRangePicker
                      key={`${dateFrom}-${dateTo}`}
                      initialDateFrom={dateFrom || new Date()}
                      initialDateTo={dateTo || dateFrom || undefined}
                      showCompare={false}
                      fullWidth
                      locale="vi-VN"
                      align="start"
                      onUpdate={(values) => {
                        const from = values.range.from;
                        const to = values.range.to;
                        if (!from || !to) {
                          updateSearchParams(1, limit, search, {
                            dateFrom: null,
                            dateTo: null,
                          });
                          return;
                        }
                        updateSearchParams(1, limit, search, {
                          dateFrom: toDateParam(from),
                          dateTo: toDateParam(to),
                        });
                      }}
                    />
                  </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={!hasActiveFilters}
                    onClick={() =>
                      updateSearchParams(1, limit, search, {
                        paymentStatus: null,
                        paymentType: null,
                        dateField: "created_at",
                        dateFrom: null,
                        dateTo: null,
                      })
                    }
                  >
                    Xóa bộ lọc
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {paymentStatus && paymentStatus !== "all" && (
              <Badge variant="outline" className="h-7 rounded-md">
                Trạng thái: {paymentStatusLabels[paymentStatus as PaymentStatus]}
              </Badge>
            )}
            {paymentType && paymentType !== "all" && (
              <Badge variant="outline" className="h-7 rounded-md">
                Loại thanh toán: {paymentTypeLabels[paymentType as PaymentType]}
              </Badge>
            )}
            {dateField !== "created_at" && (
              <Badge variant="outline" className="h-7 rounded-md">
                Loại ngày: Ngày thanh toán
              </Badge>
            )}
            {dateFrom && (
              <Badge variant="outline" className="h-7 rounded-md">
                Từ: {dateFrom}
              </Badge>
            )}
            {dateTo && (
              <Badge variant="outline" className="h-7 rounded-md">
                Đến: {dateTo}
              </Badge>
            )}
            {!hasActiveFilters && (
              <span className="text-xs text-muted-foreground">
                Chưa áp dụng bộ lọc
              </span>
            )}
          </div>
        </div>

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
            [PAYMENTS_COLUMNS.REPORTING_STATUS.accessorKey]: false,
            [PAYMENTS_COLUMNS.BRANCH.accessorKey]: false,
          }}
        />
      </div>
    </div>
  );
}
