"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

// Form validation schema
export const bookingFormSchema = z.object({
  customerName: z.string().min(1, "Tên khách hàng là bắt buộc"),
  customerPhone: z
    .string()
    .min(1, "Số điện thoại là bắt buộc")
    .regex(/^[0-9]{10,11}$/, "Số điện thoại không hợp lệ"),
  roomNumber: z.string().min(1, "Số phòng là bắt buộc"),
  checkIn: z.string().min(1, "Ngày check-in là bắt buộc"),
  checkOut: z.string().min(1, "Ngày check-out là bắt buộc"),
  guests: z
    .string()
    .min(1, "Số khách là bắt buộc")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1, {
      message: "Số khách phải là số và lớn hơn hoặc bằng 1",
    }),
  status: z.enum(["pending", "confirmed", "checked-in", "checked-out", "cancelled"]),
  paymentMethod: z.string().min(1, "Phương thức thanh toán là bắt buộc"),
  totalAmount: z
    .string()
    .min(1, "Tổng tiền là bắt buộc")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Tổng tiền phải là số và lớn hơn hoặc bằng 0",
    }),
}).refine((data) => {
  const checkIn = new Date(data.checkIn)
  const checkOut = new Date(data.checkOut)
  return checkOut > checkIn
}, {
  message: "Ngày check-out phải sau ngày check-in",
  path: ["checkOut"],
})

export type BookingFormValues = z.infer<typeof bookingFormSchema>

interface BookingFormProps {
  mode?: "create" | "edit"
  defaultValues?: Partial<BookingFormValues>
  bookingId?: string
  onSubmit?: (data: BookingFormValues) => Promise<void>
  onCancel?: () => void
}

// Sample available rooms - in real app, fetch from API
const availableRooms = [
  { number: "101", type: "Standard" },
  { number: "102", type: "Deluxe" },
  { number: "201", type: "Suite" },
  { number: "202", type: "Standard" },
  { number: "301", type: "Deluxe" },
  { number: "302", type: "Suite" },
  { number: "401", type: "Standard" },
  { number: "402", type: "Deluxe" },
]

export function BookingForm({
  mode = "create",
  defaultValues,
  bookingId,
  onSubmit: externalOnSubmit,
  onCancel,
}: BookingFormProps) {
  const router = useRouter()

  const defaultFormValues: BookingFormValues = {
    customerName: "",
    customerPhone: "",
    roomNumber: "",
    checkIn: "",
    checkOut: "",
    guests: "2",
    status: "pending",
    paymentMethod: "",
    totalAmount: "0",
  }

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: defaultValues
      ? { ...defaultFormValues, ...defaultValues }
      : defaultFormValues,
  })

  // Calculate nights when checkIn or checkOut changes
  const checkIn = form.watch("checkIn")
  const checkOut = form.watch("checkOut")
  const totalAmount = form.watch("totalAmount")

  useEffect(() => {
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn)
      const checkOutDate = new Date(checkOut)
      if (checkOutDate > checkInDate) {
        const nights = Math.ceil(
          (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        // You can auto-calculate totalAmount here if needed
        // For now, we'll just show nights in description
      }
    }
  }, [checkIn, checkOut])

  const handleSubmit = async (data: BookingFormValues) => {
    try {
      if (externalOnSubmit) {
        await externalOnSubmit(data)
        return
      }

      // Transform string numbers to actual numbers
      const bookingData = {
        ...data,
        guests: Number(data.guests),
        totalAmount: Number(data.totalAmount),
        // Calculate nights
        nights: (() => {
          const checkInDate = new Date(data.checkIn)
          const checkOutDate = new Date(data.checkOut)
          return Math.ceil(
            (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        })(),
      }

      // Simulate API call
      if (mode === "edit") {
        console.log("Updating booking:", bookingId, bookingData)
        toast.success("Cập nhật booking thành công!", {
          description: `Booking ${data.customerName} đã được cập nhật thành công.`,
        })
      } else {
        console.log("Creating booking:", bookingData)
        toast.success("Tạo booking thành công!", {
          description: `Booking cho ${data.customerName} đã được tạo thành công.`,
        })
      }

      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Redirect to bookings page
      router.push("/dashboard/bookings")
    } catch (error) {
      toast.error("Có lỗi xảy ra", {
        description:
          mode === "edit"
            ? "Không thể cập nhật booking. Vui lòng thử lại."
            : "Không thể tạo booking. Vui lòng thử lại.",
      })
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.back()
    }
  }

  // Calculate nights for display
  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    if (checkOutDate <= checkInDate) return 0
    return Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  const nights = calculateNights()

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "edit" ? "Chỉnh sửa thông tin booking" : "Thông tin booking"}
        </CardTitle>
        <CardDescription>
          {mode === "edit"
            ? "Cập nhật thông tin booking trong hệ thống"
            : "Điền đầy đủ thông tin để tạo booking mới"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên khách hàng *</FormLabel>
                    <FormControl>
                      <Input placeholder="VD: Nguyễn Văn A" {...field} />
                    </FormControl>
                    <FormDescription>
                      Họ và tên đầy đủ của khách hàng
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại *</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="VD: 0901234567"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Số điện thoại liên hệ của khách hàng
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số phòng *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn số phòng" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableRooms.map((room) => (
                          <SelectItem key={room.number} value={room.number}>
                            {room.number} - {room.type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Chọn phòng muốn đặt
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số khách *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="VD: 2, 4..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Số lượng khách sẽ ở
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày check-in *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      Ngày khách hàng nhận phòng
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkOut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày check-out *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      {nights > 0
                        ? `Ngày khách hàng trả phòng (${nights} đêm)`
                        : "Ngày khách hàng trả phòng"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Chờ xác nhận</SelectItem>
                        <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                        <SelectItem value="checked-in">Đã check-in</SelectItem>
                        <SelectItem value="checked-out">Đã check-out</SelectItem>
                        <SelectItem value="cancelled">Đã hủy</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Trạng thái hiện tại của booking
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phương thức thanh toán *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn phương thức thanh toán" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Credit Card">Thẻ tín dụng</SelectItem>
                        <SelectItem value="Cash">Tiền mặt</SelectItem>
                        <SelectItem value="Bank Transfer">Chuyển khoản</SelectItem>
                        <SelectItem value="E-Wallet">Ví điện tử</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Phương thức thanh toán của khách hàng
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tổng tiền (VNĐ) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="VD: 1000000"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Tổng số tiền cần thanh toán
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? mode === "edit"
                    ? "Đang cập nhật..."
                    : "Đang tạo..."
                  : mode === "edit"
                    ? "Cập nhật booking"
                    : "Tạo booking"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

