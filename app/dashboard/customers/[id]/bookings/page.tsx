"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { IconArrowLeft } from "@tabler/icons-react"
import { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { getCustomerById } from "../../data"
import { getBookingsByCustomerPhone, type BookingStatus } from "@/app/dashboard/bookings/data"

// Types aligned with bookings data
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
  status: BookingStatus | string
  paymentMethod: string
  createdAt: string
 }

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const columns: ColumnDef<Booking>[] = [
  { accessorKey: "bookingCode", header: "Mã booking" },
  { accessorKey: "roomNumber", header: "Số phòng" },
  { accessorKey: "checkIn", header: "Check-in", cell: ({ row }) => formatDate(row.original.checkIn) },
  { accessorKey: "checkOut", header: "Check-out", cell: ({ row }) => formatDate(row.original.checkOut) },
  { accessorKey: "nights", header: "Số đêm", cell: ({ row }) => `${row.original.nights} đêm` },
  { accessorKey: "guests", header: "Số khách", cell: ({ row }) => `${row.original.guests} người` },
  { accessorKey: "totalAmount", header: "Tổng tiền", cell: ({ row }) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(row.original.totalAmount) },
  { accessorKey: "status", header: "Trạng thái", cell: ({ row }) => String(row.original.status) },
]

export default function CustomerBookingsPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const [data, setData] = React.useState<Booking[]>([])
  const [customerName, setCustomerName] = React.useState<string>("Khách hàng")
  const [phone, setPhone] = React.useState<string>("")

  React.useEffect(() => {
    const customer = getCustomerById(customerId)
    if (customer) {
      setCustomerName(customer.name)
      setPhone(customer.phone)
      setData(getBookingsByCustomerPhone(customer.phone))
    } else {
      setData([])
    }
  }, [customerId])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="h-10 w-10 cursor-pointer">
          <IconArrowLeft className="size-4" />
          <span className="sr-only">Quay lại</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Booking của {customerName}</h1>
          {phone ? <p className="text-muted-foreground text-sm">SĐT: {phone}</p> : null}
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={data}
          searchKey="bookingCode"
          searchPlaceholder="Tìm theo mã booking hoặc số phòng..."
          emptyMessage="Khách hàng chưa có booking."
          entityName="booking"
          getRowId={(row) => row.id}
        />
      </div>
    </div>
  )
}
