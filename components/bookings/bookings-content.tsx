"use client";

import * as React from "react";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DataTable } from "@/components/data-table";
import { useShallowSearchParams } from "@/hooks/use-shallow-search-params";
import { buildBookingsSwrKey, useBookings } from "@/hooks/use-bookings";
import { useInitialSwrKey } from "@/hooks/use-initial-swr-key";
import { useBranch } from "@/contexts/branch-context";
import {
  createBooking as createBookingAction,
  createMultiBooking as createMultiBookingAction,
  updateBooking as updateBookingAction,
  updateBookingStatusAction,
  confirmBookingEmailAction,
  cancelBookingAction,
  type CancelBookingActionOptions,
  transferBookingAction,
  checkInBookingAction,
  checkOutBookingAction,
} from "@/actions/bookings";
import {
  markAdvancePaymentAsPaidAction,
  checkAdvancePaymentStatusAction,
} from "@/actions/payments";
import type {
  BookingStatus,
  BookingInput,
  MultiBookingInput,
  BookingRecord,
  UpdateBookingInput,
  TransferBookingInput,
  BookingsResponse,
  ConfirmBookingEmailOptions,
} from "@/lib/types";
import { useDebouncedUrlSearch } from "@/hooks/use-debounced-url-search";
import { createColumns, COLUMNS } from "@/components/bookings/columns";
import { CreateBookingDialog } from "@/components/bookings/create-booking-dialog";
import { CreateMultiBookingDialog } from "@/components/bookings/create-multi-booking-dialog";
import { EditBookingDialog } from "@/components/bookings/edit-booking-dialog";
import { CheckAvailableRoomsDialog } from "@/components/bookings/check-available-rooms-dialog";
import { translateBookingError } from "@/lib/functions";
import { toast } from "sonner";
import { useRealtimeContext } from "@/contexts/realtime-context";
import { useRoomNumberLookup } from "@/hooks/use-room-number-lookup";
import { BOOKING_STATUS, bookingStatusLabels } from "@/lib/constants";
import { useProfiles } from "@/hooks/use-profiles";
import { SlidersHorizontal } from "lucide-react";
import { DateRangePicker } from "@/components/date-range/date-range-picker";

const BOOKING_STATUS_FILTER_VALUES = new Set<string>([
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN,
  BOOKING_STATUS.CHECKED_OUT,
  BOOKING_STATUS.CANCELLED,
]);

