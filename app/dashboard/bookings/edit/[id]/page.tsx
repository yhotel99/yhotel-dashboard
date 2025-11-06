"use client"

import { useRouter, useParams } from "next/navigation"
import { IconArrowLeft } from "@tabler/icons-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { BookingForm, BookingFormValues } from "@/components/booking-form"
import { getBookingById } from "../../data"

export default function EditBookingPage() {
  const router = useRouter()
  const params = useParams()
  const bookingId = params.id as string
  const [booking, setBooking] = useState<ReturnType<typeof getBookingById>>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    const fetchBooking = async () => {
      setLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 500))
      const bookingData = getBookingById(bookingId)
      setBooking(bookingData || undefined)
      setLoading(false)
    }
    if (bookingId) fetchBooking()
  }, [bookingId])

  const defaultValues: Partial<BookingFormValues> | undefined = booking
    ? {
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        roomNumber: booking.roomNumber,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests.toString(),
        status: booking.status,
        paymentMethod: booking.paymentMethod,
        totalAmount: booking.totalAmount.toString(),
      }
    : undefined

  if (loading) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4 px-4 lg:px-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 cursor-pointer"
          >
            <IconArrowLeft className="size-4" />
            <span className="sr-only">Quay lại</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Chỉnh sửa booking</h1>
            <p className="text-muted-foreground text-sm">Đang tải...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4 px-4 lg:px-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 cursor-pointer"
          >
            <IconArrowLeft className="size-4" />
            <span className="sr-only">Quay lại</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Không tìm thấy booking</h1>
            <p className="text-muted-foreground text-sm">
              Booking không tồn tại hoặc đã bị xóa
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="h-10 w-10 cursor-pointer"
        >
          <IconArrowLeft className="size-4" />
          <span className="sr-only">Quay lại</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Chỉnh sửa booking</h1>
          <p className="text-muted-foreground text-sm">
            Cập nhật thông tin booking cho {booking.customerName}
          </p>
        </div>
      </div>
      <div className="px-4 lg:px-6">
        <BookingForm
          mode="edit"
          bookingId={bookingId}
          defaultValues={defaultValues}
        />
      </div>
    </div>
  )
}
