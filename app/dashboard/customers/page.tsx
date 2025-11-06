"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { IconDotsVertical, IconPlus } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable } from "@/components/data-table"
import { useRouter } from "next/navigation"

// Customer data type
type Customer = {
  id: string
  name: string
  phone: string
  email: string
  totalBookings: number
  totalSpent: number
  createdAt: string
  status: "active" | "banned"
}

// Sample data
const customersData: Customer[] = [
  {
    id: "1",
    name: "Nguyễn Văn A",
    phone: "0901234567",
    email: "a@example.com",
    totalBookings: 5,
    totalSpent: 6000000,
    createdAt: "2023-10-10",
    status: "active",
  },
  {
    id: "2",
    name: "Trần Thị B",
    phone: "0902345678",
    email: "b@example.com",
    totalBookings: 2,
    totalSpent: 2000000,
    createdAt: "2023-11-15",
    status: "active",
  },
  {
    id: "3",
    name: "Phạm Văn C",
    phone: "0903456789",
    email: "c@example.com",
    totalBookings: 7,
    totalSpent: 9000000,
    createdAt: "2023-12-01",
    status: "banned",
  },
  {
    id: "4",
    name: "Lê Thị D",
    phone: "0904567890",
    email: "d@example.com",
    totalBookings: 1,
    totalSpent: 1000000,
    createdAt: "2024-01-05",
    status: "active",
  },
]

// Status badge
function StatusBadge({ status }: { status: Customer["status"] }) {
  return status === "active" ? (
    <Badge variant="outline" className="border-green-500 text-green-600">Đang hoạt động</Badge>
  ) : (
    <Badge variant="destructive">Đã khóa</Badge>
  )
}

// Actions
function ActionsCell({ customerId }: { customerId: string }) {
  const router = useRouter()
  return (
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
        <DropdownMenuItem onClick={() => router.push(`/dashboard/customers/edit/${customerId}`)}>Chỉnh sửa</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Khóa khách hàng</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Columns
const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: "name",
    header: "Họ tên",
    enableHiding: false,
  },
  {
    accessorKey: "phone",
    header: "SĐT",
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-blue-700 underline cursor-pointer">{row.original.email}</span>
    )
  },
  {
    accessorKey: "totalBookings",
    header: "Số đơn",
    cell: ({ row }) => (
      <span>{row.original.totalBookings} lần</span>
    ),
  },
  {
    accessorKey: "totalSpent",
    header: "Tổng chi tiêu",
    cell: ({ row }) => (
      <span>{row.original.totalSpent.toLocaleString("vi-VN") + " ₫"}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Ngày đăng ký",
    cell: ({ row }) => (
      <span>{row.original.createdAt}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell customerId={row.original.id} />,
  },
]

export default function CustomersPage() {
  const router = useRouter()
  const [data] = React.useState<Customer[]>(customersData)
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý khách hàng</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi thông tin khách hàng sử dụng hệ thống
          </p>
        </div>
        <Button className="gap-2" onClick={() => router.push("/dashboard/customers/create") }>
          <IconPlus className="size-4" />
          Thêm khách hàng
        </Button>
      </div>
      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={data}
          searchKey="name"
          searchPlaceholder="Tìm kiếm theo tên, SĐT hoặc email..."
          emptyMessage="Không tìm thấy khách hàng nào."
          entityName="khách hàng"
          getRowId={(row) => row.id}
        />
      </div>
    </div>
  )
}
