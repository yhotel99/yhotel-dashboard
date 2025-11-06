"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { IconDotsVertical, IconPlus } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable } from "@/components/data-table"
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
import { cn } from "@/lib/utils"

// Booking status type per spec
export type BookingStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'refunded'

// normalize legacy/status values in sample data to BookingStatus
function normalizeStatus(status: string): BookingStatus {
  switch (status) {
    case 'checked-in':
      return 'checked_in'
    case 'checked-out':
      return 'checked_out'
    case 'awaiting_payment':
    case 'pending':
    case 'confirmed':
    case 'completed':
    case 'cancelled':
    case 'no_show':
    case 'refunded':
      return status as BookingStatus
    default:
      return 'pending'
  }
}

// Booking data type
type Booking = {
  id: string
  bookingCode: string
  customerName: string
  customerPhone: string
  roomNumber: string
  checkIn: string
  checkOut: string
  nights: number
  guests: number
  totalAmount: number
  status: BookingStatus
  paymentMethod: string
  createdAt: string
}

// Sample data
const rawBookingsData: Array<Omit<Booking, 'status'> & { status: string }> = [
  {
    id: "1",
    bookingCode: "BK001",
    customerName: "Nguyễn Văn A",
    customerPhone: "0901234567",
    roomNumber: "101",
    checkIn: "2024-01-15",
    checkOut: "2024-01-17",
    nights: 2,
    guests: 2,
    totalAmount: 1000000,
    status: "confirmed",
    paymentMethod: "Credit Card",
    createdAt: "2024-01-10",
  },
  {
    id: "2",
    bookingCode: "BK002",
    customerName: "Trần Thị B",
    customerPhone: "0902345678",
    roomNumber: "201",
    checkIn: "2024-01-16",
    checkOut: "2024-01-18",
    nights: 2,
    guests: 4,
    totalAmount: 2400000,
    status: "checked-in",
    paymentMethod: "Cash",
    createdAt: "2024-01-11",
  },
  {
    id: "3",
    bookingCode: "BK003",
    customerName: "Lê Văn C",
    customerPhone: "0903456789",
    roomNumber: "302",
    checkIn: "2024-01-20",
    checkOut: "2024-01-22",
    nights: 2,
    guests: 4,
    totalAmount: 2400000,
    status: "pending",
    paymentMethod: "Bank Transfer",
    createdAt: "2024-01-12",
  },
  {
    id: "4",
    bookingCode: "BK004",
    customerName: "Phạm Thị D",
    customerPhone: "0904567890",
    roomNumber: "402",
    checkIn: "2024-01-14",
    checkOut: "2024-01-15",
    nights: 1,
    guests: 2,
    totalAmount: 800000,
    status: "checked-out",
    paymentMethod: "Credit Card",
    createdAt: "2024-01-08",
  },
  {
    id: "5",
    bookingCode: "BK005",
    customerName: "Hoàng Văn E",
    customerPhone: "0905678901",
    roomNumber: "501",
    checkIn: "2024-01-18",
    checkOut: "2024-01-21",
    nights: 3,
    guests: 4,
    totalAmount: 3600000,
    status: "confirmed",
    paymentMethod: "Credit Card",
    createdAt: "2024-01-13",
  },
  {
    id: "6",
    bookingCode: "BK006",
    customerName: "Vũ Thị F",
    customerPhone: "0906789012",
    roomNumber: "601",
    checkIn: "2024-01-19",
    checkOut: "2024-01-20",
    nights: 1,
    guests: 2,
    totalAmount: 800000,
    status: "cancelled",
    paymentMethod: "Credit Card",
    createdAt: "2024-01-09",
  },
  {
    id: "7",
    bookingCode: "BK007",
    customerName: "Đặng Văn G",
    customerPhone: "0907890123",
    roomNumber: "102",
    checkIn: "2024-01-22",
    checkOut: "2024-01-25",
    nights: 3,
    guests: 2,
    totalAmount: 1500000,
    status: "confirmed",
    paymentMethod: "Cash",
    createdAt: "2024-01-14",
  },
  {
    id: "8",
    bookingCode: "BK008",
    customerName: "Bùi Thị H",
    customerPhone: "0908901234",
    roomNumber: "202",
    checkIn: "2024-01-17",
    checkOut: "2024-01-19",
    nights: 2,
    guests: 2,
    totalAmount: 1000000,
    status: "checked-in",
    paymentMethod: "Credit Card",
    createdAt: "2024-01-12",
  },
  {
    id: "9",
    bookingCode: "BK009",
    customerName: "Đỗ Văn I",
    customerPhone: "0909012345",
    roomNumber: "301",
    checkIn: "2024-01-23",
    checkOut: "2024-01-26",
    nights: 3,
    guests: 2,
    totalAmount: 2400000,
    status: "pending",
    paymentMethod: "Bank Transfer",
    createdAt: "2024-01-15",
  },
  {
    id: "10",
    bookingCode: "BK010",
    customerName: "Ngô Thị K",
    customerPhone: "0900123456",
    roomNumber: "401",
    checkIn: "2024-01-13",
    checkOut: "2024-01-14",
    nights: 1,
    guests: 2,
    totalAmount: 500000,
    status: "checked-out",
    paymentMethod: "Cash",
    createdAt: "2024-01-07",
  },
  {
    id: "11",
    bookingCode: "BK011",
    customerName: "Dương Văn L",
    customerPhone: "0911234567",
    roomNumber: "502",
    checkIn: "2024-01-24",
    checkOut: "2024-01-27",
    nights: 3,
    guests: 4,
    totalAmount: 3600000,
    status: "confirmed",
    paymentMethod: "Credit Card",
    createdAt: "2024-01-16",
  },
  {
    id: "12",
    bookingCode: "BK012",
    customerName: "Phan Thị M",
    customerPhone: "0912345678",
    roomNumber: "602",
    checkIn: "2024-01-21",
    checkOut: "2024-01-23",
    nights: 2,
    guests: 4,
    totalAmount: 2400000,
    status: "pending",
    paymentMethod: "Bank Transfer",
    createdAt: "2024-01-17",
  },
  {
    id: "13",
    bookingCode: "BK013",
    customerName: "Võ Văn N",
    customerPhone: "0913456789",
    roomNumber: "702",
    checkIn: "2024-01-25",
    checkOut: "2024-01-28",
    nights: 3,
    guests: 2,
    totalAmount: 2400000,
    status: "confirmed",
    paymentMethod: "Credit Card",
    createdAt: "2024-01-18",
  },
  {
    id: "14",
    bookingCode: "BK014",
    customerName: "Lý Thị O",
    customerPhone: "0914567890",
    roomNumber: "801",
    checkIn: "2024-01-26",
    checkOut: "2024-01-29",
    nights: 3,
    guests: 4,
    totalAmount: 3600000,
    status: "checked-in",
    paymentMethod: "Cash",
    createdAt: "2024-01-19",
  },
  {
    id: "15",
    bookingCode: "BK015",
    customerName: "Cao Văn P",
    customerPhone: "0915678901",
    roomNumber: "103",
    checkIn: "2024-01-27",
    checkOut: "2024-01-30",
    nights: 3,
    guests: 2,
    totalAmount: 1500000,
    status: "pending",
    paymentMethod: "Credit Card",
    createdAt: "2024-01-20",
  },
  {
    id: "16",
    bookingCode: "BK016",
    customerName: "Tăng Thị Q",
    customerPhone: "0916789012",
    roomNumber: "203",
    checkIn: "2024-01-28",
    checkOut: "2024-01-31",
    nights: 3,
    guests: 2,
    totalAmount: 1500000,
    status: "confirmed",
    paymentMethod: "Bank Transfer",
    createdAt: "2024-01-21",
  },
  {
    id: "17",
    bookingCode: "BK017",
    customerName: "Trịnh Văn R",
    customerPhone: "0917890123",
    roomNumber: "303",
    checkIn: "2024-01-29",
    checkOut: "2024-02-01",
    nights: 3,
    guests: 4,
    totalAmount: 3600000,
    status: "checked-out",
    paymentMethod: "Credit Card",
    createdAt: "2024-01-22",
  },
  {
    id: "18",
    bookingCode: "BK018",
    customerName: "Lương Thị S",
    customerPhone: "0918901234",
    roomNumber: "403",
    checkIn: "2024-01-30",
    checkOut: "2024-02-02",
    nights: 3,
    guests: 2,
    totalAmount: 2400000,
    status: "cancelled",
    paymentMethod: "Credit Card",
    createdAt: "2024-01-23",
  },
  {
    id: "19",
    bookingCode: "BK019",
    customerName: "Mai Văn T",
    customerPhone: "0919012345",
    roomNumber: "503",
    checkIn: "2024-01-31",
    checkOut: "2024-02-03",
    nights: 3,
    guests: 4,
    totalAmount: 3600000,
    status: "confirmed",
    paymentMethod: "Cash",
    createdAt: "2024-01-24",
  },
  {
    id: "20",
    bookingCode: "BK020",
    customerName: "Hồ Thị U",
    customerPhone: "0920123456",
    roomNumber: "603",
    checkIn: "2024-02-01",
    checkOut: "2024-02-04",
    nights: 3,
    guests: 2,
    totalAmount: 2400000,
    status: "pending",
    paymentMethod: "Credit Card",
    createdAt: "2024-01-25",
  },
]

