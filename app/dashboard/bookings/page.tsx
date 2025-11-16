"use client";

import { useState, useCallback, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { toast } from "sonner";
import { usePaginationSearchParams } from "@/hooks/use-pagination-search-params";
import {
  useBookings,
  type BookingRecord,
  type BookingInput,
  type BookingStatus,
} from "@/hooks/use-bookings";
import { StatusBadge } from "@/components/bookings/status";
import { BookingActionsCell } from "@/components/bookings/actions-cell";
import { NotesCell } from "@/components/bookings/notes-cell";
import { CreateBookingDialog } from "@/components/bookings/create-booking-dialog";
import { EditBookingDialog } from "@/components/bookings/edit-booking-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  translateBookingErrorMessage,
  BOOKING_ERROR_PATTERNS,
  BOOKING_STATUS,
} from "@/lib/constants";

// Status badge component
// status components moved to components/bookings/status

// actions cell moved to components/bookings/actions-cell

const createColumns = (
  onCancelBooking: (id: string) => Promise<void>,
  onEdit: (booking: BookingRecord) => void,
  onChangeStatus: (id: string, status: BookingStatus) => Promise<void>
): ColumnDef<BookingRecord>[] => [
  {
    accessorKey: "customer_id",
    header: "Khách hàng",
    cell: ({ row }) => row.original.customers?.full_name ?? "-",
    size: 150,
    minSize: 120,
  },
  {
    accessorKey: "room_id",
    header: "Phòng",
    cell: ({ row }) => row.original.rooms?.name ?? "-",
    size: 80,
    minSize: 60,
  },
  {
    accessorKey: "check_in",
    header: "Check-in",
    cell: ({ row }) => formatDate(row.original.check_in),
    size: 150,
    minSize: 130,
  },
  {
    accessorKey: "check_out",
    header: "Check-out",
    cell: ({ row }) => formatDate(row.original.check_out),
    size: 150,
    minSize: 130,
  },
  {
    accessorKey: "number_of_nights",
    header: "Số đêm",
    cell: ({ row }) => `${row.original.number_of_nights} đêm`,
    size: 90,
    minSize: 70,
  },
  {
    accessorKey: "total_guests",
    header: "Số khách",
    cell: ({ row }) => `${row.original.total_guests} người`,
    size: 90,
    minSize: 70,
  },
  {
    accessorKey: "total_amount",
    header: "Tổng tiền",
    cell: ({ row }) => formatCurrency(row.original.total_amount),
    size: 120,
    minSize: 100,
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    size: 150,
    minSize: 130,
  },
  {
    accessorKey: "notes",
    header: "Ghi chú",
    cell: ({ row }) => <NotesCell notes={row.original.notes} />,
    size: 60,
    minSize: 40,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <BookingActionsCell
        booking={row.original}
        customerId={row.original.customer_id}
        onEdit={onEdit}
        onCancelBooking={onCancelBooking}
        onChangeStatus={onChangeStatus}
      />
    ),
    size: 60,
    minSize: 40,
  },
];

// Create dialog types/helpers are defined in components/bookings/create-booking-dialog

// CreateBookingDialog extracted to components/bookings/create-booking-dialog