const toDateParam = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export function BookingsContent({
  initialData,
}: {
  initialData: BookingsResponse;
}) {
  const { searchParams, pushSearchParams } = useShallowSearchParams();
  const { scope, selectedBranchId, branches } = useBranch();
  const branchNameById = React.useMemo(
    () => Object.fromEntries(branches.map((b) => [b.id, b.name])),
    [branches]
  );
  const branchIdForFetch =
    scope.mode === "single" ? scope.branchId : selectedBranchId;
  const [isCheckAvailableRoomsDialogOpen, setIsCheckAvailableRoomsDialogOpen] =
    React.useState(false);

  // Reset booking count và refresh data khi vào trang bookings
  const { resetBookingCount, shouldRefreshBookings, markBookingsRefreshed } = useRealtimeContext();

  // Get pagination and search from URL params
  const page = React.useMemo(() => {
    const pageParam = searchParams.get("page");
    const pageNum = pageParam ? parseInt(pageParam, 10) : 1;
    return pageNum > 0 ? pageNum : 1;
  }, [searchParams]);

  const limit = React.useMemo(() => {
    const limitParam = searchParams.get("limit");
    const limitNum = limitParam ? parseInt(limitParam, 10) : 10;
    return limitNum > 0 ? limitNum : 10;
  }, [searchParams]);

  const search = React.useMemo(() => {
    return searchParams.get("search") || "";
  }, [searchParams]);

  const status = React.useMemo(() => {
    return searchParams.get("status") || "";
  }, [searchParams]);
  const creatorId = React.useMemo(() => {
    return searchParams.get("creatorId") || "";
  }, [searchParams]);
  const dateField = React.useMemo(() => {
    const raw = searchParams.get("dateField") || "created_at";
    return raw === "check_in" ? "check_in" : "created_at";
  }, [searchParams]);
  const dateFrom = React.useMemo(() => {
    return searchParams.get("dateFrom") || "";
  }, [searchParams]);
  const dateTo = React.useMemo(() => {
    return searchParams.get("dateTo") || "";
  }, [searchParams]);

  const cursorCreatedAt = React.useMemo(
    () => searchParams.get("cursorCreatedAt") || "",
    [searchParams]
  );
  const cursorId = React.useMemo(
    () => searchParams.get("cursorId") || "",
    [searchParams]
  );

  // Update search params
  const updateSearchParams = React.useCallback(
    (
      newPage: number,
      newLimit: number,
      newSearch: string,
      newStatus?: string,
      newCreatorId?: string,
      newDateField?: "created_at" | "check_in",
      newDateFrom?: string,
      newDateTo?: string,
      options?: { resetCursor?: boolean }
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
        const s = newStatus !== undefined ? newStatus : status;
        if (s && s.trim() !== "") {
          params.set("status", s.trim());
        } else {
          params.delete("status");
        }
        const nextCreatorId =
          newCreatorId !== undefined ? newCreatorId : creatorId;
        if (nextCreatorId && nextCreatorId.trim() !== "") {
          params.set("creatorId", nextCreatorId.trim());
        } else {
          params.delete("creatorId");
        }
        const nextDateField = newDateField ?? dateField;
        params.set("dateField", nextDateField);
        const nextDateFrom = newDateFrom !== undefined ? newDateFrom : dateFrom;
        if (nextDateFrom && nextDateFrom.trim() !== "") {
          params.set("dateFrom", nextDateFrom.trim());
        } else {
          params.delete("dateFrom");
        }
        const nextDateTo = newDateTo !== undefined ? newDateTo : dateTo;
        if (nextDateTo && nextDateTo.trim() !== "") {
          params.set("dateTo", nextDateTo.trim());
        } else {
          params.delete("dateTo");
        }
        if (options?.resetCursor) {
          params.delete("cursorCreatedAt");
          params.delete("cursorId");
        }
      });
    },
    [pushSearchParams, status, creatorId, dateField, dateFrom, dateTo]
  );

  const onSearchCommit = React.useCallback(
    (value: string) => {
      updateSearchParams(
        1,
        limit,
        value,
        status,
        creatorId,
        dateField,
        dateFrom,
        dateTo,
        { resetCursor: true }
      );
    },
    [
      creatorId,
      dateField,
      dateFrom,
      dateTo,
      limit,
      status,
      updateSearchParams,
    ]
  );
  const { localSearch, setLocalSearch } = useDebouncedUrlSearch(
    search,
    onSearchCommit
  );

  const statusFilterValue = React.useMemo(() => {
    const s = status.trim();
    if (s === "") return "all";
    return BOOKING_STATUS_FILTER_VALUES.has(s) ? s : "all";
  }, [status]);

  const statusForFetch = React.useMemo(() => {
    const s = status.trim();
    if (s === "") return "";
    return BOOKING_STATUS_FILTER_VALUES.has(s) ? s : "";
  }, [status]);

  const creatorIdForFetch = React.useMemo(() => {
    const c = creatorId.trim();
    return c === "" ? null : c;
  }, [creatorId]);

  const useKeysetCursor = Boolean(cursorCreatedAt && cursorId);

  const initialSwrKey = useInitialSwrKey(() =>
    buildBookingsSwrKey({
      search,
      page,
      limit,
      creatorId: creatorIdForFetch,
      dateField,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      status: statusForFetch,
      cursorCreatedAt,
      cursorId,
      branchId: branchIdForFetch,
      includeTotal: !useKeysetCursor,
    })
  );

  const { bookings, isLoading, pagination, mutate } = useBookings({
    search,
    page,
    limit,
    creatorId: creatorIdForFetch,
    dateField,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
    status: statusForFetch,
    cursorCreatedAt,
    cursorId,
    branchId: branchIdForFetch,
    includeTotal: !useKeysetCursor,
    fallbackData: initialData,
    initialSwrKey,
  });

  const [cachedTotal, setCachedTotal] = React.useState<number | null>(
    initialData.pagination.total > 0 ? initialData.pagination.total : null
  );

  const totalFilterKey = React.useMemo(
    () =>
      [
        branchIdForFetch,
        search,
        statusForFetch,
        creatorIdForFetch,
        dateField,
        dateFrom,
        dateTo,
      ].join("\0"),
    [
      branchIdForFetch,
      search,
      statusForFetch,
      creatorIdForFetch,
      dateField,
      dateFrom,
      dateTo,
    ]
  );
  const [prevTotalFilterKey, setPrevTotalFilterKey] =
    React.useState(totalFilterKey);

  if (totalFilterKey !== prevTotalFilterKey) {
    setPrevTotalFilterKey(totalFilterKey);
    if (cachedTotal !== null) {
      setCachedTotal(null);
    }
  }

  if (pagination.total > 0 && cachedTotal !== pagination.total) {
    setCachedTotal(pagination.total);
  }

  const tablePagination = React.useMemo(() => {
    const total = cachedTotal ?? pagination.total;
    const totalPages =
      total > 0 ? Math.ceil(total / pagination.limit) : pagination.page;
    const hasNextPage =
      Boolean(pagination.nextCursor) ||
      (total > 0 && pagination.page < totalPages);
    return {
      ...pagination,
      total,
      totalPages,
      hasNextPage,
    };
  }, [cachedTotal, pagination]);

  const handleStatusFilterChange = React.useCallback(
    (value: string) => {
      const nextStatus = value === "all" ? "" : value;
      updateSearchParams(
        1,
        limit,
        search,
        nextStatus,
        creatorId,
        dateField,
        dateFrom,
        dateTo,
        {
          resetCursor: true,
        }
      );
    },
    [creatorId, dateField, dateFrom, dateTo, limit, search, updateSearchParams]
  );

  const [filterPopoverOpen, setFilterPopoverOpen] = React.useState(false);
  const shouldLoadCollaborators =
    filterPopoverOpen || Boolean(creatorIdForFetch);
  const { profiles } = useProfiles({
    page: 1,
    limit: 100,
    enabled: shouldLoadCollaborators,
  });
  const collaboratorOptions = React.useMemo(
    () => profiles.filter((p) => p.status === "active"),
    [profiles]
  );
  const creatorName = React.useMemo(() => {
    if (!creatorIdForFetch) return null;
    return (
      collaboratorOptions.find((profile) => profile.id === creatorIdForFetch)
        ?.full_name ?? "Không xác định"
    );
  }, [collaboratorOptions, creatorIdForFetch]);
  const hasActiveFilters = React.useMemo(
    () =>
      Boolean(status.trim()) ||
      Boolean(creatorId.trim()) ||
      Boolean(dateFrom.trim()) ||
      Boolean(dateTo.trim()) ||
      dateField !== "created_at",
    [creatorId, dateField, dateFrom, dateTo, status]
  );

  const handleCollaboratorChange = React.useCallback(
    (value: string) => {
      const nextCreatorId = value === "all" ? "" : value;
      updateSearchParams(
        1,
        limit,
        search,
        status,
        nextCreatorId,
        dateField,
        dateFrom,
        dateTo,
        { resetCursor: true }
      );
    },
    [dateField, dateFrom, dateTo, limit, search, status, updateSearchParams]
  );

  const handleDateFieldChange = React.useCallback(
    (value: "created_at" | "check_in") => {
      updateSearchParams(
        1,
        limit,
        search,
        status,
        creatorId,
        value,
        dateFrom,
        dateTo,
        { resetCursor: true }
      );
    },
    [
      creatorId,
      dateFrom,
      dateTo,
      limit,
      search,
      status,
      updateSearchParams,
    ]
  );

  const handleDateRangeChange = React.useCallback(
    (from: string, to: string) => {
      updateSearchParams(
        1,
        limit,
        search,
        status,
        creatorId,
        dateField,
        from,
        to,
        { resetCursor: true }
      );
    },
    [creatorId, dateField, limit, search, status, updateSearchParams]
  );

  const handleResetFilters = React.useCallback(() => {
    updateSearchParams(1, limit, search, "", "", "created_at", "", "", {
      resetCursor: true,
    });
  }, [limit, search, updateSearchParams]);

  const { data: roomNumberById } = useRoomNumberLookup();

  // Reset count khi vào trang
  React.useEffect(() => {
    resetBookingCount();
  }, [resetBookingCount]);

  // Auto refresh khi có booking mới và user vào trang
  React.useEffect(() => {
    if (shouldRefreshBookings) {
      console.log("🔄 Refreshing bookings data...");
      mutate();
      markBookingsRefreshed();
    }
  }, [shouldRefreshBookings, mutate, markBookingsRefreshed]);

  // Use checkAdvancePaymentStatusAction and markAdvancePaymentAsPaidAction from actions

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isMultiBookingDialogOpen, setIsMultiBookingDialogOpen] =
    React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingBookingId, setEditingBookingId] = React.useState<string | null>(
    null
  );
  const [editingBooking, setEditingBooking] =
    React.useState<BookingRecord | null>(null);

  const handleCreateBooking = () => {
    setIsCreateDialogOpen(true);
  };

  const handleCreateMultiBooking = () => {
    setIsMultiBookingDialogOpen(true);
  };

  const handleCreate = React.useCallback(
    async (input: BookingInput) => {
      const result = await createBookingAction(input);

      if (!result.ok) {
        console.error("Booking creation failed:", result.message);

        // Translate error message for toast
        const translatedMessage = translateBookingError(result.message);

        toast.error(translatedMessage, {
          position: "top-center",
          duration: 5000, // Hiển thị lâu hơn để người dùng đọc
          action: {
            label: "Đóng",
            onClick: () => { },
          },
        });

        // Throw error để dialog có thể hiển thị error nếu cần
        throw new Error(result.message);
      }

      toast.success("✅ Đã tạo booking thành công!", {
        position: "top-center",
        duration: 3000,
      });
      await mutate();
    },
    [mutate]
  );

  const handleCreateMulti = React.useCallback(
    async (input: MultiBookingInput) => {
      const result = await createMultiBookingAction(input);

      if (!result.ok) {
        const translatedMessage = translateBookingError(result.message);
        toast.error(translatedMessage, {
          position: "top-center",
          duration: 5000,
          action: { label: "Đóng", onClick: () => { } },
        });
        throw new Error(result.message);
      }

      toast.success("✅ Đã tạo đặt nhiều phòng thành công!", {
        position: "top-center",
        duration: 3000,
      });
      await mutate();
    },
    [mutate]
  );

  const handleEdit = React.useCallback(async (booking: BookingRecord) => {
    setEditingBookingId(booking.id);
    setEditingBooking(booking);
    setIsEditDialogOpen(true);
  }, []);

  const handleTransfer = React.useCallback(
    async (id: string, input: TransferBookingInput) => {
      try {
        await transferBookingAction(id, input);
        toast.success("Đã chuyển phòng thành công");
        await mutate();
      } catch (error) {
        console.error(error);
        toast.error("Không thể chuyển phòng", {
          position: "top-center",
        });
      }
    },
    [mutate]
  );

  const handleCancelBooking = React.useCallback(
    async (id: string, options?: CancelBookingActionOptions) => {
      try {
        const result = await cancelBookingAction(id, options);
        if (!result.ok) {
          toast.error(result.message ?? "Không thể hủy booking");
          throw new Error(result.message ?? "Không thể hủy booking");
        }
        toast.success("Đã hủy booking thành công");
        await mutate();
      } catch {
        toast.error("Không thể hủy booking");
      }
    },
    [mutate]
  );

  const handleUpdate = React.useCallback(
    async (id: string, input: UpdateBookingInput) => {
      await updateBookingAction(id, input);
      toast.success("Đã cập nhật booking thành công");
      await mutate();
    },
    [mutate]
  );

  const handleUpdateStatus = React.useCallback(
    async (id: string, status: BookingStatus) => {
      await updateBookingStatusAction(id, status);
      await mutate();
    },
    [mutate]
  );

  const handleMarkAdvancePayment = React.useCallback(
    async (bookingId: string) => {
      try {
        await markAdvancePaymentAsPaidAction(bookingId);
        toast.success("Đã đánh dấu đặt cọc thành công");
        // Note: Payment status update doesn't affect booking list, no need to fetch
      } catch (error) {
        toast.error("Không thể đánh dấu đặt cọc");
        throw error;
      }
    },
    []
  );

  // Status change handlers
  const pendingBooking = React.useCallback(
    async (id: string) => {
      await updateBookingStatusAction(id, "pending");
      await mutate();
    },
    [mutate]
  );

  const confirmedBooking = React.useCallback(
    async (bookingCode: string, options?: ConfirmBookingEmailOptions) => {
      const result = await confirmBookingEmailAction(bookingCode, options);
      if (!result.ok) {
        toast.error(result.message ?? "Không thể xác nhận booking");
        throw new Error(result.message ?? "Không thể xác nhận booking");
      }
      await mutate();
    },
    [mutate]
  );

  const checkedInBooking = React.useCallback(
    async (id: string) => {
      await checkInBookingAction(id);
      await mutate();
    },
    [mutate]
  );

  const checkedOutBooking = React.useCallback(
    async (id: string) => {
      await checkOutBookingAction(id);
      await mutate();
    },
    [mutate]
  );

  const cancelledBooking = React.useCallback(
    async (id: string, options?: CancelBookingActionOptions) => {
      const result = await cancelBookingAction(id, options);
      if (!result.ok) {
        throw new Error(result.message ?? "Không thể hủy booking");
      }
      await mutate();
    },
    [mutate]
  );

  const columns = React.useMemo(
    () =>
      createColumns(
        handleUpdateStatus,
        {
          onEdit: handleEdit,
          onTransfer: handleTransfer,
          onMarkAdvancePayment: handleMarkAdvancePayment,
          onCancelBooking: handleCancelBooking,
          checkAdvancePaymentStatus: checkAdvancePaymentStatusAction,
          pendingBooking,
          confirmedBooking,
          checkedInBooking,
          checkedOutBooking,
          cancelledBooking,
        },
        {
          ...(roomNumberById ? { roomNumberById } : {}),
          branchNameById,
        }
      ),
    [
      handleUpdateStatus,
      handleEdit,
      handleTransfer,
      handleMarkAdvancePayment,
      handleCancelBooking,
      pendingBooking,
      confirmedBooking,
      checkedInBooking,
      checkedOutBooking,
      cancelledBooking,
      roomNumberById,
      branchNameById,
    ]
  );

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quản lý đặt phòng</h1>
            <p className="text-muted-foreground text-sm">
              Quản lý và theo dõi các đặt phòng trong khách sạn
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            <Button onClick={handleCreateMultiBooking} className="gap-2">
              <IconPlus className="size-4" />
              Đặt nhiều phòng
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsCheckAvailableRoomsDialogOpen(true)}
              className="gap-2"
            >
              <IconSearch className="size-4" />
              Kiểm tra
            </Button>
          </div>
        </div>
        <div className="rounded-xl border bg-card px-3 py-2 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-1 text-xs font-medium text-muted-foreground">
              Bộ lọc:
            </div>
            <div>
              <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2">
                    <SlidersHorizontal className="size-4" />
                    Bộ lọc
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[340px] p-4">
                  <div className="mb-3 text-sm font-medium">Lọc booking</div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                      <Select
                        value={dateField}
                        onValueChange={(v) =>
                          handleDateFieldChange(v as "created_at" | "check_in")
                        }
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Loại ngày" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="created_at">Theo ngày tạo</SelectItem>
                          <SelectItem value="check_in">Theo ngày check-in</SelectItem>
                        </SelectContent>
                      </Select>
                      <DateRangePicker
                        key={`${dateFrom}-${dateTo}`}
                        initialDateFrom={dateFrom || undefined}
                        initialDateTo={dateTo || dateFrom || undefined}
                        showCompare={false}
                        locale="vi-VN"
                        align="start"
                        onUpdate={(values) => {
                          const from = values.range.from;
                          const to = values.range.to;
                          if (!from || !to) {
                            handleDateRangeChange("", "");
                            return;
                          }
                          handleDateRangeChange(
                            toDateParam(from),
                            toDateParam(to)
                          );
                        }}
                      />
                      <Select
                        value={creatorIdForFetch ?? "all"}
                        onValueChange={handleCollaboratorChange}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Created by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả người tạo</SelectItem>
                          {collaboratorOptions.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={statusFilterValue}
                        onValueChange={handleStatusFilterChange}
                      >
                        <SelectTrigger id="booking-status-filter" className="h-9 w-full">
                          <SelectValue placeholder="Tất cả trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả trạng thái</SelectItem>
                          <SelectItem value={BOOKING_STATUS.PENDING}>
                            {bookingStatusLabels[BOOKING_STATUS.PENDING]}
                          </SelectItem>
                          <SelectItem value={BOOKING_STATUS.CONFIRMED}>
                            {bookingStatusLabels[BOOKING_STATUS.CONFIRMED]}
                          </SelectItem>
                          <SelectItem value={BOOKING_STATUS.CHECKED_IN}>
                            {bookingStatusLabels[BOOKING_STATUS.CHECKED_IN]}
                          </SelectItem>
                          <SelectItem value={BOOKING_STATUS.CHECKED_OUT}>
                            {bookingStatusLabels[BOOKING_STATUS.CHECKED_OUT]}
                          </SelectItem>
                          <SelectItem value={BOOKING_STATUS.CANCELLED}>
                            {bookingStatusLabels[BOOKING_STATUS.CANCELLED]}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      className="h-9 w-full"
                      onClick={handleResetFilters}
                      disabled={!hasActiveFilters}
                    >
                      Xóa bộ lọc
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {dateField !== "created_at" && (
              <Badge variant="outline" className="h-7 rounded-md">
                Loại ngày: Check-in
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
            {creatorName && (
              <Badge variant="outline" className="h-7 rounded-md">
                Created by: {creatorName}
              </Badge>
            )}
            {statusFilterValue !== "all" && (
              <Badge variant="outline" className="h-7 rounded-md">
                Trạng thái: {bookingStatusLabels[statusFilterValue as BookingStatus]}
              </Badge>
            )}
            {!hasActiveFilters && (
              <span className="text-xs text-muted-foreground">
                Chưa áp dụng bộ lọc
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={bookings}
          searchKey="id"
          searchPlaceholder="Tìm kiếm theo mã booking, tên khách hàng, số phòng..."
          emptyMessage="Không tìm thấy kết quả."
          entityName="booking"
          getRowId={(row) => row.id}
          fetchData={async () => {
            await mutate();
          }}
          isLoading={isLoading}
          paginationVariant="sequential"
          serverPagination={tablePagination}
          onPageChange={(newPage) => {
            if (newPage === page + 1 && pagination.nextCursor) {
              pushSearchParams((params) => {
                if (newPage > 1) {
                  params.set("page", newPage.toString());
                } else {
                  params.delete("page");
                }
                params.set(
                  "cursorCreatedAt",
                  pagination.nextCursor!.created_at
                );
                params.set("cursorId", pagination.nextCursor!.id);
              });
              return;
            }
            updateSearchParams(
              newPage,
              limit,
              search,
              status,
              creatorId,
              dateField,
              dateFrom,
              dateTo,
              {
                resetCursor: newPage <= page,
              }
            );
          }}
          onLimitChange={(newLimit) =>
            updateSearchParams(
              1,
              newLimit,
              search,
              status,
              creatorId,
              dateField,
              dateFrom,
              dateTo,
              {
                resetCursor: true,
              }
            )
          }
          serverSearch={localSearch}
          onSearchChange={setLocalSearch}
          initialColumnVisibility={{
            [COLUMNS.NUMBER_OF_NIGHTS.accessorKey]: false,
            [COLUMNS.TOTAL_GUESTS.accessorKey]: false,
            [COLUMNS.BRANCH.accessorKey]: false,
          }}
        />
      </div>

      {isCreateDialogOpen && (
        <CreateBookingDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreate={handleCreate}
        />
      )}

      {isMultiBookingDialogOpen && (
        <CreateMultiBookingDialog
          open={isMultiBookingDialogOpen}
          onOpenChange={setIsMultiBookingDialogOpen}
          onCreate={handleCreateMulti}
        />
      )}

      {editingBookingId && isEditDialogOpen && (
        <EditBookingDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditingBookingId(null);
              setEditingBooking(null);
            }
          }}
          bookingId={editingBookingId}
          booking={editingBooking}
          onUpdate={handleUpdate}
        />
      )}

      {isCheckAvailableRoomsDialogOpen && (
        <CheckAvailableRoomsDialog
          open={isCheckAvailableRoomsDialogOpen}
          onOpenChange={setIsCheckAvailableRoomsDialogOpen}
        />
      )}
    </div>
  );
}
