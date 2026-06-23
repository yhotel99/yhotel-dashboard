"use client";

import { Fragment, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type {
  HrHoliday,
  HrUser,
  ShiftCellDetail,
  ShiftRegistration,
} from "@/types/hr-shifts";
import {
  RequestStatus,
  ShiftTime,
  OFF_TYPE_LABELS,
  OffType,
} from "@/types/hr-shifts";
import {
  DAY_LABELS,
  DEFAULT_IN,
  DEFAULT_OUT,
  aggregateDayStatus,
  buildShiftMap,
  toYmdFromDate,
} from "@/lib/hr-shift-utils";

const GRID_BORDER = "border-r border-b border-border";
const GRID_DAY_END = "border-r-2 border-r-border/90";

function gridHeadClass(extra?: string) {
  return `${GRID_BORDER} ${extra ?? ""}`.trim();
}

function gridCellClass(extra?: string, dayEnd = false) {
  return `${GRID_BORDER}${dayEnd ? ` ${GRID_DAY_END}` : ""} ${extra ?? ""}`.trim();
}

interface ShiftAdminGridProps {
  employees: HrUser[];
  shifts: ShiftRegistration[];
  weekDates: Date[];
  holidays: HrHoliday[];
  selectedUserId: string | null;
  actionLoadingId: string | null;
  loading?: boolean;
  onSelectUser: (userId: string | null) => void;
  onCellClick: (detail: ShiftCellDetail) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
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

export function ShiftAdminGrid({
  employees,
  shifts,
  weekDates,
  holidays,
  selectedUserId,
  actionLoadingId,
  loading,
  onSelectUser,
  onCellClick,
  onApprove,
  onReject,
}: ShiftAdminGridProps) {
  const shiftMap = useMemo(() => buildShiftMap(shifts), [shifts]);

  const getShiftsFor = (userId: string, date: Date) =>
    shiftMap.get(`${userId}_${toYmdFromDate(date)}`) ?? [];

  const openDetail = (
    e: React.SyntheticEvent,
    user: HrUser,
    date: Date,
    cellShifts: ShiftRegistration[]
  ) => {
    e.stopPropagation();
    onCellClick({
      user,
      date,
      shifts: cellShifts,
      holiday: getHolidayForDate(holidays, date),
    });
  };

  return (
    <div className="rounded-lg border overflow-x-auto relative">
      {loading ? (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
          <span className="text-muted-foreground font-medium">Đang tải...</span>
        </div>
      ) : null}
      <Table className="min-w-[880px] table-fixed border-collapse">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead
              className={gridHeadClass(
                "min-w-[120px] max-w-[120px] w-[120px] sticky left-0 z-10 bg-muted/50 border-l whitespace-normal"
              )}
            >
              Nhân viên
            </TableHead>
            {weekDates.map((d, i) => {
              const holiday = getHolidayForDate(holidays, d);
              return (
                <TableHead
                  key={toYmdFromDate(d)}
                  colSpan={2}
                  className={gridHeadClass(
                    `text-center min-w-[104px] ${GRID_DAY_END} ${
                      holiday ? "bg-amber-50 text-amber-900" : ""
                    }`
                  )}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs font-semibold">
                      {DAY_LABELS[i]} {d.getDate()}/{d.getMonth() + 1}
                      {holiday ? " 🎉" : ""}
                    </span>
                    {holiday ? (
                      <span
                        className="text-[10px] font-normal truncate max-w-[90px]"
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
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead
              className={gridHeadClass(
                "sticky left-0 z-10 bg-muted/30 border-l min-w-[120px] max-w-[120px] w-[120px]"
              )}
            />
            {weekDates.map((_, i) => (
              <Fragment key={i}>
                <TableHead
                  className={gridHeadClass("text-center text-[10px] font-medium px-0")}
                >
                  Vào
                </TableHead>
                <TableHead
                  className={gridHeadClass(
                    `text-center text-[10px] font-medium px-0 ${GRID_DAY_END}`
                  )}
                >
                  Ra
                </TableHead>
              </Fragment>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={1 + weekDates.length * 2}
                className="h-24 text-center text-muted-foreground"
              >
                Không có nhân viên nào.
              </TableCell>
            </TableRow>
          ) : (
            employees.map((emp) => {
              const isSelected = selectedUserId === emp.id;

              return (
                <TableRow
                  key={emp.id}
                  className={`cursor-pointer border-b ${isSelected ? "bg-sky-50 hover:bg-sky-50" : "hover:bg-muted/30"}`}
                  onClick={() =>
                    onSelectUser(isSelected ? null : emp.id)
                  }
                >
                  <TableCell
                    className={gridCellClass(
                      `font-medium sticky left-0 z-10 align-top border-l whitespace-normal min-w-[120px] max-w-[120px] w-[120px] ${
                        isSelected ? "bg-sky-50" : "bg-background"
                      }`
                    )}
                  >
                    <span className="text-sm block leading-snug line-clamp-2 break-words">
                      {emp.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5 line-clamp-1 break-words">
                      {emp.department || "—"}
                    </span>
                  </TableCell>
                  {weekDates.map((date) => {
                    const regs = getShiftsFor(emp.id, date);
                    const cellProps = (cellShifts: ShiftRegistration[]) => ({
                      onClick: (e: React.MouseEvent) =>
                        openDetail(e, emp, date, cellShifts),
                    });

                    if (regs.length === 0) {
                      return (
                        <Fragment key={toYmdFromDate(date)}>
                          <TableCell
                            {...cellProps(regs)}
                            className={gridCellClass(
                              "p-1 text-center text-xs text-muted-foreground cursor-pointer hover:bg-muted/50"
                            )}
                          >
                            —
                          </TableCell>
                          <TableCell
                            {...cellProps(regs)}
                            className={gridCellClass(
                              "p-1 text-center text-xs text-muted-foreground cursor-pointer hover:bg-muted/50",
                              true
                            )}
                          >
                            —
                          </TableCell>
                        </Fragment>
                      );
                    }

                    const dayStatus = aggregateDayStatus(regs);
                    const statusIcon =
                      dayStatus === RequestStatus.PENDING
                        ? "⏳"
                        : dayStatus === RequestStatus.APPROVED
                          ? "✓"
                          : "✕";
                    const statusCls =
                      dayStatus === RequestStatus.PENDING
                        ? "text-amber-600"
                        : dayStatus === RequestStatus.APPROVED
                          ? "text-green-600"
                          : "text-red-600";

                    const offReg = regs.find((r) => r.shift === ShiftTime.OFF);
                    if (offReg) {
                      return (
                        <TableCell
                          key={toYmdFromDate(date)}
                          colSpan={2}
                          {...cellProps(regs)}
                          className={gridCellClass(
                            `px-2 py-2 bg-red-50/80 text-red-700 text-xs font-medium text-center align-top cursor-pointer hover:bg-red-100/80`,
                            true
                          )}
                        >
                          <div className="flex flex-col items-center gap-1 relative">
                            <span
                              className={`absolute top-0.5 right-0.5 text-[9px] font-bold ${statusCls}`}
                            >
                              {statusIcon}
                            </span>
                            <span>
                              {offReg.offType &&
                              OFF_TYPE_LABELS[offReg.offType as OffType]
                                ? OFF_TYPE_LABELS[offReg.offType as OffType]
                                : "Ngày off"}
                            </span>
                            {offReg.status === RequestStatus.PENDING &&
                            regs.length === 1 ? (
                              <div
                                className="flex gap-1 mt-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  size="sm"
                                  className="h-6 px-2 text-[10px]"
                                  disabled={actionLoadingId === offReg.id}
                                  onClick={() => onApprove(offReg.id)}
                                >
                                  Duyệt
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px]"
                                  disabled={actionLoadingId === offReg.id}
                                  onClick={() => onReject(offReg.id)}
                                >
                                  Từ chối
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                      );
                    }

                    const customs = regs.filter(
                      (r) => r.shift === ShiftTime.CUSTOM
                    );
                    const slot1 = customs[0];
                    const slot2 = customs[1];
                    const singlePending =
                      customs.length === 1 &&
                      customs[0].status === RequestStatus.PENDING;

                    return (
                      <Fragment key={toYmdFromDate(date)}>
                        <TableCell
                          {...cellProps(regs)}
                          className={gridCellClass(
                            "p-1 text-center text-xs relative align-top cursor-pointer hover:bg-muted/50"
                          )}
                        >
                          <span
                            className={`absolute top-0.5 right-0.5 text-[9px] font-bold ${statusCls}`}
                          >
                            {statusIcon}
                          </span>
                          <div className="font-medium">
                            {slot1?.startTime ?? DEFAULT_IN}
                          </div>
                          {slot2 ? (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {slot2.startTime ?? DEFAULT_IN}
                            </div>
                          ) : null}
                          {singlePending && slot1 ? (
                            <div
                              className="flex justify-center gap-1 mt-1 flex-wrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                disabled={actionLoadingId === slot1.id}
                                onClick={() => onApprove(slot1.id)}
                              >
                                Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px]"
                                disabled={actionLoadingId === slot1.id}
                                onClick={() => onReject(slot1.id)}
                              >
                                Từ chối
                              </Button>
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell
                          {...cellProps(regs)}
                          className={gridCellClass(
                            "p-1 text-center text-xs align-top font-medium cursor-pointer hover:bg-muted/50",
                            true
                          )}
                        >
                          <div>{slot1?.endTime ?? DEFAULT_OUT}</div>
                          {slot2 ? (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {slot2.endTime ?? DEFAULT_OUT}
                            </div>
                          ) : null}
                        </TableCell>
                      </Fragment>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
