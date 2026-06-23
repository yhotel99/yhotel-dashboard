"use client";

import {
  Briefcase,
  CalendarDays,
  Clock,
  Loader2,
  Moon,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  type CellEditMode,
  type RejectTarget,
  type ShiftCellDetail,
  ShiftTime,
  RequestStatus,
  REQUEST_STATUS_LABELS,
  OFF_TYPE_LABELS,
  OffType,
} from "@/types/hr-shifts";
import {
  DEFAULT_IN,
  DEFAULT_OUT,
  TIME_OPTIONS,
  canAddCustomShiftOnDate,
  formatDateLabel,
  formatShiftTimeRange,
} from "@/lib/hr-shift-utils";
import { cn } from "@/lib/utils";

const HOLIDAY_TYPE_LABELS: Record<string, string> = {
  NATIONAL: "Ngày lễ quốc gia",
  COMPANY: "Ngày lễ công ty",
  REGIONAL: "Ngày lễ địa phương",
};

const STATUS_BADGE: Record<
  RequestStatus,
  { className: string; dot: string }
> = {
  [RequestStatus.PENDING]: {
    className: "bg-amber-50 text-amber-900 border-amber-200",
    dot: "bg-amber-500",
  },
  [RequestStatus.APPROVED]: {
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  [RequestStatus.REJECTED]: {
    className: "bg-red-50 text-red-800 border-red-200",
    dot: "bg-red-500",
  },
};

interface EditForm {
  shift: ShiftTime;
  startTime: string;
  endTime: string;
  offType: OffType;
}

interface ShiftAdminDialogsProps {
  detail: ShiftCellDetail | null;
  detailOpen: boolean;
  cellEditMode: CellEditMode;
  editingRegId: string | null;
  editForm: EditForm;
  cellActionLoading: boolean;
  actionLoadingId: string | null;
  rejectTarget: RejectTarget | null;
  rejectReason: string;
  onDetailOpenChange: (open: boolean) => void;
  onEditFormChange: (form: EditForm) => void;
  onCellEditModeChange: (mode: CellEditMode) => void;
  onEditingRegIdChange: (id: string | null) => void;
  onSaveEdit: () => void;
  onApprove: (id: string) => void;
  onRejectOpen: (id: string) => void;
  onRejectTargetChange: (target: RejectTarget | null) => void;
  onRejectReasonChange: (reason: string) => void;
  onConfirmReject: () => void;
}

function DetailContextCard({ detail }: { detail: ShiftCellDetail }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <User className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{detail.user.name}</p>
          <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
            <Briefcase className="size-3 shrink-0" />
            {detail.user.department || "—"}
          </p>
        </div>
      </div>
      <Separator />
      <div className="flex items-center gap-2 text-sm">
        <CalendarDays className="size-4 text-muted-foreground shrink-0" />
        <span>{formatDateLabel(detail.date)}</span>
      </div>
    </div>
  );
}

