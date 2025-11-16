import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/hooks/use-bookings";
import { BOOKING_STATUS, bookingStatusLabels } from "@/lib/constants";

export const BOOKING_STATUS_VALUES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.AWAITING_PAYMENT,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN,
  BOOKING_STATUS.CHECKED_OUT,
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.NO_SHOW,
  BOOKING_STATUS.REFUNDED,
] as const satisfies readonly BookingStatus[];

export const statusStyle: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  [BOOKING_STATUS.PENDING]: {
    label: bookingStatusLabels[BOOKING_STATUS.PENDING],
    className: "text-amber-600 dark:text-amber-400",
  },
  [BOOKING_STATUS.AWAITING_PAYMENT]: {
    label: bookingStatusLabels[BOOKING_STATUS.AWAITING_PAYMENT],
    className: "text-amber-700 dark:text-amber-300",
  },
  [BOOKING_STATUS.CONFIRMED]: {
    label: bookingStatusLabels[BOOKING_STATUS.CONFIRMED],
    className: "text-blue-600 dark:text-blue-400",
  },
  [BOOKING_STATUS.CHECKED_IN]: {
    label: bookingStatusLabels[BOOKING_STATUS.CHECKED_IN],
    className: "text-green-600 dark:text-green-400",
  },
  [BOOKING_STATUS.CHECKED_OUT]: {
    label: bookingStatusLabels[BOOKING_STATUS.CHECKED_OUT],
    className: "text-emerald-600 dark:text-emerald-400",
  },
  [BOOKING_STATUS.COMPLETED]: {
    label: bookingStatusLabels[BOOKING_STATUS.COMPLETED],
    className: "text-primary",
  },
  [BOOKING_STATUS.CANCELLED]: {
    label: bookingStatusLabels[BOOKING_STATUS.CANCELLED],
    className: "text-red-600 dark:text-red-400",
  },
  [BOOKING_STATUS.NO_SHOW]: {
    label: bookingStatusLabels[BOOKING_STATUS.NO_SHOW],
    className: "text-zinc-500 dark:text-zinc-400",
  },
  [BOOKING_STATUS.REFUNDED]: {
    label: bookingStatusLabels[BOOKING_STATUS.REFUNDED],
    className: "text-purple-600 dark:text-purple-400",
  },
};

export const statusOptions: Record<BookingStatus, string> = bookingStatusLabels;

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
