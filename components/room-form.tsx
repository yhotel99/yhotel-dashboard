"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"

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
export const roomFormSchema = z.object({
  number: z.string().min(1, "Số phòng là bắt buộc"),
  type: z.string().min(1, "Loại phòng là bắt buộc"),
  status: z.enum(["available", "occupied", "maintenance"]),
  price: z
    .string()
    .min(1, "Giá phòng là bắt buộc")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Giá phải là số và lớn hơn hoặc bằng 0",
    }),
  floor: z
    .string()
    .min(1, "Tầng là bắt buộc")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1, {
      message: "Tầng phải là số và lớn hơn hoặc bằng 1",
    }),
  capacity: z
    .string()
    .min(1, "Sức chứa là bắt buộc")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1, {
      message: "Sức chứa phải là số và lớn hơn hoặc bằng 1",
    }),
  amenities: z.array(z.string()).min(1, "Vui lòng chọn ít nhất một tiện ích"),
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

  const defaultFormValues: RoomFormValues = {
    number: "",
    type: "",
    status: "available",
    price: "0",
    floor: "1",
    capacity: "2",
    amenities: [],
  }

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: defaultValues
      ? { ...defaultFormValues, ...defaultValues }
      : defaultFormValues,
  })

  const handleSubmit = async (data: RoomFormValues) => {
    try {
      if (externalOnSubmit) {
        await externalOnSubmit(data)
        return
      }

      // Transform string numbers to actual numbers
      const roomData = {
        ...data,
        price: Number(data.price),
        floor: Number(data.floor),
        capacity: Number(data.capacity),
      }

      // Simulate API call
      if (mode === "edit") {
        console.log("Updating room:", roomId, roomData)
        toast.success("Cập nhật phòng thành công!", {
          description: `Phòng ${data.number} đã được cập nhật thành công.`,
        })
      } else {
        console.log("Creating room:", roomData)
        toast.success("Tạo phòng thành công!", {
          description: `Phòng ${data.number} đã được tạo thành công.`,
        })
      }

      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Redirect to rooms page
      router.push("/dashboard/rooms")
    } catch (error) {
      toast.error("Có lỗi xảy ra", {
        description: mode === "edit" 
          ? "Không thể cập nhật phòng. Vui lòng thử lại."
          : "Không thể tạo phòng. Vui lòng thử lại.",
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
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số phòng *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: 101, 201, 301..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Số phòng phải là duy nhất trong hệ thống
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
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
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Deluxe">Deluxe</SelectItem>
                        <SelectItem value="Suite">Suite</SelectItem>
                        <SelectItem value="Executive">Executive</SelectItem>
                        <SelectItem value="Presidential">
                          Presidential
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Loại phòng xác định mức giá và tiện ích
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
                        <SelectItem value="available">Có sẵn</SelectItem>
                        <SelectItem value="occupied">Đã đặt</SelectItem>
                        <SelectItem value="maintenance">Bảo trì</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Trạng thái hiện tại của phòng
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá phòng (VNĐ) *</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tầng *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="VD: 1, 2, 3..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>Tầng của phòng</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sức chứa (người) *</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="amenities"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Tiện ích *</FormLabel>
                    <FormDescription>
                      Chọn các tiện ích có trong phòng
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
                  <FormMessage />
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

