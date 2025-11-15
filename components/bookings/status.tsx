import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/hooks/use-bookings";

export const BOOKING_STATUS_VALUES = [
  "pending",
  "awaiting_payment",
  "confirmed",
  "checked_in",
  "checked_out",
  "completed",
  "cancelled",
  "no_show",
  "refunded",
] as const satisfies readonly BookingStatus[];

export const statusStyle: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Chờ xác nhận",
    className: "text-amber-600 dark:text-amber-400",
  },
  awaiting_payment: {
    label: "Chờ thanh toán",
    className: "text-amber-700 dark:text-amber-300",
  },
  confirmed: {
    label: "Đã xác nhận",
    className: "text-blue-600 dark:text-blue-400",
  },
  checked_in: {
    label: "Đã check-in",
    className: "text-green-600 dark:text-green-400",
  },
  checked_out: {
    label: "Đã check-out",
    className: "text-emerald-600 dark:text-emerald-400",
  },
  completed: { label: "Hoàn tất", className: "text-primary" },
  cancelled: { label: "Đã hủy", className: "text-red-600 dark:text-red-400" },
  no_show: {
    label: "Không đến",
    className: "text-zinc-500 dark:text-zinc-400",
  },
  refunded: {
    label: "Đã hoàn tiền",
    className: "text-purple-600 dark:text-purple-400",
  },
};

export const statusOptions: Record<BookingStatus, string> = {
  pending: "Chờ xác nhận",
  awaiting_payment: "Chờ thanh toán",
  confirmed: "Đã xác nhận",
  checked_in: "Đã check-in",
  checked_out: "Đã check-out",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  no_show: "Không đến",
  refunded: "Đã hoàn tiền",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const config = statusStyle[status];
  return <span className={cn(config.className)}>{config.label}</span>;
}

export function StatusSelect({
  bookingId,
  currentStatus,
  onChangeStatus,
}: {
  bookingId: string;
  currentStatus: BookingStatus;
  onChangeStatus: (id: string, status: BookingStatus) => Promise<void>;
}) {
  return (
    <Select
      value={currentStatus}
      onValueChange={async (value) => {
        const status = value as BookingStatus;
        if (status !== currentStatus) {
          await onChangeStatus(bookingId, status);
        }
      }}
    >
      <SelectTrigger className="w-auto min-w-[120px] h-auto border-none shadow-none hover:bg-primary/10 px-2 py-1 gap-1">
        <StatusBadge status={currentStatus} />
      </SelectTrigger>
      <SelectContent>
        {BOOKING_STATUS_VALUES.map((value) => (
          <SelectItem key={value} value={value}>
            {statusOptions[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
