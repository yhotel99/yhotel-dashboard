"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  type ShiftCellDetail,
  ShiftTime,
  REQUEST_STATUS_LABELS,
  OFF_TYPE_LABELS,
  OffType,
} from "@/types/hr-shifts";
import { formatShiftTimeRange } from "@/lib/hr-shift-utils";

const HOLIDAY_TYPE_LABELS: Record<string, string> = {
  NATIONAL: "Ngày lễ quốc gia",
  COMPANY: "Ngày lễ công ty",
  REGIONAL: "Ngày lễ địa phương",
};

function formatDetailDate(date: Date): string {
  const days = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];
  return `${days[date.getDay()]}, ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

interface ShiftCellDetailProps {
  detail: ShiftCellDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShiftCellDetailDialog({
  detail,
  open,
  onOpenChange,
}: ShiftCellDetailProps) {
  if (!detail) return null;

  const { user, date, shifts, holiday } = detail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết ca làm việc</DialogTitle>
        </DialogHeader>

        {holiday ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="font-semibold text-amber-900">{holiday.name}</p>
            <p className="text-xs text-amber-800 mt-1">
              {HOLIDAY_TYPE_LABELS[holiday.type] ?? holiday.type}
              {holiday.isRecurring ? " • Lặp lại hàng năm" : ""}
            </p>
            {holiday.description ? (
              <p className="text-xs text-amber-700 mt-1 italic">
                {holiday.description}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2 text-sm">
          <p>
            <span className="font-medium text-muted-foreground">Nhân viên:</span>{" "}
            {user.name}
          </p>
          <p>
            <span className="font-medium text-muted-foreground">Phòng ban:</span>{" "}
            {user.department || "—"}
          </p>
          <p>
            <span className="font-medium text-muted-foreground">Ngày:</span>{" "}
            {formatDetailDate(date)}
          </p>
        </div>

        {shifts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Chưa đăng ký ca cho ngày này.
          </p>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift, index) => (
              <div
                key={shift.id}
                className="rounded-lg border p-3 space-y-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {shift.shift === ShiftTime.OFF
                      ? "Ngày off"
                      : `Ca ${index + 1}`}
                  </span>
                  <Badge
                    variant={
                      shift.status === "APPROVED"
                        ? "default"
                        : shift.status === "PENDING"
                          ? "secondary"
                          : "destructive"
                    }
                    className={
                      shift.status === "APPROVED"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : shift.status === "PENDING"
                          ? "bg-amber-100 text-amber-900 border-amber-200"
                          : ""
                    }
                  >
                    {REQUEST_STATUS_LABELS[shift.status]}
                  </Badge>
                </div>

                {shift.shift === ShiftTime.OFF && shift.offType ? (
                  <p>
                    <span className="text-muted-foreground">Loại off:</span>{" "}
                    {OFF_TYPE_LABELS[shift.offType as OffType] ?? shift.offType}
                  </p>
                ) : (
                  <p>
                    <span className="text-muted-foreground">Giờ:</span>{" "}
                    {formatShiftTimeRange(shift)}
                  </p>
                )}

                {shift.reason ? (
                  <p>
                    <span className="text-muted-foreground">Lý do đăng ký:</span>{" "}
                    {shift.reason}
                  </p>
                ) : null}

                {shift.rejectionReason ? (
                  <p className="text-red-700">
                    <span className="font-medium">Lý do từ chối:</span>{" "}
                    {shift.rejectionReason}
                  </p>
                ) : null}

                {shift.note ? (
                  <p>
                    <span className="text-muted-foreground">Ghi chú:</span>{" "}
                    {shift.note}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
