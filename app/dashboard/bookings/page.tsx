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
import { StatusSelect } from "@/components/bookings/status";
import { BookingActionsCell } from "@/components/bookings/actions-cell";
import { CreateBookingDialog } from "@/components/bookings/create-booking-dialog";
import { EditBookingDialog } from "@/components/bookings/edit-booking-dialog";
import { formatDate } from "@/lib/utils";

// Status badge component
// status components moved to components/bookings/status

// actions cell moved to components/bookings/actions-cell

const createColumns = (
  onChangeStatus: (id: string, status: BookingStatus) => Promise<void>,
  onCancelBooking: (id: string) => Promise<void>,
  onEdit: (booking: BookingRecord) => void
): ColumnDef<BookingRecord>[] => [
  {
    accessorKey: "customer_id",
    header: "Khách hàng",
    cell: ({ row }) => row.original.customers?.full_name ?? "-",
  },
  {
    accessorKey: "room_id",
    header: "Phòng",
    cell: ({ row }) => row.original.rooms?.name ?? "-",
  },
  {
    accessorKey: "check_in",
    header: "Check-in",
    cell: ({ row }) => formatDate(row.original.check_in),
  },
  {
    accessorKey: "check_out",
    header: "Check-out",
    cell: ({ row }) => formatDate(row.original.check_out),
  },
  {
    accessorKey: "number_of_nights",
    header: "Số đêm",
    cell: ({ row }) => `${row.original.number_of_nights} đêm`,
  },
  {
    accessorKey: "total_guests",
    header: "Số khách",
    cell: ({ row }) => `${row.original.total_guests} người`,
  },
  {
    accessorKey: "total_amount",
    header: "Tổng tiền",
    cell: ({ row }) =>
      new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(row.original.total_amount),
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => (
      <StatusSelect
        bookingId={row.original.id}
        currentStatus={row.original.status}
        onChangeStatus={onChangeStatus}
      />
    ),
  },
  {
    accessorKey: "notes",
    header: "Ghi chú",
    cell: ({ row }) => row.original.notes ?? "-",
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <BookingActionsCell
        booking={row.original}
        customerId={row.original.customer_id}
        onEdit={onEdit}
        onCancelBooking={onCancelBooking}
      />
    ),
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
    moveToAwaitingPayment,
    confirmBooking,
    checkInBooking,
    checkoutBooking,
    completeBooking,
    cancelBooking,
    markNoShow,
    refundBooking,
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

        // Translate error messages
        let message = rawMessage;

        if (
          rawMessage.includes(
            'conflicting key value violates exclusion constraint "bookings_no_overlap"'
          ) ||
          rawMessage.includes(
            "Room is not available for the selected date/time"
          )
        ) {
          message =
            "Phòng không khả dụng cho khoảng thời gian đã chọn. Vui lòng chọn phòng hoặc thời gian khác.";
        } else if (
          rawMessage.includes("check_out must be later than check_in")
        ) {
          message = "Ngày check-out phải sau ngày check-in.";
        } else if (
          rawMessage.includes("number_of_nights must be greater than 0")
        ) {
          message = "Số đêm phải lớn hơn 0.";
        }

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
      } catch (error) {
        const rawMessage =
          error instanceof Error ? error.message : "Không thể tạo booking";

        // Translate error messages
        let message = rawMessage;

        if (
          rawMessage.includes(
            "Room is not available for the selected date/time"
          ) ||
          rawMessage.includes(
            'conflicting key value violates exclusion constraint "bookings_no_overlap"'
          )
        ) {
          message =
            "Phòng không khả dụng cho khoảng thời gian đã chọn. Vui lòng chọn phòng hoặc thời gian khác.";
        } else if (
          rawMessage.includes("check_out must be later than check_in")
        ) {
          message = "Ngày check-out phải sau ngày check-in.";
        } else if (
          rawMessage.includes("number_of_nights must be greater than 0")
        ) {
          message = "Số đêm phải lớn hơn 0.";
        }

        toast.error("Tạo booking thất bại", {
          description: message,
          position: "top-center",
        });
        throw error;
      }
    },
    [createBooking]
  );

  const handleChangeStatus = useCallback(
    async (id: string, status: BookingStatus) => {
      try {
        // Map status to appropriate function
        switch (status) {
          case "awaiting_payment":
            await moveToAwaitingPayment(id);
            break;
          case "confirmed":
            await confirmBooking(id);
            break;
          case "checked_in":
            await checkInBooking(id);
            break;
          case "checked_out":
            await checkoutBooking(id);
            break;
          case "completed":
            await completeBooking(id);
            break;
          case "cancelled":
            await cancelBooking(id);
            break;
          case "no_show":
            await markNoShow(id);
            break;
          case "refunded":
            await refundBooking(id);
            break;
          case "pending":
          default:
            // Fallback to updateBooking for pending or unknown status
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
    () => createColumns(handleChangeStatus, handleCancelBooking, handleEdit),
    [handleChangeStatus, handleCancelBooking, handleEdit]
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
