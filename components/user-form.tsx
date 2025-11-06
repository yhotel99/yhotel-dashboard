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
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

const baseSchema = z.object({
  name: z.string().min(1, "Tên không được để trống"),
  email: z.string().email("Email không hợp lệ"),
  phone: z
    .string()
    .min(1, "Số điện thoại bắt buộc")
    .regex(/^[0-9]{10,11}$/, "Số điện thoại không hợp lệ"),
  role: z.enum(["admin", "manager", "staff", "receptionist"]),
  status: z.enum(["active", "inactive", "suspended"]),
})

export const userFormSchema = baseSchema.extend({
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
})
.partial({ password: true })

export type UserFormValues = z.infer<typeof userFormSchema>

interface UserFormProps {
  mode?: "create" | "edit"
  defaultValues?: Partial<UserFormValues>
  userId?: string
  onSubmit?: (data: UserFormValues) => Promise<void>
  onCancel?: () => void
}

export function UserForm({
  mode = "create",
  defaultValues,
  userId,
  onSubmit: externalOnSubmit,
  onCancel,
}: UserFormProps) {
  const router = useRouter()

  const defaultFormValues: UserFormValues = {
    name: "",
    email: "",
    phone: "",
    role: "staff",
    status: "active",
    password: "",
  }
  const form = useForm<UserFormValues>({
    resolver: zodResolver(
      mode === "edit"
        ? baseSchema // không bắt buộc password khi edit
        : userFormSchema // bắt buộc password khi create
    ),
    defaultValues: defaultValues
      ? { ...defaultFormValues, ...defaultValues }
      : defaultFormValues,
  })

  const handleSubmit = async (data: UserFormValues) => {
    try {
      if (externalOnSubmit) {
        await externalOnSubmit(data)
        return
      }
      if (mode === "edit") {
        toast.success("Cập nhật người dùng thành công!", { description: data.name })
      } else {
        toast.success("Tạo người dùng thành công!", { description: data.name })
      }
      await new Promise((r) => setTimeout(r, 600))
      router.push("/dashboard/users")
    } catch (error) {
      toast.error("Có lỗi xảy ra", { description: "Không thể lưu dữ liệu." })
    }
  }
  const handleCancel = () => onCancel ? onCancel() : router.back()

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "edit" ? "Chỉnh sửa người dùng" : "Thông tin người dùng"}
        </CardTitle>
        <CardDescription>
          {mode === "edit"
            ? "Cập nhật thông tin người dùng"
            : "Điền đầy đủ thông tin để tạo mới"}
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
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vai trò *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn vai trò" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Quản trị viên</SelectItem>
                        <SelectItem value="manager">Quản lý</SelectItem>
                        <SelectItem value="staff">Nhân viên</SelectItem>
                        <SelectItem value="receptionist">Lễ tân</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="active">Hoạt động</SelectItem>
                        <SelectItem value="inactive">Không hoạt động</SelectItem>
                        <SelectItem value="suspended">Đã khóa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mode === "create" && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mật khẩu *</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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