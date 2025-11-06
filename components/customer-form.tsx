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
import {
  Form,
  FormControl,
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

const customerFormSchema = z.object({
  name: z.string().trim().min(1, "Tên không được để trống"),
  phone: z
    .string()
    .trim()
    .min(1, "Số điện thoại bắt buộc")
    .regex(/^[0-9]{10,11}$/u, "Số điện thoại không hợp lệ"),
  email: z.string().trim().email("Email không hợp lệ"),
  status: z.enum(["active", "banned"]),
})

export type CustomerFormValues = z.infer<typeof customerFormSchema>

interface CustomerFormProps {
  mode?: "create" | "edit"
  defaultValues?: Partial<CustomerFormValues>
  customerId?: string
  onSubmit?: (data: CustomerFormValues) => Promise<void>
  onCancel?: () => void
}

export function CustomerForm({
  mode = "create",
  defaultValues,
  onSubmit: externalOnSubmit,
  onCancel,
}: CustomerFormProps) {
  const router = useRouter()

  const defaultFormValues: CustomerFormValues = {
    name: "",
    phone: "",
    email: "",
    status: "active",
  }

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: defaultValues ? { ...defaultFormValues, ...defaultValues } : defaultFormValues,
  })

  const handleSubmit = async (data: CustomerFormValues) => {
    try {
      if (externalOnSubmit) {
        await externalOnSubmit(data)
        return
      }
      if (mode === "edit") {
        toast.success("Cập nhật khách hàng thành công!", { description: data.name })
      } else {
        toast.success("Tạo khách hàng thành công!", { description: data.name })
      }
      await new Promise((r) => setTimeout(r, 600))
      router.push("/dashboard/customers")
    } catch (error) {
      toast.error("Có lỗi xảy ra", { description: "Không thể lưu dữ liệu." })
    }
  }

  const handleCancel = () => (onCancel ? onCancel() : router.back())

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "edit" ? "Chỉnh sửa khách hàng" : "Thông tin khách hàng"}
        </CardTitle>
        <CardDescription>
          {mode === "edit" ? "Cập nhật thông tin khách hàng" : "Điền đầy đủ thông tin để tạo khách hàng mới"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ tên *</FormLabel>
                    <FormControl>
                      <Input placeholder="VD: Nguyễn Văn A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại *</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="VD: 0901234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="VD: user@email.com" {...field} />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Đang hoạt động</SelectItem>
                        <SelectItem value="banned">Đã khóa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Hủy
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? mode === "edit"
                    ? "Đang cập nhật..."
                    : "Đang tạo..."
                  : mode === "edit"
                    ? "Cập nhật"
                    : "Tạo mới"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
