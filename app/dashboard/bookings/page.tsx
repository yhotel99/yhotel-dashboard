"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useBookings } from "@/hooks/use-bookings";
import { usePayments } from "@/hooks/use-payments";
import type { BookingStatus, BookingInput, BookingRecord } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { createColumns } from "@/components/bookings/columns";
import { CreateBookingDialog } from "@/components/bookings/create-booking-dialog";
import { EditBookingDialog } from "@/components/bookings/edit-booking-dialog";
import { toast } from "sonner";

export default function BookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = React.useState("");

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

  // Sync local search with URL search
  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

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

  const {
    bookings,
    isLoading,
    pagination,
    fetchBookings,
    updateBookingStatus,
    pendingBooking,
    confirmedBooking,
    checkedInBooking,
    checkedOutBooking,
    cancelledBooking,
    createBooking,
    updateBooking,
    transferBooking,
  } = useBookings({ page, limit, search });

  const { checkAdvancePaymentStatus, markAdvancePaymentAsPaid } = usePayments();

  // Fetch bookings when component mounts or params change
  React.useEffect(() => {
    fetchBookings(page, limit, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search]);

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
      await createBooking(input);
      toast.success("Đã tạo booking thành công");
      await fetchBookings();
    },
    [createBooking, fetchBookings]
  );

  const handleEdit = React.useCallback(async (booking: BookingRecord) => {
    setEditingBookingId(booking.id);
    setEditingBooking(booking);
    setIsEditDialogOpen(true);
  }, []);

  const handleTransfer = React.useCallback(
    async (id: string, input: BookingInput) => {
      try {
        await transferBooking(id, input);
        toast.success("Đã chuyển phòng thành công");
        await fetchBookings();
      } catch (error) {
        console.error(error);
        toast.error("Không thể chuyển phòng");
      }
    },
    [transferBooking, fetchBookings]
  );

  const handleCancelBooking = React.useCallback(
    async (id: string) => {
      try {
        await cancelledBooking(id);
        toast.success("Đã hủy booking thành công");
        await fetchBookings();
      } catch {
        toast.error("Không thể hủy booking");
      }
    },
    [cancelledBooking, fetchBookings]
  );

  const handleUpdate = React.useCallback(
    async (id: string, input: BookingInput) => {
      await updateBooking(id, input);
      toast.success("Đã cập nhật booking thành công");
      await fetchBookings();
    },
    [updateBooking, fetchBookings]
  );

  const handleUpdateStatus = React.useCallback(
    async (id: string, status: BookingStatus) => {
      await updateBookingStatus(id, status);
      await fetchBookings();
    },
    [updateBookingStatus, fetchBookings]
  );

  const handleMarkAdvancePayment = React.useCallback(
    async (bookingId: string) => {
      try {
        await markAdvancePaymentAsPaid(bookingId);
        toast.success("Đã đánh dấu đặt cọc thành công");
        await fetchBookings();
      } catch (error) {
        toast.error("Không thể đánh dấu đặt cọc");
        throw error;
      }
    },
    [markAdvancePaymentAsPaid, fetchBookings]
  );

  const columns = React.useMemo(
    () =>
      createColumns(handleUpdateStatus, {
        onEdit: handleEdit,
        onTransfer: handleTransfer,
        onCancelBooking: handleCancelBooking,
        onMarkAdvancePayment: handleMarkAdvancePayment,
        checkAdvancePaymentStatus,
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
      handleCancelBooking,
      handleMarkAdvancePayment,
      checkAdvancePaymentStatus,
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
        <Button onClick={handleCreateBooking} className="gap-2">
          <IconPlus className="size-4" />
          Tạo booking mới
        </Button>
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
          fetchData={() => fetchBookings()}
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
        onCreate={handleCreate}
      />

      {editingBookingId && (
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
    </div>
  );
}