// Status badge component
const StatusBadge = ({ status }: { status: BookingStatus }) => {
  const statusStyle: Record<BookingStatus, { label: string; className: string }> = {
    pending: { label: "Chờ xác nhận", className: "text-amber-600 dark:text-amber-400" },
    awaiting_payment: { label: "Chờ thanh toán", className: "text-amber-700 dark:text-amber-300" },
    confirmed: { label: "Đã xác nhận", className: "text-blue-600 dark:text-blue-400" },
    checked_in: { label: "Đã check-in", className: "text-green-600 dark:text-green-400" },
    checked_out: { label: "Đã check-out", className: "text-emerald-600 dark:text-emerald-400" },
    completed: { label: "Hoàn tất", className: "text-primary" },
    cancelled: { label: "Đã hủy", className: "text-red-600 dark:text-red-400" },
    no_show: { label: "Không đến", className: "text-zinc-500 dark:text-zinc-400" },
    refunded: { label: "Đã hoàn tiền", className: "text-purple-600 dark:text-purple-400" },
  }
  const s = statusStyle[status]
  return <span className={cn(s.className)}>{s.label}</span>
}

// Status select component for inline editing
function StatusSelect({ bookingId, currentStatus }: { bookingId: string; currentStatus: BookingStatus }) {
  const updateStatus = React.useContext(UpdateBookingStatusContext)
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
  }

  return (
    <Select
      value={currentStatus}
      onValueChange={(value: BookingStatus) => {
        updateStatus(bookingId, value)
        toast.success("Đã cập nhật trạng thái thành công")
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
  )
}

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// Context to update booking status from action cells
const UpdateBookingStatusContext = React.createContext<(id: string, status: BookingStatus) => void>(() => {})

function BookingActionsCell({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [openCancel, setOpenCancel] = React.useState(false);
  const updateStatus = React.useContext(UpdateBookingStatusContext)
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
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => router.push(`/dashboard/bookings/edit/${bookingId}`)}>
            Chỉnh sửa
          </DropdownMenuItem>
          <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setOpenCancel(true)}>
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
            <Button variant="outline" onClick={() => setOpenCancel(false)}>Bỏ qua</Button>
            <Button
              variant="destructive"
              onClick={() => {
                updateStatus(bookingId, 'cancelled')
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

// Table columns
const columns: ColumnDef<Booking>[] = [
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
      }).format(row.original.totalAmount)
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
    cell: ({ row }) => <BookingActionsCell bookingId={row.original.id} />,
  },
]

export default function BookingsPage() {
  const router = useRouter()
  const [data, setData] = React.useState<Booking[]>(rawBookingsData.map(b => ({ ...b, status: normalizeStatus(b.status) })))

  const handleCreateBooking = () => {
    router.push("/dashboard/bookings/create")
  }

  const updateBookingStatus = React.useCallback((id: string, status: BookingStatus) => {
    setData((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)))
  }, [])

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
  )
}