export default function BookingsPage() {
  const {
    page,
    limit,
    search,
    localSearch,
    setLocalSearch,
    updateSearchParams,
  } = usePaginationSearchParams();

  const {
    bookings,
    isLoading,
    pagination,
    fetchBookings,
    createBooking,
    updateBooking,
    rollbackToPending,
    moveToAwaitingPayment,
    confirmBooking,
    checkInBooking,
    checkoutBooking,
    completeBooking,
    cancelBooking,
    markNoShow,
    refundBooking,
    findConflictingBooking,
  } = useBookings(page, limit, search);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(
    null
  );

  const handleOpenCreateDialog = () => {
    setIsCreateDialogOpen(true);
  };

  const handleEdit = useCallback((booking: BookingRecord) => {
    setSelectedBooking(booking);
    setIsEditDialogOpen(true);
  }, []);

  const handleUpdateBooking = useCallback(
    async (id: string, input: BookingInput) => {
      try {
        await updateBooking(id, input);

        toast.success("Cập nhật booking thành công!", {
          description: "Thông tin booking đã được cập nhật.",
        });
      } catch (error) {
        const rawMessage =
          error instanceof Error ? error.message : "Không thể cập nhật booking";

        const message = translateBookingErrorMessage(rawMessage);

        toast.error("Cập nhật booking thất bại", {
          description: message,
          position: "top-center",
        });
        throw error;
      }
    },
    [updateBooking]
  );

  const handleCreateBookingSubmit = useCallback(
    async (input: BookingInput) => {
      try {
        await createBooking(input);
        toast.success("Tạo booking thành công!", {
          description: "Booking mới đã được thêm vào hệ thống.",
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const rawMessage = error.message || "Không thể tạo booking";

        // Check if it's an overlap error
        const isOverlapError =
          rawMessage.includes(BOOKING_ERROR_PATTERNS.ROOM_NOT_AVAILABLE) ||
          rawMessage.includes(
            BOOKING_ERROR_PATTERNS.CONFLICT_EXCLUSION_CONSTRAINT
          ) ||
          rawMessage.includes(
            BOOKING_ERROR_PATTERNS.CONFLICT_EXCLUSION_CONSTRAINT_GENERAL
          );

        let conflictingBooking = null;
        if (isOverlapError && input.room_id && findConflictingBooking) {
          // Try to find conflicting booking
          conflictingBooking = await findConflictingBooking(
            input.room_id,
            input.check_in,
            input.check_out
          );
        }

        const message = translateBookingErrorMessage(
          rawMessage,
          conflictingBooking
        );

        toast.error("Tạo booking thất bại", {
          description: message,
          position: "top-center",
          duration: 15000,
        });
        throw err;
      }
    },
    [createBooking, findConflictingBooking]
  );

  const handleChangeStatus = useCallback(
    async (id: string, status: BookingStatus) => {
      try {
        // Map status to appropriate function
        switch (status) {
          case BOOKING_STATUS.AWAITING_PAYMENT:
            await moveToAwaitingPayment(id);
            break;
          case BOOKING_STATUS.CONFIRMED:
            await confirmBooking(id);
            break;
          case BOOKING_STATUS.CHECKED_IN:
            await checkInBooking(id);
            break;
          case BOOKING_STATUS.CHECKED_OUT:
            await checkoutBooking(id);
            break;
          case BOOKING_STATUS.COMPLETED:
            await completeBooking(id);
            break;
          case BOOKING_STATUS.CANCELLED:
            await cancelBooking(id);
            break;
          case BOOKING_STATUS.NO_SHOW:
            await markNoShow(id);
            break;
          case BOOKING_STATUS.REFUNDED:
            await refundBooking(id);
            break;
          case BOOKING_STATUS.PENDING:
            // Use rollbackToPending to handle payment logic when rolling back
            await rollbackToPending(id);
            break;
          default:
            // Fallback to updateBooking for unknown status
            await updateBooking(id, { status });
            break;
        }
        toast.success("Đã cập nhật trạng thái thành công");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Không thể cập nhật trạng thái";
        toast.error("Cập nhật trạng thái thất bại", { description: message });
      }
    },
    [
      rollbackToPending,
      moveToAwaitingPayment,
      confirmBooking,
      checkInBooking,
      checkoutBooking,
      completeBooking,
      cancelBooking,
      markNoShow,
      refundBooking,
      updateBooking,
    ]
  );

  const handleCancelBooking = useCallback(
    async (id: string) => {
      try {
        await cancelBooking(id);
        toast.success("Đã hủy booking thành công");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Không thể hủy booking";
        toast.error("Hủy booking thất bại", { description: message });
      }
    },
    [cancelBooking]
  );

  const columns = useMemo(
    () => createColumns(handleCancelBooking, handleEdit, handleChangeStatus),
    [handleCancelBooking, handleEdit, handleChangeStatus]
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
        <Button onClick={handleOpenCreateDialog} className="gap-2">
          <IconPlus className="size-4" />
          Tạo booking mới
        </Button>
      </div>

      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={bookings}
          searchKey="id"
          searchPlaceholder="Tìm kiếm theo mã, ghi chú..."
          emptyMessage="Không tìm thấy kết quả."
          entityName="booking"
          getRowId={(row) => row.id}
          fetchData={() => fetchBookings(page, limit, search)}
          isLoading={isLoading}
          serverPagination={pagination}
          onPageChange={(newPage) => updateSearchParams(newPage, limit, search)}
          onLimitChange={(newLimit) => updateSearchParams(1, newLimit, search)}
          serverSearch={localSearch}
          onSearchChange={setLocalSearch}
        />
      </div>

      <CreateBookingDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreate={handleCreateBookingSubmit}
      />

      <EditBookingDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setSelectedBooking(null);
          }
        }}
        booking={selectedBooking}
        onUpdate={handleUpdateBooking}
      />
    </div>
  );
}
