"use client";

import * as React from "react";
import { IconPlus } from "@tabler/icons-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useCustomers, type Customer } from "@/hooks/use-customers";
import { useDebounce } from "@/hooks/use-debounce";
import { createColumns } from "@/components/customers/columns";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog";
import { DeleteCustomerDialog } from "@/components/customers/delete-customer-dialog";
import { toast } from "sonner";

export default function CustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = React.useState("");
  const [openCreateDialog, setOpenCreateDialog] = React.useState(false);
  const [openEditDialog, setOpenEditDialog] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(
    null
  );
  const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
  const [customerToDelete, setCustomerToDelete] =
    React.useState<Customer | null>(null);

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
      router.push(`/dashboard/customers?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Sync local search with URL search
  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Debounce search
  const debouncedSearch = useDebounce(localSearch, 500);

  React.useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearchParams(1, limit, debouncedSearch);
    }
  }, [debouncedSearch, search, limit, updateSearchParams]);

  const {
    customers,
    isLoading,
    pagination,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  } = useCustomers(page, limit, search);

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setOpenEditDialog(true);
  };

  const handleUpdateCustomer = async (
    id: string,
    input: Parameters<typeof updateCustomer>[1]
  ) => {
    try {
      await updateCustomer(id, input);
      toast.success("Cập nhật khách hàng thành công!", {
        description: `Khách hàng ${input.full_name} đã được cập nhật thành công.`,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể cập nhật khách hàng";
      toast.error("Cập nhật khách hàng thất bại", {
        description: errorMessage,
      });
      throw err;
    }
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;

    try {
      await deleteCustomer(customerToDelete.id);
      toast.success("Khóa khách hàng thành công!", {
        description: `Khách hàng ${customerToDelete.full_name} đã được khóa thành công.`,
      });
      setOpenDeleteDialog(false);
      setCustomerToDelete(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể khóa khách hàng";
      toast.error("Khóa khách hàng thất bại", {
        description: errorMessage,
      });
      throw err;
    }
  };

  const handleCreateCustomer = async (
    input: Parameters<typeof createCustomer>[0]
  ) => {
    try {
      await createCustomer(input);
      toast.success("Tạo khách hàng thành công!", {
        description: `Khách hàng ${input.full_name} đã được tạo thành công.`,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể tạo khách hàng";
      toast.error("Tạo khách hàng thất bại", {
        description: errorMessage,
      });
      throw err;
    }
  };

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý khách hàng</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi thông tin khách hàng sử dụng hệ thống
          </p>
        </div>
        <Button className="gap-2" onClick={() => setOpenCreateDialog(true)}>
          <IconPlus className="size-4" />
          Thêm khách hàng
        </Button>
      </div>
      <div className="px-4 lg:px-6">
        <DataTable
          columns={createColumns(handleEditCustomer)}
          data={customers}
          searchKey="full_name"
          searchPlaceholder="Tìm kiếm theo tên, SĐT hoặc email..."
          emptyMessage="Không tìm thấy khách hàng nào."
          entityName="khách hàng"
          getRowId={(row) => row.id}
          fetchData={() => fetchCustomers(page, limit, search)}
          isLoading={isLoading}
          serverPagination={pagination}
          onPageChange={(newPage) => updateSearchParams(newPage, limit, search)}
          onLimitChange={(newLimit) => updateSearchParams(1, newLimit, search)}
          serverSearch={localSearch}
          onSearchChange={setLocalSearch}
        />
      </div>

      <CreateCustomerDialog
        open={openCreateDialog}
        onOpenChange={setOpenCreateDialog}
        onCreate={handleCreateCustomer}
      />

      <EditCustomerDialog
        open={openEditDialog}
        onOpenChange={(open) => {
          setOpenEditDialog(open);
          if (!open) {
            setEditingCustomer(null);
          }
        }}
        customer={editingCustomer}
        onUpdate={handleUpdateCustomer}
      />

      <DeleteCustomerDialog
        customer={customerToDelete}
        open={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
