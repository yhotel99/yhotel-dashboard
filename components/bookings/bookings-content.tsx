"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconPlus, IconSearch } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useBookings } from "@/hooks/use-bookings";
import {
  createBooking as createBookingAction,
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
  BookingRecord,
  UpdateBookingInput,
  TransferBookingInput,
  BookingsResponse,
} from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { createColumns, COLUMNS } from "@/components/bookings/columns";
import { CreateBookingDialog } from "@/components/bookings/create-booking-dialog";
import { EditBookingDialog } from "@/components/bookings/edit-booking-dialog";
import { CheckAvailableRoomsDialog } from "@/components/bookings/check-available-rooms-dialog";
import { translateBookingError } from "@/lib/functions";
import { toast } from "sonner";

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

  // Debounce search
  const debouncedSearch = useDebounce(localSearch, 500);

  // Update search params
  const updateSearchParams = React.useCallback(
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
      router.push(`/dashboard/bookings?${params.toString()}`);
    },
    [router, searchParams]
  );

  React.useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearchParams(1, limit, debouncedSearch);
    }
  }, [debouncedSearch, search, limit, updateSearchParams]);

  const { bookings, isLoading, pagination, mutate } = useBookings({
    search,
    page,
    limit,
    fallbackData: initialData,
  });

  // Use checkAdvancePaymentStatusAction and markAdvancePaymentAsPaidAction from actions

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingBookingId, setEditingBookingId] = React.useState<string | null>(
    null
  );
  const [editingBooking, setEditingBooking] =
    React.useState<BookingRecord | null>(null);

  const handleCreateBooking = () => {
    setIsCreateDialogOpen(true);
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
            onClick: () => {},
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
      createColumns(handleUpdateStatus, {
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
      }),
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
    ]
  );

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý đặt phòng</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi các đặt phòng trong khách sạn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCheckAvailableRoomsDialogOpen(true)}
            className="gap-2"
          >
            <IconSearch className="size-4" />
            Kiểm tra
          </Button>
          <Button onClick={handleCreateBooking} className="gap-2">
            <IconPlus className="size-4" />
            Tạo booking mới
          </Button>
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
          onPageChange={(newPage) => updateSearchParams(newPage, limit, search)}
          onLimitChange={(newLimit) => updateSearchParams(1, newLimit, search)}
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
