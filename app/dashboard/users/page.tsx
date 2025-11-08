"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { IconDotsVertical, IconPlus } from "@tabler/icons-react";
import { useSearchParams, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useProfiles } from "@/hooks/use-profiles";
import type { Profile } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Role badge component
const RoleBadge = ({ role }: { role: Profile["role"] }) => {
  const roleConfig = {
    admin: {
      label: "Quản trị viên",
      variant: "default" as const,
      className: "",
    },
    manager: {
      label: "Quản lý",
      variant: "default" as const,
      className: "bg-blue-500 hover:bg-blue-600 text-white border-0",
    },
    staff: {
      label: "Nhân viên",
      variant: "default" as const,
      className: "bg-green-500 hover:bg-green-600 text-white border-0",
    },
  };

  const config = roleConfig[role];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: Profile["status"] }) => {
  const statusConfig = {
    active: { label: "Hoạt động", variant: "default" as const },
    inactive: { label: "Không hoạt động", variant: "secondary" as const },
    suspended: { label: "Đã khóa", variant: "outline" as const },
  };

  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Format date
const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

function ChangePasswordForm({
  userId,
  userName,
  onClose,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const schema = z
    .object({
      password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
      confirm: z.string(),
    })
    .refine((data) => data.password === data.confirm, {
      message: "Nhập lại mật khẩu không trùng khớp",
      path: ["confirm"],
    });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const handleSubmit = async (data: { password: string; confirm: string }) => {
    try {
      const response = await fetch("/api/users/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Không thể đổi mật khẩu");
      }

      toast.success("Đổi mật khẩu thành công!", {
        description: `Mật khẩu cho ${userName} đã được cập nhật thành công.`,
      });
      form.reset();
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể đổi mật khẩu";
      toast.error("Đổi mật khẩu thất bại", {
        description: errorMessage,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu mới *</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Nhập mật khẩu mới"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nhập lại mật khẩu *</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Đang xử lý..." : "Đổi mật khẩu"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

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

type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
type EditUserFormValues = z.infer<typeof editUserFormSchema>;

function UserForm({
  profile,
  onClose,
  onCreate,
  onUpdate,
}: {
  profile?: Profile;
  onClose: () => void;
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

  const onSubmit = async (data: CreateUserFormValues | EditUserFormValues) => {
    try {
      if (isEdit) {
        await onUpdate(profile.id, data as EditUserFormValues);
      } else {
        await onCreate(data as CreateUserFormValues);
      }
      form.reset();
      onClose();
    } catch {
      // Error is handled in hook
    }
  };

  return (
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
            onClick={onClose}
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
  );
}

function ActionsCell({
  userName,
  profile,
  onEdit,
}: {
  userName: string;
  profile: Profile;
  onEdit: (profile: Profile) => void;
}) {
  const [openPasswordDialog, setOpenPasswordDialog] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem onClick={() => onEdit(profile)}>
            Chỉnh sửa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenPasswordDialog(true)}>
            Đổi mật khẩu
          </DropdownMenuItem>
          {/* <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            Xóa tài khoản
          </DropdownMenuItem> */}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={openPasswordDialog} onOpenChange={setOpenPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
            <DialogDescription>
              Đổi mật khẩu cho người dùng: {userName}
            </DialogDescription>
          </DialogHeader>
          <ChangePasswordForm
            userId={profile.id}
            userName={userName}
            onClose={() => setOpenPasswordDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// Table columns - will be updated with onEdit handler in component
const createColumns = (
  onEdit: (profile: Profile) => void
): ColumnDef<Profile>[] => [
  {
    accessorKey: "full_name",
    header: "Tên",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Số điện thoại",
    cell: ({ row }) => row.original.phone || "-",
  },
  {
    accessorKey: "role",
    header: "Vai trò",
    cell: ({ row }) => <RoleBadge role={row.original.role} />,
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "created_at",
    header: "Ngày tạo",
    cell: ({ row }) => formatDate(row.original.created_at),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <ActionsCell
        userName={row.original.full_name}
        profile={row.original}
        onEdit={onEdit}
      />
    ),
  },
];

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = React.useState("");
  const [openUserDialog, setOpenUserDialog] = React.useState(false);
  const [editingProfile, setEditingProfile] = React.useState<
    Profile | undefined
  >();

  // Get pagination and search from URL params
  const page = React.useMemo(() => {
    const pageParam = searchParams.get("page");
    const pageNum = pageParam ? parseInt(pageParam, 10) : 1;
    return pageNum > 0 ? pageNum : 1;
  }, [searchParams]);

  const limit = React.useMemo(() => {
    const limitParam = searchParams.get("limit");
    const limitNum = limitParam ? parseInt(limitParam, 10) : 10;
    return limitNum > 0 ? limitNum : 10;
  }, [searchParams]);

  const search = React.useMemo(() => {
    return searchParams.get("search") || "";
  }, [searchParams]);

  // Update search params
  const updateSearchParams = React.useCallback(
    (newPage: number, newLimit: number, newSearch: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) {
        params.set("page", newPage.toString());
      } else {
        params.delete("page");
      }
      if (newLimit !== 10) {
        params.set("limit", newLimit.toString());
      } else {
        params.delete("limit");
      }
      if (newSearch) {
        params.set("search", newSearch);
      } else {
        params.delete("search");
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Sync local search with URL search
  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        updateSearchParams(1, limit, localSearch);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearch, limit, search, updateSearchParams]);

  const {
    profiles,
    isLoading,
    pagination,
    fetchProfiles,
    createProfile,
    updateProfile,
  } = useProfiles(page, limit, search);

  const handleCreateUser = () => {
    setEditingProfile(undefined);
    setOpenUserDialog(true);
  };

  const handleEditUser = (profile: Profile) => {
    setEditingProfile(profile);
    setOpenUserDialog(true);
  };

  const handleCloseUserDialog = () => {
    setOpenUserDialog(false);
    setEditingProfile(undefined);
  };

  const handleCreate = async (data: CreateUserFormValues) => {
    try {
      await createProfile({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        phone: data.phone || null,
        role: data.role,
        status: data.status,
      });
      toast.success("Tạo người dùng thành công!", {
        description: `Người dùng ${data.full_name} đã được tạo thành công.`,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể tạo người dùng";
      toast.error("Tạo người dùng thất bại", {
        description: errorMessage,
      });
      throw err;
    }
  };

  const handleUpdate = async (id: string, data: EditUserFormValues) => {
    try {
      const updatedProfile = await updateProfile(id, {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        status: data.status,
      });
      toast.success("Cập nhật người dùng thành công!", {
        description: `Người dùng ${updatedProfile.full_name} đã được cập nhật thành công.`,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể cập nhật người dùng";
      toast.error("Cập nhật người dùng thất bại", {
        description: errorMessage,
      });
      throw err;
    }
  };

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi người dùng trong hệ thống
          </p>
        </div>
        <Button onClick={handleCreateUser} className="gap-2">
          <IconPlus className="size-4" />
          Tạo người dùng mới
        </Button>
      </div>

      <div className="px-4 lg:px-6">
        <DataTable
          columns={createColumns(handleEditUser)}
          data={profiles}
          searchKey="full_name"
          searchPlaceholder="Tìm kiếm theo tên, email, số điện thoại..."
          emptyMessage="Không tìm thấy kết quả."
          entityName="người dùng"
          getRowId={(row) => row.id}
          fetchData={() => fetchProfiles(page, limit, search)}
          isLoading={isLoading}
          serverPagination={pagination}
          onPageChange={(newPage) => updateSearchParams(newPage, limit, search)}
          onLimitChange={(newLimit) => updateSearchParams(1, newLimit, search)}
          serverSearch={localSearch}
          onSearchChange={setLocalSearch}
        />
      </div>

      <Dialog
        open={openUserDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseUserDialog();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? "Chỉnh sửa người dùng" : "Tạo người dùng mới"}
            </DialogTitle>
            <DialogDescription>
              {editingProfile
                ? "Cập nhật thông tin người dùng trong hệ thống"
                : "Điền đầy đủ thông tin để tạo người dùng mới"}
            </DialogDescription>
          </DialogHeader>
          <UserForm
            profile={editingProfile}
            onClose={handleCloseUserDialog}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
