"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  HrHoliday,
  HrUser,
  ShiftCellDetail,
  ShiftRegistration,
} from "@/types/hr-shifts";
import {
  DAY_LABELS,
  buildShiftMap,
  getCellDisplayLabel,
  getCellStatusClasses,
  toYmdFromDate,
} from "@/lib/hr-shift-utils";

interface ShiftWeekGridProps {
  employees: HrUser[];
  shifts: ShiftRegistration[];
  weekDates: Date[];
  holidays: HrHoliday[];
  onCellClick: (detail: ShiftCellDetail) => void;
}

function getHolidayForDate(
  holidays: HrHoliday[],
  date: Date
): HrHoliday | undefined {
  const ymd = toYmdFromDate(date);
  const month = date.getMonth();
  const day = date.getDate();

  return holidays.find((h) => {
    const hd = new Date(h.date);
    if (toYmdFromDate(hd) === ymd) return true;
    if (h.isRecurring && hd.getMonth() === month && hd.getDate() === day) {
      return true;
    }
    return false;
  });
}

export function ShiftWeekGrid({
  employees,
  shifts,
  weekDates,
  holidays,
  onCellClick,
}: ShiftWeekGridProps) {
  const shiftMap = useMemo(() => buildShiftMap(shifts), [shifts]);

  const getShiftsFor = (userId: string, date: Date) =>
    shiftMap.get(`${userId}_${toYmdFromDate(date)}`) ?? [];

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="min-w-[140px] sticky left-0 z-10 bg-muted/50">
              Nhân viên
            </TableHead>
            <TableHead className="min-w-[100px]">Phòng ban</TableHead>
            {weekDates.map((d, i) => {
              const holiday = getHolidayForDate(holidays, d);
              return (
                <TableHead
                  key={toYmdFromDate(d)}
                  className={`min-w-[88px] text-center ${
                    holiday ? "bg-amber-50 text-amber-900" : ""
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs font-semibold">
                      {DAY_LABELS[i]} {d.getDate()}/{d.getMonth() + 1}
                    </span>
                    {holiday ? (
                      <span
                        className="text-[10px] font-normal text-amber-800 truncate max-w-[80px]"
                        title={holiday.name}
                      >
                        {holiday.name}
                      </span>
                    ) : null}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={2 + weekDates.length}
                className="h-24 text-center text-muted-foreground"
              >
                Không có nhân viên nào phù hợp bộ lọc.
              </TableCell>
            </TableRow>
          ) : (
            employees.map((emp) => (
              <TableRow key={emp.id} className="hover:bg-muted/30">
                <TableCell className="font-medium sticky left-0 z-10 bg-background">
                  {emp.name}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {emp.department || "—"}
                </TableCell>
                {weekDates.map((date) => {
                  const cellShifts = getShiftsFor(emp.id, date);
                  const holiday = getHolidayForDate(holidays, date);
                  const label = getCellDisplayLabel(cellShifts);
                  const statusClasses = getCellStatusClasses(cellShifts);

                  return (
                    <TableCell
                      key={toYmdFromDate(date)}
                      className={`p-1 text-center cursor-pointer transition-colors hover:opacity-90 ${statusClasses}`}
                      onClick={() =>
                        onCellClick({
                          user: emp,
                          date,
                          shifts: cellShifts,
                          holiday,
                        })
                      }
                    >
                      <span className="text-xs font-medium leading-tight block px-1 py-2">
                        {label}
                      </span>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
