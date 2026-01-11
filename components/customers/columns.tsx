import { ColumnDef } from "@tanstack/react-table";
import type { Customer } from "@/lib/types";
import { formatCurrency, formatDateOnly } from "@/lib/functions";
import { StatusBadge } from "./status-badge";
import { ActionsCell } from "./actions-cell";
import { customerSourceLabels } from "@/lib/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export function createColumns(
  onEdit: (customer: Customer) => void,
  onViewDetail?: (customer: Customer) => void,
  onViewBookings?: (customer: Customer) => void
): ColumnDef<Customer>[] {
  return [
    {
      accessorKey: "Họ tên",
      header: "Họ tên",
      cell: ({ row }) => row.original.full_name,
      size: 150,
      minSize: 140,
    },
    {
      accessorKey: "Số điện thoại",
      header: "SĐT",
      cell: ({ row }) => row.original.phone ?? "-",
      size: 90,
      minSize: 70,
    },
    {
      accessorKey: "Email",
      header: "Email",
      cell: ({ row }) => {
        const email = row.original.email;
        if (!email) return "-";

        const handleCopy = (e: React.MouseEvent) => {
          e.stopPropagation();
          navigator.clipboard.writeText(email);
          toast.success("Đã sao chép email!");
        };

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex items-center justify-between gap-1.5 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                onClick={handleCopy}
              >
                <span className="text-blue-700 underline truncate">
                  {email}
                </span>
                <Copy className="size-3 text-muted-foreground shrink-0" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col gap-1">
                <p>{email}</p>
                <p className="text-[10px] text-muted-foreground">Click để sao chép</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
      size: 160,
      minSize: 140,
    },
    {
      accessorKey: "Số đơn",
      header: "Số đơn",
      cell: ({ row }) => <span>{row.original.total_bookings ?? 0} lần</span>,
      size: 70,
      minSize: 60,
    },
    {
      accessorKey: "Tổng chi tiêu",
      header: "Tổng chi tiêu",
      cell: ({ row }) => {
        const total = row.original.total_spent ?? 0;
        return <span>{formatCurrency(total)}</span>;
      },
      size: 100,
      minSize: 90,
    },
    {
      accessorKey: "Tổng hoàn tiền",
      header: "Tổng hoàn tiền",
      cell: ({ row }) => {
        const total = row.original.total_refunded ?? 0;
        return <span className="text-red-600">{formatCurrency(total)}</span>;
      },
      size: 100,
      minSize: 90,
    },
    {
      accessorKey: "Ngày đăng ký",
      header: "Ngày đăng ký",
      cell: ({ row }) => formatDateOnly(row.original.created_at),
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: "Loại khách hàng",
      header: "Loại khách hàng",
      cell: ({ row }) => (
        <StatusBadge customerType={row.original.customer_type} />
      ),
      size: 120,
      minSize: 80,
    },
    {
      accessorKey: "Nguồn",
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
      id: "Hành động",
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
