"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { useBookings } from "@/hooks/use-bookings";
import {
  createBooking as createBookingAction,
  createMultiBooking as createMultiBookingAction,
  updateBooking as updateBookingAction,
  updateBookingStatusAction,
  confirmBookingEmailAction,
  cancelBookingAction,
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
} from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
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

const BOOKING_STATUS_FILTER_VALUES = new Set<string>([
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN,
  BOOKING_STATUS.CHECKED_OUT,
  BOOKING_STATUS.CANCELLED,
]);

export function BookingsContent({
  initialData,
}: {
  initialData: BookingsResponse;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = React.useState("");
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

  const cursorCreatedAt = React.useMemo(
    () => searchParams.get("cursorCreatedAt") || "",
    [searchParams]
  );
  const cursorId = React.useMemo(
    () => searchParams.get("cursorId") || "",
    [searchParams]
  );

  // Debounce search
  const debouncedSearch = useDebounce(localSearch, 300);

  // Update search params
  const updateSearchParams = React.useCallback(
    (
      newPage: number,
      newLimit: number,
      newSearch: string,
      newStatus?: string,
      options?: { resetCursor?: boolean }
    ) => {
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
      const s = newStatus !== undefined ? newStatus : status;
      if (s && s.trim() !== "") {
        params.set("status", s.trim());
      } else {
        params.delete("status");
      }
      if (options?.resetCursor) {
        params.delete("cursorCreatedAt");
        params.delete("cursorId");
      }
      router.push(`/dashboard/bookings?${params.toString()}`);
    },
    [router, searchParams, status]
  );

  React.useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearchParams(1, limit, debouncedSearch, status, {
        resetCursor: true,
      });
    }
  }, [debouncedSearch, search, limit, status, updateSearchParams]);

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

  const { bookings, isLoading, pagination, mutate } = useBookings({
    search,
    page,
    limit,
    status: statusForFetch,
    cursorCreatedAt,
    cursorId,
    fallbackData: initialData,
  });

  const handleStatusFilterChange = React.useCallback(
    (value: string) => {
      const nextStatus = value === "all" ? "" : value;
      updateSearchParams(1, limit, search, nextStatus, { resetCursor: true });
    },
    [limit, search, updateSearchParams]
  );

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
    async (id: string) => {
      try {
        await cancelBookingAction(id);
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
    async (bookingCode: string) => {
      await confirmBookingEmailAction(bookingCode);
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
    async (id: string) => {
      await cancelBookingAction(id);
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
        roomNumberById ? { roomNumberById } : undefined
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
    ]
  );

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-start sm:justify-between lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý đặt phòng</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi các đặt phòng trong khách sạn
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setIsCheckAvailableRoomsDialogOpen(true)}
            className="gap-2"
          >
            <IconSearch className="size-4" />
            Kiểm tra
          </Button>
          <div className="flex items-center gap-2">
            <Select value={statusFilterValue} onValueChange={handleStatusFilterChange}>
              <SelectTrigger
                id="booking-status-filter"
                className="h-9 w-[min(100%,220px)] min-w-[160px] sm:w-[200px]"
              >
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
          <Button onClick={handleCreateMultiBooking} className="gap-2">
            <IconPlus className="size-4" />
            Đặt nhiều phòng
          </Button>
          {/* <Button onClick={handleCreateBooking} className="gap-2">
            <IconPlus className="size-4" />
            Tạo booking mới
          </Button> */}
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
          serverPagination={pagination}
          onPageChange={(newPage) =>
            updateSearchParams(newPage, limit, search, status, {
              resetCursor: true,
            })
          }
          onLimitChange={(newLimit) =>
            updateSearchParams(1, newLimit, search, status, {
              resetCursor: true,
            })
          }
          serverSearch={localSearch}
          onSearchChange={setLocalSearch}
          initialColumnVisibility={{
            [COLUMNS.NUMBER_OF_NIGHTS.accessorKey]: false,
            [COLUMNS.TOTAL_GUESTS.accessorKey]: false,
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
