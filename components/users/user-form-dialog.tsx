"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
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
import type { Branch, Profile } from "@/lib/types";
import { DEFAULT_BRANCH_ID, USER_ROLE } from "@/lib/constants";

// User form schema for create (with password)
const createUserFormSchema = z.object({
  full_name: z.string().min(1, "Tên người dùng là bắt buộc"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  phone: z.string().optional(),
  role: z.enum([USER_ROLE.MANAGER, USER_ROLE.STAFF]), // Only manager and staff when creating
  status: z.enum(["active", "inactive", "suspended"]),
  branch_id: z.string().optional(),
});

// User form schema for edit (without password)
const editUserFormSchema = z.object({
  full_name: z.string().min(1, "Tên người dùng là bắt buộc"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().optional(),
  role: z.enum([USER_ROLE.ADMIN, USER_ROLE.MANAGER, USER_ROLE.STAFF]), // All 3 roles
  status: z.enum(["active", "inactive", "suspended"]),
  branch_id: z.string().optional().nullable(),
});

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
export type EditUserFormValues = z.infer<typeof editUserFormSchema>;

interface UserFormDialogProps {
  profile?: Profile;
  branches?: Branch[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateUserFormValues) => Promise<void>;
  onUpdate: (id: string, data: EditUserFormValues) => Promise<void>;
}

export function UserFormDialog({
  profile,
  branches = [],
  open,
  onOpenChange,
  onCreate,
  onUpdate,
}: UserFormDialogProps) {
  const isEdit = !!profile;
  const form = useForm<CreateUserFormValues | EditUserFormValues>({
    resolver: zodResolver(isEdit ? editUserFormSchema : createUserFormSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      phone: "",
      role: USER_ROLE.STAFF,
      status: "active",
      branch_id: DEFAULT_BRANCH_ID,
    },
  });

  // Reset form when profile or open state changes
  useEffect(() => {
    if (open) {
      if (profile) {
        // Edit mode - populate with profile data
        form.reset({
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone || "",
          role: profile.role,
          status: profile.status,
          branch_id:
            profile.role === USER_ROLE.STAFF
              ? profile.branch_id ?? DEFAULT_BRANCH_ID
              : undefined,
        });
      } else {
        // Create mode - reset to default
        form.reset({
          full_name: "",
          email: "",
          password: "",
          phone: "",
          role: USER_ROLE.STAFF,
          status: "active",
          branch_id: DEFAULT_BRANCH_ID,
        });
      }
    }
  }, [open, profile, form]);

  const watchedRole = form.watch("role");
  const showBranchSelect = watchedRole === USER_ROLE.STAFF;
  const assignedBranchName =
    profile?.branch_id &&
    branches.find((b) => b.id === profile.branch_id)?.name;

  useEffect(() => {
    if (watchedRole === USER_ROLE.STAFF && !form.getValues("branch_id")) {
      form.setValue("branch_id", DEFAULT_BRANCH_ID);
    }
    if (watchedRole !== USER_ROLE.STAFF) {
      form.setValue("branch_id", undefined);
    }
  }, [watchedRole, form]);

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

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                          <SelectItem value={USER_ROLE.ADMIN}>Quản trị viên</SelectItem>
                          <SelectItem value={USER_ROLE.MANAGER}>Quản lý</SelectItem>
                          <SelectItem value={USER_ROLE.STAFF}>Nhân viên</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value={USER_ROLE.MANAGER}>Quản lý</SelectItem>
                          <SelectItem value={USER_ROLE.STAFF}>Nhân viên</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showBranchSelect ? (
              <FormField
                control={form.control}
                name="branch_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chi nhánh *</FormLabel>
                    <Select
                      value={field.value ?? DEFAULT_BRANCH_ID}
                      onValueChange={(value) => field.onChange(value)}
                      disabled={branches.length === 0}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn chi nhánh" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {branches.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Chưa có chi nhánh. Vui lòng tạo chi nhánh trước.
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : isEdit && (profile?.role === USER_ROLE.ADMIN || profile?.role === USER_ROLE.MANAGER) ? (
              <FormItem>
                <FormLabel>Chi nhánh</FormLabel>
                <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-2">
                  Vai trò Quản trị viên / Quản lý không gắn chi nhánh cố định
                  (xem được mọi chi nhánh). Đổi vai trò thành{" "}
                  <span className="font-medium">Nhân viên</span> để chọn chi
                  nhánh
                  {assignedBranchName
                    ? ` (hiện tại: ${assignedBranchName})`
                    : ""}
                  .
                </p>
              </FormItem>
            ) : null}
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
                onClick={() => handleOpenChange(false)}
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
