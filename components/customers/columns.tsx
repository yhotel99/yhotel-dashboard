import { ColumnDef } from "@tanstack/react-table";
import type { Customer } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import { ActionsCell } from "./actions-cell";

export function createColumns(
  onEdit: (customer: Customer) => void,
  onViewDetail?: (customer: Customer) => void
): ColumnDef<Customer>[] {
  return [
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
      cell: ({ row }) => (
        <ActionsCell
          customer={row.original}
          onEdit={onEdit}
          onViewDetail={onViewDetail}
        />
      ),
      size: 60,
      minSize: 40,
    },
  ];
}
