"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShiftAdminGrid } from "@/components/hr-shifts/ShiftAdminGrid";
import { ShiftAdminDialogs } from "@/components/hr-shifts/ShiftAdminDialogs";
import { exportToCSV } from "@/lib/hr-export";
import { getAdminBranchId } from "@/lib/hr-branch-access";
import {
  buildNewShift,
  fetchHrShiftDataForAdmin,
  registerShift,
  updateShiftRegistration,
  updateShiftStatus,
} from "@/lib/hr-shifts-client";
import { toggleEmployeeShiftRegistrationAction } from "@/actions/hr-shifts";
import {
  formatWeekRangeLabel,
  getWeekDates,
  getWeekStart,
  isSameWeek,
  toYmdFromDate,
  toYmdFromTs,
} from "@/lib/hr-shift-utils";
import type {
  CellEditMode,
  HrShiftData,
  HrUser,
  RejectTarget,
  ShiftCellDetail,
} from "@/types/hr-shifts";
import {
  ContractType,
  EmployeeStatus,
  OffType,
  RequestStatus,
  ShiftTime,
  OFF_TYPE_LABELS,
  HrUserRole,
} from "@/types/hr-shifts";

interface ShiftsContentProps {
  initialData: HrShiftData;
  hrAdmin: HrUser;
}

