import type { ColumnDef } from "@tanstack/react-table";
import type { Voucher } from "@/lib/types";
import { formatCurrency, formatDateOnly } from "@/lib/functions";
import { Switch } from "@/components/ui/switch";
import { VoucherActionsCell } from "./voucher-actions-cell";
import { cn } from "@/lib/utils";

export const VOUCHERS_COLUMNS = {
  CODE: { accessorKey: "Mã", header: "Mã" },
  NAME: { accessorKey: "Tên", header: "Tên" },
  DISCOUNT: { accessorKey: "Giảm", header: "Giảm" },
  VALIDITY: { accessorKey: "Hiệu lực", header: "Hiệu lực" },
  ACTIVE: { accessorKey: "Kích hoạt", header: "Kích hoạt" },
  ACTIONS: { accessorKey: "Hành động", header: "" },
} as const;

export function createVoucherColumns({
  onEdit,
  onDelete,
  onToggleActive,
}: {
  onEdit: (voucher: Voucher) => void;
  onDelete: (voucher: Voucher) => void;
  onToggleActive: (voucher: Voucher, isActive: boolean) => void;
}): ColumnDef<Voucher>[] {
  return [
    {
      accessorKey: VOUCHERS_COLUMNS.CODE.accessorKey,
      header: VOUCHERS_COLUMNS.CODE.header,
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.code}</span>
      ),
      size: 110,
      minSize: 90,
    },
    {
      accessorKey: VOUCHERS_COLUMNS.NAME.accessorKey,
      header: VOUCHERS_COLUMNS.NAME.header,
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{row.original.name}</div>
          {row.original.description ? (
            <div className="text-xs text-muted-foreground truncate">
              {row.original.description}
            </div>
          ) : null}
        </div>
      ),
      size: 180,
      minSize: 140,
    },
    {
      accessorKey: VOUCHERS_COLUMNS.DISCOUNT.accessorKey,
      header: VOUCHERS_COLUMNS.DISCOUNT.header,
      cell: ({ row }) => {
        const v = row.original;
        const text =
          v.discount_type === "percent"
            ? `${v.discount_value}%`
            : formatCurrency(v.discount_value);
        return (
          <span
            className={cn(
              "rounded border px-2 py-1 text-xs font-medium",
              "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-300"
            )}
          >
            {text}
          </span>
        );
      },
      size: 90,
      minSize: 80,
      maxSize: 110,
    },
    {
      accessorKey: VOUCHERS_COLUMNS.VALIDITY.accessorKey,
      header: VOUCHERS_COLUMNS.VALIDITY.header,
      cell: ({ row }) => {
        const { start_at, end_at } = row.original;
        if (!start_at && !end_at) return "-";
        const start = start_at ? formatDateOnly(start_at) : "—";
        const end = end_at ? formatDateOnly(end_at) : "—";
        return (
          <div className="text-sm">
            <div>
              {start} → {end}
            </div>
          </div>
        );
      },
      size: 130,
      minSize: 120,
    },
    {
      accessorKey: VOUCHERS_COLUMNS.ACTIVE.accessorKey,
      header: VOUCHERS_COLUMNS.ACTIVE.header,
      cell: ({ row }) => {
        const v = row.original;
        return (
          <div className="flex items-center">
            <Switch
              checked={v.is_active}
              onCheckedChange={(checked) => onToggleActive(v, checked)}
              aria-label={`Bật/tắt voucher ${v.code}`}
            />
          </div>
        );
      },
      size: 70,
      minSize: 60,
      maxSize: 80,
    },
    {
      id: "actions",
      accessorKey: VOUCHERS_COLUMNS.ACTIONS.accessorKey,
      header: VOUCHERS_COLUMNS.ACTIONS.header,
      cell: ({ row }) => (
        <VoucherActionsCell
          voucher={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
      size: 50,
      minSize: 40,
      maxSize: 60,
    },
  ];
}

