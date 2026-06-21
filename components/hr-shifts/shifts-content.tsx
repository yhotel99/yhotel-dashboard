"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShiftWeekGrid } from "@/components/hr-shifts/ShiftWeekGrid";
import { ShiftCellDetailDialog } from "@/components/hr-shifts/ShiftCellDetail";
import { filterGridEmployees } from "@/lib/hr-shifts";
import {
  formatWeekRangeLabel,
  getWeekDates,
  getWeekStart,
  isSameWeek,
  toYmdFromDate,
} from "@/lib/hr-shift-utils";
import type { HrShiftData, ShiftCellDetail } from "@/types/hr-shifts";
import { RequestStatus } from "@/types/hr-shifts";

interface ShiftsContentProps {
  data: HrShiftData;
}

export function ShiftsContent({ data }: ShiftsContentProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [branchFilter, setBranchFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [searchName, setSearchName] = useState("");
  const [cellDetail, setCellDetail] = useState<ShiftCellDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const weekDateKeys = useMemo(
    () => new Set(weekDates.map((d) => toYmdFromDate(d))),
    [weekDates]
  );

  const gridEmployees = useMemo(
    () =>
      filterGridEmployees(data.users, {
        branchId: branchFilter || undefined,
        department: departmentFilter || undefined,
        searchName,
      }),
    [data.users, branchFilter, departmentFilter, searchName]
  );

  const gridEmployeeIds = useMemo(
    () => new Set(gridEmployees.map((e) => e.id)),
    [gridEmployees]
  );

  const weekShifts = useMemo(
    () =>
      data.shifts.filter(
        (s) =>
          weekDateKeys.has(toYmdFromDate(new Date(s.date))) &&
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

  const departmentOptions = useMemo(
    () => data.departments.map((d) => d.name).sort(),
    [data.departments]
  );

  const prevWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() - 7);
    setWeekStart(getWeekStart(next));
  };

  const nextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(getWeekStart(next));
  };

  const goToThisWeek = () => setWeekStart(getWeekStart(new Date()));

  const handleCellClick = (detail: ShiftCellDetail) => {
    setCellDetail(detail);
    setDetailOpen(true);
  };

  const isCurrentWeek = isSameWeek(weekStart, new Date());

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Lịch ca làm việc</h1>
          <p className="text-muted-foreground text-sm">
            Xem lịch ca nhân viên từ hệ thống HR (chỉ đọc)
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Tuần trước</span>
            </Button>
            <Button
              variant={isCurrentWeek ? "default" : "outline"}
              size="sm"
              onClick={goToThisWeek}
            >
              Tuần này
            </Button>
            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Tuần sau</span>
            </Button>
            <span className="text-sm font-medium ml-1">
              {formatWeekRangeLabel(weekStart)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-900 border-amber-200"
            >
              Chờ duyệt: {weekStats.pending}
            </Badge>
            <Badge
              variant="outline"
              className="bg-green-50 text-green-800 border-green-200"
            >
              Đã duyệt: {weekStats.approved}
            </Badge>
            <Badge
              variant="outline"
              className="bg-red-50 text-red-800 border-red-200"
            >
              Từ chối: {weekStats.rejected}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Select
            value={departmentFilter || "all"}
            onValueChange={(v) =>
              setDepartmentFilter(v === "all" ? "" : v)
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Phòng ban" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
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
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Chi nhánh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả chi nhánh</SelectItem>
              {data.branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
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
      </div>

      <div className="px-4 lg:px-6">
        <ShiftWeekGrid
          employees={gridEmployees}
          shifts={weekShifts}
          weekDates={weekDates}
          holidays={data.holidays}
          onCellClick={handleCellClick}
        />
      </div>

      <ShiftCellDetailDialog
        detail={cellDetail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