function ShiftTypeToggle({
  value,
  onChange,
}: {
  value: ShiftTime;
  onChange: (shift: ShiftTime) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/60">
      <button
        type="button"
        onClick={() => onChange(ShiftTime.CUSTOM)}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
          value === ShiftTime.CUSTOM
            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Clock className="size-4" />
        Ca làm
      </button>
      <button
        type="button"
        onClick={() => onChange(ShiftTime.OFF)}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
          value === ShiftTime.OFF
            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Moon className="size-4" />
        Ngày off
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const style = STATUS_BADGE[status];
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", style.className)}>
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      {REQUEST_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ShiftAdminDialogs({
  detail,
  detailOpen,
  cellEditMode,
  editingRegId,
  editForm,
  cellActionLoading,
  actionLoadingId,
  rejectTarget,
  rejectReason,
  onDetailOpenChange,
  onEditFormChange,
  onCellEditModeChange,
  onEditingRegIdChange,
  onSaveEdit,
  onApprove,
  onRejectOpen,
  onRejectTargetChange,
  onRejectReasonChange,
  onConfirmReject,
}: ShiftAdminDialogsProps) {
  const isEditFormValid =
    editForm.shift === ShiftTime.OFF ||
    (!!editForm.startTime && !!editForm.endTime);

  const enterEditMode = (reg: ShiftCellDetail["shifts"][0]) => {
    onCellEditModeChange("edit");
    onEditingRegIdChange(reg.id);
    onEditFormChange({
      shift: reg.shift,
      startTime:
        reg.shift === ShiftTime.CUSTOM && reg.startTime
          ? reg.startTime
          : DEFAULT_IN,
      endTime:
        reg.shift === ShiftTime.CUSTOM && reg.endTime
          ? reg.endTime
          : DEFAULT_OUT,
      offType: reg.offType || OffType.OFF_PN,
    });
  };

  const enterAddMode = () => {
    onEditingRegIdChange(null);
    onCellEditModeChange("add");
    onEditFormChange({
      shift: ShiftTime.CUSTOM,
      startTime: DEFAULT_IN,
      endTime: DEFAULT_OUT,
      offType: OffType.OFF_PN,
    });
  };

  const closeDetail = () => {
    onDetailOpenChange(false);
    onCellEditModeChange("view");
    onEditingRegIdChange(null);
  };

  const isEditing = cellEditMode === "edit" || cellEditMode === "add";
  const title = isEditing
    ? cellEditMode === "edit"
      ? "Đổi lịch"
      : "Thêm ca"
    : "Chi tiết ca làm việc";
  const description = isEditing
    ? cellEditMode === "edit"
      ? "Cập nhật giờ làm hoặc loại ngày off cho nhân viên."
      : "Thêm ca mới — sẽ được duyệt tự động."
    : "Xem và xử lý đăng ký ca trong ngày.";

  const customShiftCount =
    detail?.shifts.filter((r) => r.shift === ShiftTime.CUSTOM).length ?? 0;

  return (
    <>
      <Dialog
        open={detailOpen && !!detail}
        onOpenChange={(open) => {
          if (!open) closeDetail();
          else onDetailOpenChange(open);
        }}
      >
        <DialogContent className="sm:max-w-[480px] gap-0 p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {detail ? (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 space-y-1.5">
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
                {detail.holiday ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                    <p className="font-semibold text-amber-950 text-sm">
                      🎉 {detail.holiday.name}
                    </p>
                    <p className="text-amber-800/80 text-xs mt-1">
                      {HOLIDAY_TYPE_LABELS[detail.holiday.type] ??
                        detail.holiday.type}
                      {detail.holiday.isRecurring ? " • Lặp lại hàng năm" : ""}
                    </p>
                  </div>
                ) : null}

                <DetailContextCard detail={detail} />

                {isEditing ? (
                  <div className="space-y-4">
                    <ShiftTypeToggle
                      value={editForm.shift}
                      onChange={(shift) =>
                        onEditFormChange({ ...editForm, shift })
                      }
                    />

                    {editForm.shift === ShiftTime.OFF ? (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Loại ngày off
                        </Label>
                        <Select
                          value={editForm.offType}
                          onValueChange={(v) =>
                            onEditFormChange({
                              ...editForm,
                              offType: v as OffType,
                            })
                          }
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(OFF_TYPE_LABELS).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Giờ vào
                          </Label>
                          <Select
                            value={editForm.startTime}
                            onValueChange={(v) =>
                              onEditFormChange({ ...editForm, startTime: v })
                            }
                          >
                            <SelectTrigger className="h-11">
                              <Clock className="size-4 text-muted-foreground mr-2 shrink-0" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Giờ ra
                          </Label>
                          <Select
                            value={editForm.endTime}
                            onValueChange={(v) =>
                              onEditFormChange({ ...editForm, endTime: v })
                            }
                          >
                            <SelectTrigger className="h-11">
                              <Clock className="size-4 text-muted-foreground mr-2 shrink-0" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                ) : detail.shifts.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-10 text-center">
                    <Clock className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Chưa đăng ký ca cho ngày này.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detail.shifts.map((reg, idx) => (
                      <div
                        key={reg.id}
                        className="rounded-xl border bg-card p-4 space-y-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              {reg.shift === ShiftTime.OFF
                                ? "Ngày off"
                                : customShiftCount > 1
                                  ? `Ca ${idx + 1}`
                                  : "Ca làm việc"}
                            </p>
                            <p className="font-semibold text-base mt-1">
                              {reg.shift === ShiftTime.OFF
                                ? reg.offType
                                  ? OFF_TYPE_LABELS[reg.offType as OffType]
                                  : "Ngày off"
                                : formatShiftTimeRange(reg)}
                            </p>
                          </div>
                          <StatusBadge status={reg.status} />
                        </div>

                        {reg.reason ? (
                          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                            <span className="text-muted-foreground text-xs block mb-0.5">
                              Lý do đăng ký
                            </span>
                            {reg.reason}
                          </div>
                        ) : null}

                        {reg.rejectionReason ? (
                          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-800">
                            <span className="text-red-600/80 text-xs block mb-0.5">
                              Lý do từ chối
                            </span>
                            {reg.rejectionReason}
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-2 pt-1">
                          {reg.status === RequestStatus.PENDING ? (
                            <>
                              <Button
                                size="sm"
                                className="flex-1 min-w-[100px]"
                                disabled={actionLoadingId === reg.id}
                                onClick={() => onApprove(reg.id)}
                              >
                                Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 min-w-[100px]"
                                disabled={actionLoadingId === reg.id}
                                onClick={() => onRejectOpen(reg.id)}
                              >
                                Từ chối
                              </Button>
                            </>
                          ) : null}
                          <Button
                            size="sm"
                            variant="secondary"
                            className={cn(
                              reg.status === RequestStatus.PENDING
                                ? "w-full"
                                : "flex-1"
                            )}
                            onClick={() => enterEditMode(reg)}
                          >
                            Đổi lịch
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="px-6 py-4 border-t bg-muted/20 sm:justify-between gap-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      disabled={cellActionLoading}
                      onClick={() => onCellEditModeChange("view")}
                    >
                      Hủy
                    </Button>
                    <Button
                      disabled={cellActionLoading || !isEditFormValid}
                      onClick={onSaveEdit}
                      className="min-w-[120px]"
                    >
                      {cellActionLoading ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-2" />
                          Đang lưu...
                        </>
                      ) : (
                        "Lưu thay đổi"
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={closeDetail}>
                      Đóng
                    </Button>
                    {detail.shifts.length === 0 ? (
                      <Button onClick={enterAddMode}>Thêm ca</Button>
                    ) : canAddCustomShiftOnDate(detail.shifts, detail.date) ? (
                      <Button onClick={enterAddMode}>Thêm ca 2</Button>
                    ) : null}
                  </>
                )}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            onRejectTargetChange(null);
            onRejectReasonChange("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Từ chối đăng ký ca</DialogTitle>
            <DialogDescription>
              {rejectTarget?.type === "single"
                ? "Nhân viên sẽ thấy lý do từ chối trên app HR."
                : "Lý do này áp dụng cho tất cả đăng ký đang chờ trong tuần."}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-2">
            <Textarea
              value={rejectReason}
              onChange={(e) => onRejectReasonChange(e.target.value)}
              placeholder="Ví dụ: Thiếu thông tin, không đúng quy định..."
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted/20">
            <Button
              variant="outline"
              onClick={() => {
                onRejectTargetChange(null);
                onRejectReasonChange("");
              }}
            >
              Hủy
            </Button>
            <Button variant="destructive" onClick={onConfirmReject}>
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
