"use client";

import * as React from "react";
import { IconPlus } from "@tabler/icons-react";
import { useShallowSearchParams } from "@/hooks/use-shallow-search-params";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { toast } from "sonner";
import { useInitialSwrKey } from "@/hooks/use-initial-swr-key";
import { useDebouncedUrlSearch } from "@/hooks/use-debounced-url-search";
import { buildProfilesSwrKey, useProfiles } from "@/hooks/use-profiles";
import { createProfileAction, updateProfileAction } from "@/actions/profiles";
import type { Profile, ProfilesResponse } from "@/lib/types";
import { createColumns } from "@/components/users/columns";
import {
  UserFormDialog,
  BRANCH_NONE_VALUE,
  type CreateUserFormValues,
  type EditUserFormValues,
} from "@/components/users/user-form-dialog";
import { useBranch } from "@/contexts/branch-context";
import { DEFAULT_BRANCH_ID, USER_ROLE } from "@/lib/constants";

function resolveProfileBranchId(
  role: string,
  branchId: string | null | undefined
): string | null {
  if (!branchId || branchId === BRANCH_NONE_VALUE) return null;
  return branchId;
}

export function UsersContent({
  initialData,
}: {
  initialData: ProfilesResponse;
}) {
  const { searchParams, pushSearchParams } = useShallowSearchParams();
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
      pushSearchParams((params) => {
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
      });
    },
    [pushSearchParams]
  );

  const onSearchCommit = React.useCallback(
    (value: string) => {
      updateSearchParams(1, limit, value);
    },
    [limit, updateSearchParams]
  );
  const { localSearch, setLocalSearch } = useDebouncedUrlSearch(
    search,
    onSearchCommit,
    500
  );

  const { branches, filterBranchId } = useBranch();
  const branchNameById = React.useMemo(
    () => Object.fromEntries(branches.map((b) => [b.id, b.name])),
    [branches]
  );

  const initialSwrKey = useInitialSwrKey(() =>
    buildProfilesSwrKey({
      page,
      limit,
      search,
      branchId: filterBranchId,
    })
  );

  const { profiles, isLoading, pagination, refetch, mutate } = useProfiles({
    page,
    limit,
    search,
    branchId: filterBranchId,
    fallbackData: initialData,
    initialSwrKey,
  });

  // Wrapper functions to call server actions and refresh data
  const handleCreateProfile = React.useCallback(
    async (
      input: Omit<
        Profile,
        "id" | "created_at" | "updated_at" | "deleted_at"
      > & {
        password: string;
      }
    ) => {
      await createProfileAction(input);
      // Refresh data after create
      await mutate();
    },
    [mutate]
  );

  const handleUpdateProfile = React.useCallback(
    async (
      id: string,
      input: Partial<
        Omit<Profile, "id" | "created_at" | "updated_at" | "deleted_at">
      >
    ) => {
      const updatedProfile = await updateProfileAction(id, input);
      // Refresh data after update
      await mutate();
      return updatedProfile;
    },
    [mutate]
  );

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
      await handleCreateProfile({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        phone: data.phone || null,
        role: data.role,
        status: data.status,
        branch_id:
          data.role === USER_ROLE.STAFF
            ? resolveProfileBranchId(data.role, data.branch_id) ??
              DEFAULT_BRANCH_ID
            : resolveProfileBranchId(data.role, data.branch_id),
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
      const updatedProfile = await handleUpdateProfile(id, {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        status: data.status,
        branch_id:
          data.role === USER_ROLE.STAFF
            ? resolveProfileBranchId(data.role, data.branch_id) ??
              DEFAULT_BRANCH_ID
            : resolveProfileBranchId(data.role, data.branch_id),
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
          columns={createColumns(handleEditUser, branchNameById)}
          data={profiles}
          searchKey="full_name"
          searchPlaceholder="Tìm kiếm theo tên, email, số điện thoại..."
          emptyMessage="Không tìm thấy kết quả."
          entityName="người dùng"
          getRowId={(row) => row.id}
          fetchData={() => refetch()}
          isLoading={isLoading}
          serverPagination={pagination}
          paginationVariant="sequential"
          onPageChange={(newPage) => updateSearchParams(newPage, limit, search)}
          onLimitChange={(newLimit) => updateSearchParams(1, newLimit, search)}
          serverSearch={localSearch}
          onSearchChange={setLocalSearch}
        />
      </div>

      {openUserDialog && (
        <UserFormDialog
          profile={editingProfile}
          branches={branches}
          open={openUserDialog}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseUserDialog();
            }
          }}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
