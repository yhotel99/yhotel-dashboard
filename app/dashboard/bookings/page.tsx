"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconPlus,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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
  status: "pending" | "confirmed" | "checked-in" | "checked-out" | "cancelled"
  paymentMethod: string
  createdAt: string
}

// Sample data
const bookingsData: Booking[] = [
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
const StatusBadge = ({ status }: { status: Booking["status"] }) => {
  const statusConfig = {
    pending: { label: "Chờ xác nhận", variant: "outline" as const },
    confirmed: { label: "Đã xác nhận", variant: "default" as const },
    "checked-in": { label: "Đã check-in", variant: "secondary" as const },
    "checked-out": { label: "Đã check-out", variant: "secondary" as const },
    cancelled: { label: "Đã hủy", variant: "outline" as const },
  }

  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
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
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "paymentMethod",
    header: "Thanh toán",
  },
  {
    id: "actions",
    cell: () => (
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
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
          <DropdownMenuItem>Chỉnh sửa</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Hủy booking</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

export default function BookingsPage() {
  const [data] = React.useState<Booking[]>(bookingsData)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const handleCreateBooking = () => {
    // Handle create booking action
    console.log("Create booking clicked")
    // You can add a dialog/modal here for creating a new booking
  }

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
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <Label htmlFor="search" className="sr-only">
              Tìm kiếm
            </Label>
            <Input
              id="search"
              placeholder="Tìm kiếm theo mã booking, tên khách hàng, số phòng..."
              value={
                (table.getColumn("bookingCode")?.getFilterValue() as string) ??
                ""
              }
              onChange={(event) =>
                table
                  .getColumn("bookingCode")
                  ?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Cột hiển thị
                <IconChevronDown className="ml-2 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Không tìm thấy kết quả.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4 mt-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            Hiển thị {table.getRowModel().rows.length} trong tổng số{" "}
            {table.getFilteredRowModel().rows.length} booking.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Số dòng mỗi trang
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Trang {table.getState().pagination.pageIndex + 1} trong tổng số{" "}
              {table.getPageCount()} trang
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Đi tới trang đầu</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Trang trước</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Trang sau</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Đi tới trang cuối</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

