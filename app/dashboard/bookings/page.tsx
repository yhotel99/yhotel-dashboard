"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { IconDotsVertical, IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/data-table";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCustomers } from "@/hooks/use-customers";
import { rawBookingsData, type Booking, type BookingStatus } from "./data";

// Status badge component
const StatusBadge = ({ status }: { status: BookingStatus }) => {
  const statusStyle: Record<
    BookingStatus,
    { label: string; className: string }
  > = {
    pending: {
      label: "Chờ xác nhận",
      className: "text-amber-600 dark:text-amber-400",
    },
    awaiting_payment: {
      label: "Chờ thanh toán",
      className: "text-amber-700 dark:text-amber-300",
    },
    confirmed: {
      label: "Đã xác nhận",
      className: "text-blue-600 dark:text-blue-400",
    },
    checked_in: {
      label: "Đã check-in",
      className: "text-green-600 dark:text-green-400",
    },
    checked_out: {
      label: "Đã check-out",
      className: "text-emerald-600 dark:text-emerald-400",
    },
    completed: { label: "Hoàn tất", className: "text-primary" },
    cancelled: { label: "Đã hủy", className: "text-red-600 dark:text-red-400" },
    no_show: {
      label: "Không đến",
      className: "text-zinc-500 dark:text-zinc-400",
    },
    refunded: {
      label: "Đã hoàn tiền",
      className: "text-purple-600 dark:text-purple-400",
    },
  };
  const s = statusStyle[status];
  return <span className={cn(s.className)}>{s.label}</span>;
};

// Status select component for inline editing
function StatusSelect({
  bookingId,
  currentStatus,
}: {
  bookingId: string;
  currentStatus: BookingStatus;
}) {
  const updateStatus = React.useContext(UpdateBookingStatusContext);
  const statusConfig: Record<BookingStatus, string> = {
    pending: "Chờ xác nhận",
    awaiting_payment: "Chờ thanh toán",
    confirmed: "Đã xác nhận",
    checked_in: "Đã check-in",
    checked_out: "Đã check-out",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
    no_show: "Không đến",
    refunded: "Đã hoàn tiền",
  };

  return (
    <Select
      value={currentStatus}
      onValueChange={(value: BookingStatus) => {
        updateStatus(bookingId, value);
        toast.success("Đã cập nhật trạng thái thành công");
      }}
    >
      <SelectTrigger className="w-auto min-w-[140px] h-auto border-none shadow-none hover:bg-black/10 px-2 py-1 gap-1">
        <StatusBadge status={currentStatus} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusConfig).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Context to update booking status from action cells
const UpdateBookingStatusContext = React.createContext<
  (id: string, status: BookingStatus) => void
>(() => {});

function BookingActionsCell({
  bookingId,
  customerPhone,
  customerName,
  getCustomerByPhone,
}: {
  bookingId: string;
  customerPhone: string;
  customerName: string;
  getCustomerByPhone: (
    phone: string
  ) => Promise<import("@/lib/types").Customer | null>;
}) {
  const router = useRouter();
  const [openCancel, setOpenCancel] = React.useState(false);
  const updateStatus = React.useContext(UpdateBookingStatusContext);

  const handleViewDetails = async () => {
    const customer = await getCustomerByPhone(customerPhone);
    if (customer) {
      router.push(`/dashboard/customers/${customer.id}/bookings`);
    } else {
      toast.error("Không tìm thấy khách hàng từ SĐT này");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={() => router.push(`/dashboard/bookings/edit/${bookingId}`)}
          >
            Chỉnh sửa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleViewDetails}>
            Xem chi tiết
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setOpenCancel(true)}
          >
            Hủy booking
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={openCancel} onOpenChange={setOpenCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận hủy booking</DialogTitle>
            <DialogDescription>
              Thao tác này sẽ hủy booking này và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCancel(false)}>
              Bỏ qua
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                updateStatus(bookingId, "cancelled");
                toast.success("Đã hủy booking thành công");
                setOpenCancel(false);
              }}
            >
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Table columns factory
const createColumns = (
  getCustomerByPhone: (
    phone: string
  ) => Promise<import("@/lib/types").Customer | null>
): ColumnDef<Booking>[] => [
  {
    accessorKey: "bookingCode",
    header: "Mã booking",
  },
  {
    accessorKey: "customerName",
    header: "Khách hàng",
  },
  {
    accessorKey: "customerPhone",
    header: "Số điện thoại",
  },
  {
    accessorKey: "roomNumber",
    header: "Số phòng",
  },
  {
    accessorKey: "checkIn",
    header: "Check-in",
    cell: ({ row }) => formatDate(row.original.checkIn),
  },
  {
    accessorKey: "checkOut",
    header: "Check-out",
    cell: ({ row }) => formatDate(row.original.checkOut),
  },
  {
    accessorKey: "nights",
    header: "Số đêm",
    cell: ({ row }) => `${row.original.nights} đêm`,
  },
  {
    accessorKey: "guests",
    header: "Số khách",
    cell: ({ row }) => `${row.original.guests} người`,
  },
  {
    accessorKey: "totalAmount",
    header: "Tổng tiền",
    cell: ({ row }) => {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(row.original.totalAmount);
    },
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => (
      <StatusSelect
        bookingId={row.original.id}
        currentStatus={row.original.status}
      />
    ),
  },
  {
    accessorKey: "paymentMethod",
    header: "Thanh toán",
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <BookingActionsCell
        bookingId={row.original.id}
        customerPhone={row.original.customerPhone}
        customerName={row.original.customerName}
        getCustomerByPhone={getCustomerByPhone}
      />
    ),
  },
];

export default function BookingsPage() {
  const router = useRouter();
  const [data, setData] = React.useState<Booking[]>(rawBookingsData);
  const { getCustomerByPhone } = useCustomers();

  const handleCreateBooking = () => {
    router.push("/dashboard/bookings/create");
  };

  const updateBookingStatus = React.useCallback(
    (id: string, status: BookingStatus) => {
      setData((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    },
    []
  );

  const columns = React.useMemo(
    () => createColumns(getCustomerByPhone),
    [getCustomerByPhone]
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
        <UpdateBookingStatusContext.Provider value={updateBookingStatus}>
          <DataTable
            columns={columns}
            data={data}
            searchKey="bookingCode"
            searchPlaceholder="Tìm kiếm theo mã booking, tên khách hàng, số phòng..."
            emptyMessage="Không tìm thấy kết quả."
            entityName="booking"
            getRowId={(row) => row.id}
          />
        </UpdateBookingStatusContext.Provider>
      </div>
    </div>
  );
}
