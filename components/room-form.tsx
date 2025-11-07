"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { useRooms } from "@/hooks/use-rooms"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
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
import { Textarea } from "@/components/ui/textarea"

// Room type enum matching database
export const roomTypeEnum = ["standard", "deluxe", "superior", "family"] as const
export const roomStatusEnum = ["available", "maintenance", "inactive"] as const

// Form validation schema
export const roomFormSchema = z.object({
  name: z.string().min(1, "Tên phòng là bắt buộc"),
  description: z.string().optional(),
  room_type: z.enum(roomTypeEnum),
  price_per_night: z
    .string()
    .min(1, "Giá mỗi đêm là bắt buộc")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Giá phải là số và lớn hơn hoặc bằng 0",
    }),
  max_guests: z
    .string()
    .min(1, "Số khách tối đa là bắt buộc")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1, {
      message: "Số khách tối đa phải là số và lớn hơn hoặc bằng 1",
    }),
  status: z.enum(roomStatusEnum),
  amenities: z.array(z.string()),
})

export type RoomFormValues = z.infer<typeof roomFormSchema>

export const availableAmenities = [
  "WiFi",
  "TV",
  "Mini Bar",
  "Balcony",
  "Air Conditioning",
  "Safe",
  "Refrigerator",
  "Hair Dryer",
  "Coffee Maker",
  "Room Service",
]

interface RoomFormProps {
  mode?: "create" | "edit"
  defaultValues?: Partial<RoomFormValues>
  roomId?: string
  onSubmit?: (data: RoomFormValues) => Promise<void>
  onCancel?: () => void
}

export function RoomForm({
  mode = "create",
  defaultValues,
  roomId,
  onSubmit: externalOnSubmit,
  onCancel,
}: RoomFormProps) {
  const router = useRouter()
  const { createRoom, updateRoom } = useRooms()

  const defaultFormValues: RoomFormValues = {
    name: "",
    description: "",
    room_type: "standard",
    price_per_night: "0",
    max_guests: "2",
    status: "available",
    amenities: [],
  }

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: defaultValues
      ? { ...defaultFormValues, ...defaultValues, amenities: defaultValues.amenities ?? [] }
      : defaultFormValues,
  })

  const handleSubmit = async (data: RoomFormValues) => {
    try {
      if (externalOnSubmit) {
        await externalOnSubmit(data)
        return
      }

      // Transform data to match database schema
      const roomData = {
        name: data.name,
        description: data.description || null,
        room_type: data.room_type,
        price_per_night: Number(data.price_per_night),
        max_guests: Number(data.max_guests),
        status: data.status,
        amenities: data.amenities,
      }

      if (mode === "edit") {
        // Update room
        await updateRoom(roomId!, roomData)
      } else {
        // Create room
        await createRoom(roomData)
      }

      // Redirect to rooms page
      router.push("/dashboard/rooms")
      router.refresh()
    } catch (error) {
      toast.error("Có lỗi xảy ra", {
        description: mode === "edit" 
          ? "Không thể cập nhật phòng. Vui lòng thử lại."
          : "Không thể tạo phòng. Vui lòng thử lại.",
      })
      console.error("Room form error:", error)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.back()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "edit" ? "Chỉnh sửa thông tin phòng" : "Thông tin phòng"}
        </CardTitle>
        <CardDescription>
          {mode === "edit"
            ? "Cập nhật thông tin phòng trong hệ thống"
            : "Điền đầy đủ thông tin để tạo phòng mới"}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên phòng *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Deluxe 301, Suite 201..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Tên phòng phải là duy nhất trong hệ thống
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="room_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại phòng *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn loại phòng" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="deluxe">Deluxe</SelectItem>
                        <SelectItem value="superior">Superior</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Loại phòng xác định mức giá và tiện ích
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_per_night"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá mỗi đêm (VNĐ) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="VD: 500000"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Giá phòng cho một đêm
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_guests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số khách tối đa *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="VD: 2, 4, 6..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Số lượng người tối đa có thể ở
                    </FormDescription>
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
                        <SelectItem value="available">Có sẵn</SelectItem>
                        <SelectItem value="maintenance">Bảo trì</SelectItem>
                        <SelectItem value="inactive">Không hoạt động</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Trạng thái kỹ thuật/quản trị của phòng
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Mô tả chi tiết về phòng..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Mô tả chi tiết về phòng và các đặc điểm nổi bật
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amenities"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Tiện ích</FormLabel>
                    <FormDescription>
                      Chọn các tiện ích có trong phòng (tùy chọn)
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                    {availableAmenities.map((amenity) => (
                      <FormField
                        key={amenity}
                        control={form.control}
                        name="amenities"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={amenity}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(amenity)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([
                                          ...(field.value || []),
                                          amenity,
                                        ])
                                      : field.onChange(
                                          (field.value || []).filter(
                                            (value) => value !== amenity
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {amenity}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />

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
                    ? "Cập nhật phòng"
                    : "Tạo phòng"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

