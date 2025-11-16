"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { toast } from "sonner";
import { usePaginationSearchParams } from "@/hooks/use-pagination-search-params";
import { useProfiles } from "@/hooks/use-profiles";
import type { Profile } from "@/lib/types";
import { RoleBadge, StatusBadge } from "@/components/users/status";
import { UserActionsCell } from "@/components/users/actions-cell";
import {
  UserFormDialog,
  type CreateUserFormValues,
  type EditUserFormValues,
} from "@/components/users/user-form-dialog";
import { formatDate } from "@/lib/utils";

// Table columns
const createColumns = (
  onEdit: (profile: Profile) => void
): ColumnDef<Profile>[] => [
  {
    accessorKey: "full_name",
    header: "Tên",
    size: 150,
    minSize: 130,
  },
  {
    accessorKey: "email",
    header: "Email",
    size: 180,
    minSize: 150,
  },
  {
    accessorKey: "phone",
    header: "Số điện thoại",
    cell: ({ row }) => row.original.phone || "-",
    size: 100,
    minSize: 80,
  },
  {
    accessorKey: "role",
    header: "Vai trò",
    cell: ({ row }) => <RoleBadge role={row.original.role} />,
    size: 100,
    minSize: 80,
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    size: 100,
    minSize: 80,
  },
  {
    accessorKey: "created_at",
    header: "Ngày tạo",
    cell: ({ row }) => formatDate(row.original.created_at || ""),
    size: 150,
    minSize: 130,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <UserActionsCell profile={row.original} onEdit={onEdit} />
    ),
    size: 60,
    minSize: 40,
  },
];

export default function UsersPage() {
  const [openUserDialog, setOpenUserDialog] = React.useState(false);
  const [editingProfile, setEditingProfile] = React.useState<
    Profile | undefined
  >();

  const {
    page,
    limit,
    search,
    localSearch,
    setLocalSearch,
    updateSearchParams,
  } = usePaginationSearchParams();

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

      <UserFormDialog
        profile={editingProfile}
        open={openUserDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseUserDialog();
          }
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
