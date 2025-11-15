import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Profile } from "@/lib/types";

// User form schema for create (with password)
const createUserFormSchema = z.object({
  full_name: z.string().min(1, "Tên người dùng là bắt buộc"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  phone: z.string().optional(),
  role: z.enum(["manager", "staff"]), // Only manager and staff when creating
  status: z.enum(["active", "inactive", "suspended"]),
});

// User form schema for edit (without password)
const editUserFormSchema = z.object({
  full_name: z.string().min(1, "Tên người dùng là bắt buộc"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().optional(),
  role: z.enum(["admin", "manager", "staff"]), // Only 3 roles
  status: z.enum(["active", "inactive", "suspended"]),
});

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
export type EditUserFormValues = z.infer<typeof editUserFormSchema>;

export function UserFormDialog({
  profile,
  open,
  onOpenChange,
  onCreate,
  onUpdate,
}: {
  profile?: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateUserFormValues) => Promise<void>;
  onUpdate: (id: string, data: EditUserFormValues) => Promise<void>;
}) {
  const isEdit = !!profile;
  const form = useForm<CreateUserFormValues | EditUserFormValues>({
    resolver: zodResolver(isEdit ? editUserFormSchema : createUserFormSchema),
    defaultValues: profile
      ? {
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone || "",
          role: profile.role,
          status: profile.status,
        }
      : {
          full_name: "",
          email: "",
          password: "",
          phone: "",
          role: "staff",
          status: "active",
        },
  });

  // Reset form when profile changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      if (profile) {
        // Edit mode: reset with profile data
        form.reset({
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone || "",
          role: profile.role,
          status: profile.status,
        });
      } else {
        // Create mode: reset to default values
        form.reset({
          full_name: "",
          email: "",
          password: "",
          phone: "",
          role: "staff",
          status: "active",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile ?? null]);

  const onSubmit = async (data: CreateUserFormValues | EditUserFormValues) => {
    try {
      if (isEdit) {
        await onUpdate(profile.id, data as EditUserFormValues);
      } else {
        await onCreate(data as CreateUserFormValues);
      }
      form.reset();
      onOpenChange(false);
    } catch {
      // Error is handled in parent component
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Chỉnh sửa người dùng" : "Tạo người dùng mới"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật thông tin người dùng trong hệ thống"
              : "Điền đầy đủ thông tin để tạo người dùng mới"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên người dùng *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tên người dùng" {...field} />
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
                    <Input
                      type="email"
                      placeholder="Nhập email"
                      {...field}
                      disabled={isEdit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isEdit && (
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
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số điện thoại</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập số điện thoại" {...field} />
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl className="w-full">
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn vai trò" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isEdit ? (
                        <>
                          <SelectItem value="admin">Quản trị viên</SelectItem>
                          <SelectItem value="manager">Quản lý</SelectItem>
                          <SelectItem value="staff">Nhân viên</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="manager">Quản lý</SelectItem>
                          <SelectItem value="staff">Nhân viên</SelectItem>
                        </>
                      )}
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? isEdit
                    ? "Đang cập nhật..."
                    : "Đang tạo..."
                  : isEdit
                  ? "Cập nhật"
                  : "Tạo mới"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
