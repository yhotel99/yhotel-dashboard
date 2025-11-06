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

// User data type
type User = {
  id: string
  name: string
  email: string
  phone: string
  role: "admin" | "manager" | "staff" | "receptionist"
  status: "active" | "inactive" | "suspended"
  createdAt: string
  lastLogin: string
}

// Sample data
const usersData: User[] = [
  {
    id: "1",
    name: "Nguyễn Văn Admin",
    email: "admin@yhotel.com",
    phone: "0901234567",
    role: "admin",
    status: "active",
    createdAt: "2024-01-01",
    lastLogin: "2024-01-25",
  },
  {
    id: "2",
    name: "Trần Thị Quản lý",
    email: "manager@yhotel.com",
    phone: "0902345678",
    role: "manager",
    status: "active",
    createdAt: "2024-01-02",
    lastLogin: "2024-01-24",
  },
  {
    id: "3",
    name: "Lê Văn Lễ tân",
    email: "receptionist1@yhotel.com",
    phone: "0903456789",
    role: "receptionist",
    status: "active",
    createdAt: "2024-01-03",
    lastLogin: "2024-01-25",
  },
  {
    id: "4",
    name: "Phạm Thị Nhân viên",
    email: "staff1@yhotel.com",
    phone: "0904567890",
    role: "staff",
    status: "active",
    createdAt: "2024-01-04",
    lastLogin: "2024-01-23",
  },
  {
    id: "5",
    name: "Hoàng Văn Nhân viên 2",
    email: "staff2@yhotel.com",
    phone: "0905678901",
    role: "staff",
    status: "inactive",
    createdAt: "2024-01-05",
    lastLogin: "2024-01-20",
  },
  {
    id: "6",
    name: "Vũ Thị Lễ tân 2",
    email: "receptionist2@yhotel.com",
    phone: "0906789012",
    role: "receptionist",
    status: "active",
    createdAt: "2024-01-06",
    lastLogin: "2024-01-25",
  },
  {
    id: "7",
    name: "Đặng Văn Quản lý 2",
    email: "manager2@yhotel.com",
    phone: "0907890123",
    role: "manager",
    status: "active",
    createdAt: "2024-01-07",
    lastLogin: "2024-01-24",
  },
  {
    id: "8",
    name: "Bùi Thị Nhân viên 3",
    email: "staff3@yhotel.com",
    phone: "0908901234",
    role: "staff",
    status: "suspended",
    createdAt: "2024-01-08",
    lastLogin: "2024-01-15",
  },
  {
    id: "9",
    name: "Đỗ Văn Lễ tân 3",
    email: "receptionist3@yhotel.com",
    phone: "0909012345",
    role: "receptionist",
    status: "active",
    createdAt: "2024-01-09",
    lastLogin: "2024-01-25",
  },
  {
    id: "10",
    name: "Ngô Thị Nhân viên 4",
    email: "staff4@yhotel.com",
    phone: "0900123456",
    role: "staff",
    status: "active",
    createdAt: "2024-01-10",
    lastLogin: "2024-01-22",
  },
  {
    id: "11",
    name: "Dương Văn Admin 2",
    email: "admin2@yhotel.com",
    phone: "0911234567",
    role: "admin",
    status: "active",
    createdAt: "2024-01-11",
    lastLogin: "2024-01-25",
  },
  {
    id: "12",
    name: "Phan Thị Nhân viên 5",
    email: "staff5@yhotel.com",
    phone: "0912345678",
    role: "staff",
    status: "inactive",
    createdAt: "2024-01-12",
    lastLogin: "2024-01-18",
  },
  {
    id: "13",
    name: "Võ Văn Quản lý 3",
    email: "manager3@yhotel.com",
    phone: "0913456789",
    role: "manager",
    status: "active",
    createdAt: "2024-01-13",
    lastLogin: "2024-01-24",
  },
  {
    id: "14",
    name: "Lý Thị Lễ tân 4",
    email: "receptionist4@yhotel.com",
    phone: "0914567890",
    role: "receptionist",
    status: "active",
    createdAt: "2024-01-14",
    lastLogin: "2024-01-25",
  },
  {
    id: "15",
    name: "Cao Văn Nhân viên 6",
    email: "staff6@yhotel.com",
    phone: "0915678901",
    role: "staff",
    status: "active",
    createdAt: "2024-01-15",
    lastLogin: "2024-01-21",
  },
  {
    id: "16",
    name: "Tăng Thị Nhân viên 7",
    email: "staff7@yhotel.com",
    phone: "0916789012",
    role: "staff",
    status: "active",
    createdAt: "2024-01-16",
    lastLogin: "2024-01-23",
  },
  {
    id: "17",
    name: "Trịnh Văn Lễ tân 5",
    email: "receptionist5@yhotel.com",
    phone: "0917890123",
    role: "receptionist",
    status: "suspended",
    createdAt: "2024-01-17",
    lastLogin: "2024-01-10",
  },
  {
    id: "18",
    name: "Lương Thị Nhân viên 8",
    email: "staff8@yhotel.com",
    phone: "0918901234",
    role: "staff",
    status: "active",
    createdAt: "2024-01-18",
    lastLogin: "2024-01-24",
  },
  {
    id: "19",
    name: "Mai Văn Quản lý 4",
    email: "manager4@yhotel.com",
    phone: "0919012345",
    role: "manager",
    status: "active",
    createdAt: "2024-01-19",
    lastLogin: "2024-01-25",
  },
  {
    id: "20",
    name: "Hồ Thị Nhân viên 9",
    email: "staff9@yhotel.com",
    phone: "0920123456",
    role: "staff",
    status: "inactive",
    createdAt: "2024-01-20",
    lastLogin: "2024-01-19",
  },
]

// Role badge component
const RoleBadge = ({ role }: { role: User["role"] }) => {
  const roleConfig = {
    admin: { label: "Quản trị viên", variant: "default" as const },
    manager: { label: "Quản lý", variant: "secondary" as const },
    staff: { label: "Nhân viên", variant: "outline" as const },
    receptionist: { label: "Lễ tân", variant: "outline" as const },
  }

  const config = roleConfig[role]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// Status badge component
const StatusBadge = ({ status }: { status: User["status"] }) => {
  const statusConfig = {
    active: { label: "Hoạt động", variant: "default" as const },
    inactive: { label: "Không hoạt động", variant: "secondary" as const },
    suspended: { label: "Đã khóa", variant: "outline" as const },
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
const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Tên",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Số điện thoại",
  },
  {
    accessorKey: "role",
    header: "Vai trò",
    cell: ({ row }) => <RoleBadge role={row.original.role} />,
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "createdAt",
    header: "Ngày tạo",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: "lastLogin",
    header: "Đăng nhập lần cuối",
    cell: ({ row }) => formatDate(row.original.lastLogin),
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
          <DropdownMenuItem>Đổi mật khẩu</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Khóa tài khoản</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

export default function UsersPage() {
  const [data] = React.useState<User[]>(usersData)

  const handleCreateUser = () => {
    // Handle create user action
    console.log("Create user clicked")
    // You can add a dialog/modal here for creating a new user
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi người dùng trong hệ thống
          </p>
        </div>
        <Button onClick={handleCreateUser} className="gap-2">
          <IconPlus className="size-4" />
          Tạo người dùng mới
        </Button>
      </div>

      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={data}
          searchKey="name"
          searchPlaceholder="Tìm kiếm theo tên, email, số điện thoại..."
          emptyMessage="Không tìm thấy kết quả."
          entityName="người dùng"
          getRowId={(row) => row.id}
        />
      </div>
    </div>
  )
}

