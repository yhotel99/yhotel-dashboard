"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { IconPlus } from "@tabler/icons-react";

import type { Voucher, VoucherInput, VouchersResponse } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { useVouchers } from "@/hooks/use-vouchers";
import {
  createVoucher,
  deleteVoucher,
  toggleVoucherActive,
  updateVoucher,
} from "@/actions/vouchers";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { createVoucherColumns } from "@/components/vouchers/columns";
import { VoucherFormDialog } from "@/components/vouchers/voucher-form-dialog";
import { DeleteVoucherDialog } from "@/components/vouchers/delete-voucher-dialog";
import { usePermissions } from "@/contexts/permissions-context";

export function VouchersContent({ initialData }: { initialData: VouchersResponse }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("create:vouchers");
  const canUpdate = hasPermission("update:vouchers");
  const canDelete = hasPermission("delete:vouchers");

  const page = useMemo(() => {
    const pageParam = searchParams.get("page");
    const pageNum = pageParam ? parseInt(pageParam, 10) : 1;
    return pageNum > 0 ? pageNum : 1;
  }, [searchParams]);

  const limit = useMemo(() => {
    const limitParam = searchParams.get("limit");
    const limitNum = limitParam ? parseInt(limitParam, 10) : 10;
    return limitNum > 0 ? limitNum : 10;
  }, [searchParams]);

  const search = useMemo(() => searchParams.get("search") || "", [searchParams]);

  const updateSearchParams = useCallback(
    (newPage: number, newLimit: number, newSearch?: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newPage > 1) params.set("page", newPage.toString());
      else params.delete("page");

      if (newLimit !== 10) params.set("limit", newLimit.toString());
      else params.delete("limit");

      if (newSearch !== undefined) {
        if (newSearch.trim() !== "") params.set("search", newSearch.trim());
        else params.delete("search");
      }

      router.push(`/dashboard/vouchers?${params.toString()}`);
    },
    [searchParams, router]
  );

  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearchParams(1, limit, debouncedSearch);
    }
  }, [debouncedSearch, search, limit, updateSearchParams]);

  const { vouchers, pagination, isLoading, mutate } = useVouchers({
    search,
    page,
    limit,
    fallbackData: initialData,
  });

  // dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [voucherToEdit, setVoucherToEdit] = useState<Voucher | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState<Voucher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle empty page after deletion or invalid page number
  useEffect(() => {
    if (!isLoading && pagination.totalPages > 0) {
      if (page > pagination.totalPages) {
        updateSearchParams(pagination.totalPages, limit);
        return;
      }
      if (vouchers.length === 0 && page > 1) {
        const targetPage = Math.min(page - 1, pagination.totalPages);
        updateSearchParams(targetPage, limit);
      }
    }
  }, [
    vouchers.length,
    pagination.totalPages,
    page,
    limit,
    isLoading,
    updateSearchParams,
  ]);

  const openCreate = () => {
    setFormMode("create");
    setVoucherToEdit(null);
    setIsFormOpen(true);
  };

  const handleEdit = useCallback(
    (voucher: Voucher) => {
      if (!canUpdate) {
        toast.error("Permission denied", {
          description: "Bạn không có quyền cập nhật voucher.",
        });
        return;
      }
      setFormMode("edit");
      setVoucherToEdit(voucher);
      setIsFormOpen(true);
    },
    [canUpdate]
  );

  const handleDeleteClick = useCallback(
    (voucher: Voucher) => {
      if (!canDelete) {
        toast.error("Permission denied", {
          description: "Bạn không có quyền xóa voucher.",
        });
        return;
      }
      setVoucherToDelete(voucher);
      setIsDeleteOpen(true);
    },
    [canDelete]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!voucherToDelete) return;
    try {
      setIsDeleting(true);
      const result = await deleteVoucher(voucherToDelete.id);
      if (!result.ok) throw new Error(result.message);

      toast.success("Xóa voucher thành công!", {
        description: `Voucher ${voucherToDelete.code} đã được xóa.`,
      });
      setIsDeleteOpen(false);
      setVoucherToDelete(null);
      await mutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể xóa voucher";
      toast.error("Xóa voucher thất bại", { description: msg });
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [voucherToDelete, mutate]);

  const handleSubmitVoucher = useCallback(
    async (input: VoucherInput) => {
      if (formMode === "create" && !canCreate) {
        throw new Error("Bạn không có quyền tạo voucher.");
      }
      if (formMode === "edit" && !canUpdate) {
        throw new Error("Bạn không có quyền cập nhật voucher.");
      }
      const action =
        formMode === "create"
          ? createVoucher(input)
          : voucherToEdit
            ? updateVoucher(voucherToEdit.id, input)
            : Promise.resolve({ ok: false as const, message: "Thiếu voucher để sửa" });

      const result = await action;
      if (!result.ok) {
        throw new Error(result.message);
      }
      toast.success(
        formMode === "create" ? "Tạo voucher thành công!" : "Cập nhật voucher thành công!"
      );
      await mutate();
    },
    [formMode, voucherToEdit, mutate, canCreate, canUpdate]
  );

  const handleToggleActive = useCallback(
    async (voucher: Voucher, isActive: boolean) => {
      try {
        if (!canUpdate) {
          throw new Error("Bạn không có quyền cập nhật voucher.");
        }
        const result = await toggleVoucherActive(voucher.id, isActive);
        if (!result.ok) throw new Error(result.message);
        await mutate();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Không thể cập nhật trạng thái";
        toast.error("Cập nhật thất bại", { description: msg });
        throw err;
      }
    },
    [mutate, canUpdate]
  );

  const columns = useMemo(
    () =>
      createVoucherColumns({
        onEdit: canUpdate ? handleEdit : () => { },
        onDelete: canDelete ? handleDeleteClick : () => { },
        onToggleActive: handleToggleActive,
      }),
    [handleEdit, handleDeleteClick, handleToggleActive, canUpdate, canDelete]
  );

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý voucher</h1>
          <p className="text-muted-foreground text-sm">
            Tạo, chỉnh sửa và theo dõi các voucher khuyến mãi
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate} className="gap-2">
            <IconPlus className="size-4" />
            Tạo voucher
          </Button>
        ) : null}
      </div>

      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={vouchers}
          searchKey="Mã"
          searchPlaceholder="Tìm theo mã hoặc tên voucher..."
          emptyMessage="Không tìm thấy voucher."
          entityName="voucher"
          getRowId={(row) => (row as Voucher).id}
          fetchData={async () => {
            await mutate();
          }}
          isLoading={isLoading}
          serverPagination={pagination}
          onPageChange={(newPage) => updateSearchParams(newPage, limit, search)}
          onLimitChange={(newLimit) => updateSearchParams(1, newLimit, search)}
          serverSearch={localSearch}
          onSearchChange={setLocalSearch}
        />
      </div>

      {
        isFormOpen && (
          <VoucherFormDialog
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            mode={formMode}
            initialVoucher={voucherToEdit}
            onSubmitVoucher={handleSubmitVoucher}
          />
        )
      }

      {
        isDeleteOpen && (<DeleteVoucherDialog
          open={isDeleteOpen}
          onOpenChange={(open) => {
            setIsDeleteOpen(open);
            if (!open) setVoucherToDelete(null);
          }}
          voucher={voucherToDelete}
          onConfirm={handleConfirmDelete}
          isSubmitting={isDeleting}
        />)
      }
    </div>
  );
}

