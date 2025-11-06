"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import { roomsData, type Room } from "./data"

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

// Actions cell component
function ActionsCell({ roomId }: { roomId: string }) {
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
        <DropdownMenuItem
          onClick={() => router.push(`/dashboard/rooms/edit/${roomId}`)}
        >
          Chỉnh sửa
        </DropdownMenuItem>
        <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Xóa</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
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
    cell: ({ row }) => <ActionsCell roomId={row.original.id} />,
  },
]

export default function RoomsPage() {
  const router = useRouter()
  const [data] = React.useState<Room[]>(roomsData)

  const handleCreateRoom = () => {
    router.push("/dashboard/rooms/create")
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
        <DataTable
          columns={columns}
          data={data}
          searchKey="number"
          searchPlaceholder="Tìm kiếm theo số phòng, loại phòng..."
          emptyMessage="Không tìm thấy kết quả."
          entityName="phòng"
          getRowId={(row) => row.id}
        />
      </div>
    </div>
  )
}

