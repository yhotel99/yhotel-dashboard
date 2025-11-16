"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { IconDotsVertical, IconPlus } from "@tabler/icons-react";

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
import { usePaginationSearchParams } from "@/hooks/use-pagination-search-params";
import {
  useCustomers,
  type Customer,
  type CustomerInput,
} from "@/hooks/use-customers";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

// Status badge
function StatusBadge({
  customerType,
}: {
  customerType: Customer["customer_type"];
}) {
  const statusConfig = {
    regular: { label: "Khách thường", variant: "outline" as const },
    vip: { label: "Khách VIP", variant: "default" as const },
    blacklist: { label: "Danh sách đen", variant: "destructive" as const },
  };
  const config = statusConfig[customerType];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Actions
function ActionsCell({
  customer,
  onEdit,
}: {
  customer: Customer;
  onEdit: (customer: Customer) => void;
}) {
  const router = useRouter();
  return (
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
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() =>
            router.push(`/dashboard/customers/${customer.id}/bookings`)
          }
        >
          Xem chi tiết
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(customer)}>
          Chỉnh sửa
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          Khóa khách hàng
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Columns
const createColumns = (
  onEdit: (customer: Customer) => void
): ColumnDef<Customer>[] => [
  {
    accessorKey: "full_name",
    header: "Họ tên",
    enableHiding: false,
    size: 150,
    minSize: 130,
  },
  {
    accessorKey: "phone",
    header: "SĐT",
    cell: ({ row }) => row.original.phone ?? "-",
    size: 100,
    minSize: 80,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-blue-700 underline cursor-pointer">
        {row.original.email}
      </span>
    ),
    size: 180,
    minSize: 150,
  },
  {
    accessorKey: "total_bookings",
    header: "Số đơn",
    cell: ({ row }) => <span>{row.original.total_bookings ?? 0} lần</span>,
    size: 80,
    minSize: 60,
  },
  {
    accessorKey: "total_spent",
    header: "Tổng chi tiêu",
    cell: ({ row }) => {
      const total = row.original.total_spent ?? 0;
      return <span>{formatCurrency(total)}</span>;
    },
    size: 120,
    minSize: 100,
  },
  {
    accessorKey: "created_at",
    header: "Ngày đăng ký",
    cell: ({ row }) => formatDate(row.original.created_at),
    size: 150,
    minSize: 130,
  },
  {
    accessorKey: "customer_type",
    header: "Loại khách hàng",
    cell: ({ row }) => (
      <StatusBadge customerType={row.original.customer_type} />
    ),
    size: 100,
    minSize: 80,
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell customer={row.original} onEdit={onEdit} />,
    size: 60,
    minSize: 40,
  },
];

export default function CustomersPage() {
  const {
    page,
    limit,
    search,
    localSearch,
    setLocalSearch,
    updateSearchParams,
  } = usePaginationSearchParams();

  const {
    customers,
    isLoading,
    pagination,
    fetchCustomers,
    createCustomer,
    updateCustomer,
  } = useCustomers(page, limit, search);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  const handleOpenCreateDialog = () => {
    setIsCreateDialogOpen(true);
  };

  const handleEdit = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditDialogOpen(true);
  }, []);

  const handleCreateCustomer = useCallback(
    async (input: CustomerInput) => {
      try {
        await createCustomer(input);
        toast.success("Tạo khách hàng thành công!", {
          description: "Khách hàng mới đã được thêm vào hệ thống.",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Không thể tạo khách hàng";
        toast.error("Tạo khách hàng thất bại", { description: message });
        throw error;
      }
    },
    [createCustomer]
  );

  const handleUpdateCustomer = useCallback(
    async (id: string, input: CustomerInput) => {
      try {
        await updateCustomer(id, input);
        toast.success("Cập nhật khách hàng thành công!", {
          description: "Thông tin khách hàng đã được cập nhật.",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Không thể cập nhật khách hàng";
        toast.error("Cập nhật khách hàng thất bại", { description: message });
        throw error;
      }
    },
    [updateCustomer]
  );

  const columns = useMemo(() => createColumns(handleEdit), [handleEdit]);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý khách hàng</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi thông tin khách hàng sử dụng hệ thống
          </p>
        </div>
        <Button className="gap-2" onClick={handleOpenCreateDialog}>
          <IconPlus className="size-4" />
          Thêm khách hàng
        </Button>
      </div>
      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
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
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreate={handleCreateCustomer}
      />

      <EditCustomerDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setSelectedCustomer(null);
          }
        }}
        customer={selectedCustomer}
        onUpdate={handleUpdateCustomer}
      />
    </div>
  );
}
