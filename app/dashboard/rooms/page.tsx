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

// Room data type
type Room = {
  id: string
  number: string
  type: string
  status: "available" | "occupied" | "maintenance"
  price: number
  floor: number
  capacity: number
  amenities: string[]
}

// Sample data
const roomsData: Room[] = [
  {
    id: "1",
    number: "101",
    type: "Standard",
    status: "available",
    price: 500000,
    floor: 1,
    capacity: 2,
    amenities: ["WiFi", "TV"],
  },
  {
    id: "2",
    number: "102",
    type: "Deluxe",
    status: "occupied",
    price: 800000,
    floor: 1,
    capacity: 2,
    amenities: ["WiFi", "TV", "Mini Bar"],
  },
  {
    id: "3",
    number: "201",
    type: "Suite",
    status: "available",
    price: 1200000,
    floor: 2,
    capacity: 4,
    amenities: ["WiFi", "TV", "Mini Bar", "Balcony"],
  },
  {
    id: "4",
    number: "202",
    type: "Standard",
    status: "maintenance",
    price: 500000,
    floor: 2,
    capacity: 2,
    amenities: ["WiFi", "TV"],
  },
  {
    id: "5",
    number: "301",
    type: "Deluxe",
    status: "available",
    price: 800000,
    floor: 3,
    capacity: 2,
    amenities: ["WiFi", "TV", "Mini Bar"],
  },
  {
    id: "6",
    number: "302",
    type: "Suite",
    status: "occupied",
    price: 1200000,
    floor: 3,
    capacity: 4,
    amenities: ["WiFi", "TV", "Mini Bar", "Balcony"],
  },
  {
    id: "7",
    number: "401",
    type: "Standard",
    status: "available",
    price: 500000,
    floor: 4,
    capacity: 2,
    amenities: ["WiFi", "TV"],
  },
  {
    id: "8",
    number: "402",
    type: "Deluxe",
    status: "available",
    price: 800000,
    floor: 4,
    capacity: 2,
    amenities: ["WiFi", "TV", "Mini Bar"],
  },
  {
    id: "9",
    number: "501",
    type: "Suite",
    status: "occupied",
    price: 1200000,
    floor: 5,
    capacity: 4,
    amenities: ["WiFi", "TV", "Mini Bar", "Balcony"],
  },
  {
    id: "10",
    number: "502",
    type: "Standard",
    status: "available",
    price: 500000,
    floor: 5,
    capacity: 2,
    amenities: ["WiFi", "TV"],
  },
  {
    id: "11",
    number: "601",
    type: "Deluxe",
    status: "maintenance",
    price: 800000,
    floor: 6,
    capacity: 2,
    amenities: ["WiFi", "TV", "Mini Bar"],
  },
  {
    id: "12",
    number: "602",
    type: "Suite",
    status: "available",
    price: 1200000,
    floor: 6,
    capacity: 4,
    amenities: ["WiFi", "TV", "Mini Bar", "Balcony"],
  },
  {
    id: "13",
    number: "701",
    type: "Standard",
    status: "occupied",
    price: 500000,
    floor: 7,
    capacity: 2,
    amenities: ["WiFi", "TV"],
  },
  {
    id: "14",
    number: "702",
    type: "Deluxe",
    status: "available",
    price: 800000,
    floor: 7,
    capacity: 2,
    amenities: ["WiFi", "TV", "Mini Bar"],
  },
  {
    id: "15",
    number: "801",
    type: "Suite",
    status: "available",
    price: 1200000,
    floor: 8,
    capacity: 4,
    amenities: ["WiFi", "TV", "Mini Bar", "Balcony"],
  },
]

// Status badge component
const StatusBadge = ({ status }: { status: Room["status"] }) => {
  const statusConfig = {
    available: { label: "Có sẵn", variant: "default" as const },
    occupied: { label: "Đã đặt", variant: "secondary" as const },
    maintenance: { label: "Bảo trì", variant: "outline" as const },
  }

  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// Table columns
const columns: ColumnDef<Room>[] = [
  {
    accessorKey: "number",
    header: "Số phòng",
  },
  {
    accessorKey: "type",
    header: "Loại phòng",
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "price",
    header: "Giá (VNĐ)",
    cell: ({ row }) => {
      return new Intl.NumberFormat("vi-VN").format(row.original.price)
    },
  },
  {
    accessorKey: "floor",
    header: "Tầng",
  },
  {
    accessorKey: "capacity",
    header: "Sức chứa",
    cell: ({ row }) => `${row.original.capacity} người`,
  },
  {
    accessorKey: "amenities",
    header: "Tiện ích",
    cell: ({ row }) => {
      return (
        <div className="flex gap-1 flex-wrap">
          {row.original.amenities.map((amenity, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {amenity}
            </Badge>
          ))}
        </div>
      )
    },
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
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Make a copy</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

export default function RoomsPage() {
  const [data] = React.useState<Room[]>(roomsData)
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

  const handleCreateRoom = () => {
    // Handle create room action
    console.log("Create room clicked")
    // You can add a dialog/modal here for creating a new room
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý phòng</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi thông tin các phòng trong khách sạn
          </p>
        </div>
        <Button onClick={handleCreateRoom} className="gap-2">
          <IconPlus className="size-4" />
          Tạo phòng mới
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
              placeholder="Tìm kiếm theo số phòng, loại phòng..."
              value={
                (table.getColumn("number")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn("number")?.setFilterValue(event.target.value)
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
            {table.getFilteredRowModel().rows.length} phòng.
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