export function ShiftsContent({ initialData, hrAdmin }: ShiftsContentProps) {
  const [data, setData] = useState(initialData);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [branchFilter, setBranchFilter] = useState(() =>
    getAdminBranchId(hrAdmin) ?? ""
  );
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [searchName, setSearchName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [cellDetail, setCellDetail] = useState<ShiftCellDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cellEditMode, setCellEditMode] = useState<CellEditMode>("view");
  const [editingRegId, setEditingRegId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    shift: ShiftTime.CUSTOM,
    startTime: "09:00",
    endTime: "18:00",
    offType: OffType.OFF_PN,
  });
  const [cellActionLoading, setCellActionLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [shiftRegToggleLoading, setShiftRegToggleLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchHrShiftDataForAdmin(hrAdmin);
      setData(next);
      const branchId = getAdminBranchId(hrAdmin);
      if (branchId) setBranchFilter(branchId);
    } catch {
      toast.error("Không tải được dữ liệu. Thử lại sau.");
    } finally {
      setLoading(false);
    }
  }, [hrAdmin]);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const weekDateKeys = useMemo(
    () => new Set(weekDates.map((d) => toYmdFromDate(d))),
    [weekDates]
  );

  const gridEmployees = useMemo(
    () =>
      data.users
        .filter((u) =>
          [HrUserRole.EMPLOYEE, HrUserRole.MANAGER, HrUserRole.HR].includes(
            u.role as HrUserRole
          )
        )
        .filter((u) => u.status !== EmployeeStatus.LEFT)
        .filter((u) => !departmentFilter || u.department === departmentFilter)
        .filter((u) => !branchFilter || u.branchId === branchFilter)
        .filter(
          (u) =>
            !searchName.trim() ||
            u.name.toLowerCase().includes(searchName.trim().toLowerCase())
        ),
    [data.users, departmentFilter, branchFilter, searchName]
  );

  const gridEmployeeIds = useMemo(
    () => new Set(gridEmployees.map((e) => e.id)),
    [gridEmployees]
  );

  const weekShifts = useMemo(
    () =>
      data.shifts.filter(
        (s) =>
          weekDateKeys.has(toYmdFromTs(s.date)) &&
          gridEmployeeIds.has(s.userId)
      ),
    [data.shifts, weekDateKeys, gridEmployeeIds]
  );

  const weekStats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const s of weekShifts) {
      if (s.status === RequestStatus.PENDING) pending++;
      else if (s.status === RequestStatus.APPROVED) approved++;
      else rejected++;
    }
    return { pending, approved, rejected };
  }, [weekShifts]);

  const selectedEmployeePendingCount = useMemo(() => {
    if (!selectedUserId) return 0;
    return data.shifts.filter(
      (r) =>
        r.userId === selectedUserId &&
        r.status === RequestStatus.PENDING &&
        weekDateKeys.has(toYmdFromTs(r.date))
    ).length;
  }, [selectedUserId, data.shifts, weekDateKeys]);

  const selectedEmployee = useMemo(
    () => data.users.find((u) => u.id === selectedUserId) ?? null,
    [data.users, selectedUserId]
  );

  const selectedEmployeeAnnualLeaveInYear = useMemo(() => {
    if (!selectedUserId) return [];
    const year = weekStart.getFullYear();
    return data.shifts
      .filter((r) => r.userId === selectedUserId)
      .filter((r) => new Date(r.date).getFullYear() === year)
      .filter((r) => r.shift === ShiftTime.OFF && r.offType === OffType.OFF_PN)
      .sort((a, b) => a.date - b.date);
  }, [selectedUserId, data.shifts, weekStart]);

  const departmentOptions = useMemo(
    () => data.departments.map((d) => d.name).sort(),
    [data.departments]
  );

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      await updateShiftStatus(id, RequestStatus.APPROVED);
      await loadData();
      toast.success("Đã chấp thuận.");
    } catch {
      toast.error("Cập nhật thất bại. Thử lại.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectOpen = (id: string) => {
    setRejectTarget({ type: "single", id });
    setRejectReason("");
  };

  const handleBulkAction = async (
    userId: string,
    status: RequestStatus
  ) => {
    if (status === RequestStatus.REJECTED) {
      setRejectTarget({ type: "bulk", userId });
      setRejectReason("");
      return;
    }
    const pendingInWeek = data.shifts.filter(
      (r) =>
        r.userId === userId &&
        r.status === RequestStatus.PENDING &&
        weekDateKeys.has(toYmdFromTs(r.date))
    );
    if (pendingInWeek.length === 0) return;
    setActionLoadingId(`bulk-${userId}`);
    try {
      for (const r of pendingInWeek) {
        await updateShiftStatus(r.id, status);
      }
      await loadData();
      toast.success(`Đã chấp thuận ${pendingInWeek.length} đăng ký.`);
    } catch {
      toast.error("Cập nhật thất bại. Thử lại.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim() || "Không nêu lý do";

    if (rejectTarget.type === "single") {
      setActionLoadingId(rejectTarget.id);
      try {
        await updateShiftStatus(
          rejectTarget.id,
          RequestStatus.REJECTED,
          reason
        );
        await loadData();
        toast.success("Đã từ chối.");
      } catch {
        toast.error("Cập nhật thất bại. Thử lại.");
      } finally {
        setActionLoadingId(null);
      }
    } else {
      const pendingInWeek = data.shifts.filter(
        (r) =>
          r.userId === rejectTarget.userId &&
          r.status === RequestStatus.PENDING &&
          weekDateKeys.has(toYmdFromTs(r.date))
      );
      setActionLoadingId(`bulk-${rejectTarget.userId}`);
      try {
        for (const r of pendingInWeek) {
          await updateShiftStatus(r.id, RequestStatus.REJECTED, reason);
        }
        await loadData();
        toast.success(`Đã từ chối ${pendingInWeek.length} đăng ký.`);
      } catch {
        toast.error("Cập nhật thất bại. Thử lại.");
      } finally {
        setActionLoadingId(null);
      }
    }
    setRejectTarget(null);
    setRejectReason("");
  };

  const handleSaveEdit = async () => {
    if (!cellDetail) return;
    setCellActionLoading(true);
    try {
      if (cellEditMode === "edit" && editingRegId) {
        await updateShiftRegistration(
          editingRegId,
          {
            shift: editForm.shift,
            startTime:
              editForm.shift === ShiftTime.CUSTOM ? editForm.startTime : null,
            endTime:
              editForm.shift === ShiftTime.CUSTOM ? editForm.endTime : null,
            offType:
              editForm.shift === ShiftTime.OFF ? editForm.offType : null,
          },
          { keepStatus: true }
        );
        toast.success("Đã cập nhật lịch.");
      } else if (cellEditMode === "add") {
        const newShift = buildNewShift(
          cellDetail.user.id,
          cellDetail.date,
          editForm
        );
        await registerShift(newShift, {
          initialStatus: RequestStatus.APPROVED,
        });
        toast.success("Đã thêm ca cho nhân viên.");
      }
      await loadData();
      setDetailOpen(false);
      setCellDetail(null);
      setCellEditMode("view");
      setEditingRegId(null);
    } catch {
      toast.error("Thao tác thất bại. Thử lại.");
    } finally {
      setCellActionLoading(false);
    }
  };

  const handleSetEmployeeShiftReg = async (next: boolean) => {
    const previous = data.employeeShiftRegEnabled;
    setShiftRegToggleLoading(true);
    setData((prev) => ({ ...prev, employeeShiftRegEnabled: next }));

    const result = await toggleEmployeeShiftRegistrationAction(next);
    setShiftRegToggleLoading(false);

    if (!result.ok) {
      setData((prev) => ({ ...prev, employeeShiftRegEnabled: previous }));
      toast.error(result.message);
      return;
    }

    setData((prev) => ({ ...prev, employeeShiftRegEnabled: result.enabled }));
    toast.success(
      result.enabled
        ? "Đã bật đăng ký ca cho nhân viên."
        : "Đã tắt đăng ký ca cho nhân viên."
    );
  };

  const handleExport = () => {
    if (weekShifts.length === 0) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }
    const exportData = weekShifts.map((s) => {
      const emp = data.users.find((e) => e.id === s.userId);
      return {
        "Nhân viên": emp?.name || s.userId,
        "Phòng ban": emp?.department || "",
        Ngày: new Date(s.date).toLocaleDateString("vi-VN"),
        "Loại ca":
          s.shift === ShiftTime.OFF
            ? s.offType && OFF_TYPE_LABELS[s.offType as OffType]
              ? OFF_TYPE_LABELS[s.offType as OffType]
              : "Ngày off"
            : "Ca làm việc",
        "Giờ vào": s.startTime || "",
        "Giờ ra": s.endTime || "",
        "Trạng thái":
          s.status === RequestStatus.PENDING
            ? "Chờ duyệt"
            : s.status === RequestStatus.APPROVED
              ? "Đã duyệt"
              : "Từ chối",
        "Lý do từ chối": s.rejectionReason || "",
        "Ngày tạo": new Date(s.createdAt).toLocaleDateString("vi-VN"),
      };
    });
    const weekLabel = formatWeekRangeLabel(weekStart).replace(/\s+/g, "_");
    exportToCSV(exportData, `shift_registrations_${weekLabel}_${Date.now()}.csv`);
  };

  const isCurrentWeek = isSameWeek(weekStart, new Date());
  const branchLocked = !!getAdminBranchId(hrAdmin);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý ca</h1>
          <p className="text-muted-foreground text-sm">
            Đồng bộ với HR Connect — cùng database{" "}
            <code className="text-xs">shift_registrations</code>
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="icon" onClick={() => {
                const next = new Date(weekStart);
                next.setDate(next.getDate() - 7);
                setWeekStart(getWeekStart(next));
              }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={isCurrentWeek ? "default" : "outline"}
                size="sm"
                onClick={() => setWeekStart(getWeekStart(new Date()))}
              >
                Tuần này
              </Button>
              <Button variant="outline" size="icon" onClick={() => {
                const next = new Date(weekStart);
                next.setDate(next.getDate() + 7);
                setWeekStart(getWeekStart(next));
              }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {formatWeekRangeLabel(weekStart)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex items-center gap-3 rounded-lg border px-3 py-2"
                title="Tắt: nhân viên không thể đăng ký hay đổi ca; admin vẫn chỉnh trên trang này."
              >
                <div className="min-w-0">
                  <Label
                    htmlFor="employee-shift-reg-toggle"
                    className="text-[11px] font-bold uppercase text-muted-foreground"
                  >
                    Đăng ký ca (NV)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {data.employeeShiftRegEnabled
                      ? "Nhân viên có thể đăng ký ca"
                      : "Đã khóa — chỉ admin chỉnh ca"}
                  </p>
                </div>
                <Switch
                  id="employee-shift-reg-toggle"
                  checked={data.employeeShiftRegEnabled}
                  disabled={shiftRegToggleLoading || loading}
                  onCheckedChange={handleSetEmployeeShiftReg}
                  aria-label="Bật hoặc tắt đăng ký ca cho nhân viên"
                />
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-900">
                Chờ: {weekStats.pending}
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-800">
                Đã duyệt: {weekStats.approved}
              </Badge>
              <Badge variant="outline" className="bg-red-50 text-red-800">
                Từ chối: {weekStats.rejected}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between border-t pt-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Select
                value={departmentFilter || "all"}
                onValueChange={(v) =>
                  setDepartmentFilter(v === "all" ? "" : v)
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Bộ phận" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả bộ phận</SelectItem>
                  {departmentOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={branchFilter || "all"}
                onValueChange={(v) => setBranchFilter(v === "all" ? "" : v)}
                disabled={branchLocked}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Chi nhánh" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả chi nhánh</SelectItem>
                  {data.branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Tìm theo tên..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full sm:w-[200px]"
              />
            </div>

            <Button
              variant="outline"
              disabled={loading || weekShifts.length === 0}
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Xuất CSV ({weekShifts.length})
            </Button>
          </div>
        </div>

        {selectedUserId && selectedEmployeePendingCount > 0 ? (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-sky-50 rounded-lg border border-sky-100">
            <span className="text-sm">
              <strong>{selectedEmployeePendingCount}</strong> đăng ký chờ duyệt
              của nhân viên này trong tuần.
            </span>
            <Button
              size="sm"
              disabled={actionLoadingId === `bulk-${selectedUserId}`}
              onClick={() =>
                handleBulkAction(selectedUserId, RequestStatus.APPROVED)
              }
            >
              Duyệt tất cả
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={actionLoadingId === `bulk-${selectedUserId}`}
              onClick={() =>
                handleBulkAction(selectedUserId, RequestStatus.REJECTED)
              }
            >
              Từ chối tất cả
            </Button>
          </div>
        ) : null}

        {selectedUserId &&
        selectedEmployee?.contractType !== ContractType.TRIAL ? (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
            <div className="text-sm">
              <span className="font-semibold">Nhân viên đang chọn:</span>{" "}
              {selectedEmployee?.name}
            </div>
            <div className="text-sm font-semibold text-blue-800">
              Ngày phép năm trong năm ({weekStart.getFullYear()})
            </div>
            {selectedEmployeeAnnualLeaveInYear.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Năm này chưa có đăng ký phép năm.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedEmployeeAnnualLeaveInYear.map((leave) => {
                  const leaveDate = new Date(leave.date);
                  const statusLabel =
                    leave.status === RequestStatus.APPROVED
                      ? "Đã duyệt"
                      : leave.status === RequestStatus.PENDING
                        ? "Chờ duyệt"
                        : "Từ chối";
                  return (
                    <Badge
                      key={leave.id}
                      variant="outline"
                      className={
                        leave.status === RequestStatus.APPROVED
                          ? "bg-green-100 text-green-800"
                          : leave.status === RequestStatus.PENDING
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                      }
                    >
                      {leaveDate.getDate()}/{leaveDate.getMonth() + 1} —{" "}
                      {statusLabel}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="px-4 lg:px-6">
        <ShiftAdminGrid
          employees={gridEmployees}
          shifts={weekShifts}
          weekDates={weekDates}
          holidays={data.holidays}
          selectedUserId={selectedUserId}
          actionLoadingId={actionLoadingId}
          loading={loading}
          onSelectUser={setSelectedUserId}
          onCellClick={(detail) => {
            setCellDetail(detail);
            setCellEditMode("view");
            setEditingRegId(null);
            setDetailOpen(true);
          }}
          onApprove={handleApprove}
          onReject={handleRejectOpen}
        />
      </div>

      <ShiftAdminDialogs
        detail={cellDetail}
        detailOpen={detailOpen}
        cellEditMode={cellEditMode}
        editingRegId={editingRegId}
        editForm={editForm}
        cellActionLoading={cellActionLoading}
        actionLoadingId={actionLoadingId}
        rejectTarget={rejectTarget}
        rejectReason={rejectReason}
        onDetailOpenChange={setDetailOpen}
        onEditFormChange={setEditForm}
        onCellEditModeChange={setCellEditMode}
        onEditingRegIdChange={setEditingRegId}
        onSaveEdit={handleSaveEdit}
        onApprove={handleApprove}
        onRejectOpen={handleRejectOpen}
        onRejectTargetChange={setRejectTarget}
        onRejectReasonChange={setRejectReason}
        onConfirmReject={handleConfirmReject}
      />
    </div>
  );
}
