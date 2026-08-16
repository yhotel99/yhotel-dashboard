"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useMemo, useRef } from "react";
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

const EMPTY_BRANCHES: Branch[] = [];
import { DEFAULT_BRANCH_ID, USER_ROLE } from "@/lib/constants";
import { getActiveBranches } from "@/lib/branch";

/** Select value when admin/manager has no fixed branch (views all branches). */
export const BRANCH_NONE_VALUE = "__none__";

function branchIdToFormValue(
  role: string,
  branchId: string | null | undefined
): string {
  if (branchId) return branchId;
  return role === USER_ROLE.STAFF ? DEFAULT_BRANCH_ID : BRANCH_NONE_VALUE;
}

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
  branches = EMPTY_BRANCHES,
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

  const prevFormSyncKeyRef = useRef<string | null>(null);
  const formSyncKey = open ? (profile?.id ?? "__create__") : null;
  if (formSyncKey !== null && formSyncKey !== prevFormSyncKeyRef.current) {
    prevFormSyncKeyRef.current = formSyncKey;
    if (profile) {
      form.reset({
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone || "",
        role: profile.role,
        status: profile.status,
        branch_id: branchIdToFormValue(profile.role, profile.branch_id),
      });
    } else {
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
  if (formSyncKey === null) {
    prevFormSyncKeyRef.current = null;
  }

  const watchedRole = form.watch("role");
  const isStaffRole = watchedRole === USER_ROLE.STAFF;
  const showBranchSelect =
    isStaffRole ||
    (isEdit &&
      (watchedRole === USER_ROLE.ADMIN ||
        watchedRole === USER_ROLE.MANAGER));

  // Pickers show active branches; keep the currently-assigned branch even if
  // inactive so editing an existing user never drops the assignment.
  const displayBranches = useMemo(() => {
    const active = getActiveBranches(branches);
    const currentBranchId = profile?.branch_id;
    if (!currentBranchId || active.some((b) => b.id === currentBranchId)) {
      return active;
    }
    const current = branches.find((b) => b.id === currentBranchId);
    return current ? [...active, current] : active;
  }, [branches, profile]);

  useEffect(() => {
    const current = form.getValues("branch_id");
    if (isStaffRole) {
      if (!current || current === BRANCH_NONE_VALUE) {
        form.setValue("branch_id", DEFAULT_BRANCH_ID);
      }
      return;
    }
    if (
      isEdit &&
      (watchedRole === USER_ROLE.ADMIN || watchedRole === USER_ROLE.MANAGER)
    ) {
      if (!current) {
        form.setValue("branch_id", BRANCH_NONE_VALUE);
      }
    }
  }, [watchedRole, isStaffRole, isEdit, form]);

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
                    <FormLabel>
                      Chi nhánh{isStaffRole ? " *" : ""}
                    </FormLabel>
                    <Select
                      value={
                        field.value ??
                        (isStaffRole ? DEFAULT_BRANCH_ID : BRANCH_NONE_VALUE)
                      }
                      onValueChange={(value) => field.onChange(value)}
                      disabled={displayBranches.length === 0}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn chi nhánh" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!isStaffRole ? (
                          <SelectItem value={BRANCH_NONE_VALUE}>
                            Toàn hệ thống (không cố định)
                          </SelectItem>
                        ) : null}
                        {displayBranches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {displayBranches.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Chưa có chi nhánh. Vui lòng tạo chi nhánh trước.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {isStaffRole
                          ? "Nhân viên làm việc tại một chi nhánh cố định."
                          : "Quản trị viên / Quản lý vẫn xem được mọi chi nhánh; có thể gán chi nhánh mặc định nếu cần."}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
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
