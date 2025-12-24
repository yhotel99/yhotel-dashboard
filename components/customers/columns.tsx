import { ColumnDef } from "@tanstack/react-table";
import type { Customer } from "@/lib/types";
import { formatCurrency, formatDateOnly } from "@/lib/functions";
import { StatusBadge } from "./status-badge";
import { ActionsCell } from "./actions-cell";
import { customerSourceLabels } from "@/lib/constants";

export function createColumns(
  onEdit: (customer: Customer) => void,
  onViewDetail?: (customer: Customer) => void,
  onViewBookings?: (customer: Customer) => void
): ColumnDef<Customer>[] {
  return [
    {
      accessorKey: "full_name",
      header: "Họ tên",
      enableHiding: false,
      size: 150,
      minSize: 140,
    },
    {
      accessorKey: "phone",
      header: "SĐT",
      cell: ({ row }) => row.original.phone ?? "-",
      size: 90,
      minSize: 70,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-blue-700 underline cursor-pointer">
          {row.original.email}
        </span>
      ),
      size: 160,
      minSize: 140,
    },
    {
      accessorKey: "total_bookings",
      header: "Số đơn",
      cell: ({ row }) => <span>{row.original.total_bookings ?? 0} lần</span>,
      size: 70,
      minSize: 60,
    },
    {
      accessorKey: "total_spent",
      header: "Tổng chi tiêu",
      cell: ({ row }) => {
        const total = row.original.total_spent ?? 0;
        return <span>{formatCurrency(total)}</span>;
      },
      size: 100,
      minSize: 90,
    },
    {
      accessorKey: "created_at",
      header: "Ngày đăng ký",
      cell: ({ row }) => formatDateOnly(row.original.created_at),
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: "customer_type",
      header: "Loại khách hàng",
      cell: ({ row }) => (
        <StatusBadge customerType={row.original.customer_type} />
      ),
      size: 120,
      minSize: 80,
    },
    {
      accessorKey: "source",
      header: "Nguồn",
      cell: ({ row }) => {
        return (
          customerSourceLabels[
            row.original.source as keyof typeof customerSourceLabels
          ] ?? "-"
        );
      },
      size: 70,
      minSize: 60,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <ActionsCell
          customer={row.original}
          onEdit={onEdit}
          onViewDetail={onViewDetail}
          onViewBookings={onViewBookings}
        />
      ),
      size: 40,
      minSize: 40,
      maxSize: 50,
    },
  ];
}
