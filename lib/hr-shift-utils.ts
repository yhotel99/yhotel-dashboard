import {
  type ShiftRegistration,
  ShiftTime,
  RequestStatus,
  OffType,
  OFF_TYPE_LABELS,
} from "@/types/hr-shifts";

export const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

export const GRID_EMPLOYEE_ROLES = new Set(["EMPLOYEE", "MANAGER", "HR"]);

export const MAX_CUSTOM_SHIFTS_PER_DAY = 2;
export const DEFAULT_IN = "09:00";
export const DEFAULT_OUT = "18:00";

export const TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 5; h <= 23; h++) {
    opts.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 23) opts.push(`${String(h).padStart(2, "0")}:30`);
  }
  return opts;
})();

export function hasOffOnDate(
  shifts: ShiftRegistration[],
  date: Date | string
): boolean {
  return getShiftsOnDate(shifts, date).some((s) => s.shift === ShiftTime.OFF);
}

export function countCustomShiftsOnDate(
  shifts: ShiftRegistration[],
  date: Date | string
): number {
  return getShiftsOnDate(shifts, date).filter((s) => s.shift === ShiftTime.CUSTOM)
    .length;
}

export function canAddCustomShiftOnDate(
  shifts: ShiftRegistration[],
  date: Date | string
): boolean {
  if (hasOffOnDate(shifts, date)) return false;
  return countCustomShiftsOnDate(shifts, date) < MAX_CUSTOM_SHIFTS_PER_DAY;
}

const DAY_NAMES = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

export function formatDateLabel(d: Date): string {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export const toYmdFromDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const toYmdFromTs = (timestamp: number): string =>
  toYmdFromDate(new Date(timestamp));

/** Thứ Hai đầu tuần (0h). Chủ nhật → lùi 6 ngày. */
export function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getWeekDates(weekStart: Date): Date[] {
  const start = getWeekStart(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const dates = getWeekDates(weekStart);
  const first = dates[0];
  const last = dates[6];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(first.getDate())}/${pad(first.getMonth() + 1)} – ${pad(last.getDate())}/${pad(last.getMonth() + 1)}/${last.getFullYear()}`;
}

export const getShiftsOnDate = (
  shifts: ShiftRegistration[],
  date: Date | string
): ShiftRegistration[] => {
  const dateStr = typeof date === "string" ? date : toYmdFromDate(date);
  return shifts
    .filter((s) => toYmdFromTs(s.date) === dateStr)
    .sort((a, b) => {
      const aStart = a.startTime ?? "";
      const bStart = b.startTime ?? "";
      if (aStart !== bStart) return aStart.localeCompare(bStart);
      return a.createdAt - b.createdAt;
    });
};

export const formatShiftTimeRange = (shift: ShiftRegistration): string => {
  if (shift.shift === ShiftTime.OFF) return "Ngày off";
  if (!shift.startTime) return "Ca làm việc";
  const end = shift.endTime ?? "";
  return end ? `${shift.startTime} – ${end}` : shift.startTime;
};

/** Nhãn giờ ngắn trên ô lịch: "06–14" hoặc "06–14·14–22" */
export function formatDayShiftLabel(
  shifts: ShiftRegistration[]
): string | null {
  const customs = shifts
    .filter((s) => s.shift === ShiftTime.CUSTOM && s.startTime)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  if (customs.length === 0) return null;
  return customs
    .map((s) => {
      const start = s.startTime!.slice(0, 2);
      const end = (s.endTime ?? "").slice(0, 2) || "?";
      return `${start}–${end}`;
    })
    .join("·");
}

/** Trạng thái tổng hợp: REJECTED > PENDING > APPROVED */
export function aggregateDayStatus(
  shifts: ShiftRegistration[]
): RequestStatus | null {
  if (shifts.length === 0) return null;
  if (shifts.some((s) => s.status === RequestStatus.REJECTED)) {
    return RequestStatus.REJECTED;
  }
  if (shifts.some((s) => s.status === RequestStatus.PENDING)) {
    return RequestStatus.PENDING;
  }
  return RequestStatus.APPROVED;
}

export function getCellDisplayLabel(shifts: ShiftRegistration[]): string {
  const offReg = shifts.find((s) => s.shift === ShiftTime.OFF);
  if (offReg) {
    return offReg.offType && OFF_TYPE_LABELS[offReg.offType as OffType]
      ? OFF_TYPE_LABELS[offReg.offType as OffType]
      : "Ngày off";
  }
  const label = formatDayShiftLabel(shifts);
  if (label) return label;
  return "—";
}

export function getCellStatusClasses(
  shifts: ShiftRegistration[]
): string {
  if (shifts.length === 0) {
    return "bg-background text-muted-foreground";
  }

  const status = aggregateDayStatus(shifts);
  const offReg = shifts.find((s) => s.shift === ShiftTime.OFF);

  if (status === RequestStatus.REJECTED) {
    return "bg-red-50 text-red-800 border-red-200";
  }
  if (status === RequestStatus.PENDING) {
    return "bg-amber-50 text-amber-900 border-amber-200";
  }
  if (offReg) {
    return "bg-muted text-muted-foreground border-border";
  }
  return "bg-green-50 text-green-800 border-green-200";
}

export function buildShiftMap(
  shifts: ShiftRegistration[]
): Map<string, ShiftRegistration[]> {
  const map = new Map<string, ShiftRegistration[]>();
  for (const s of shifts) {
    const key = `${s.userId}_${toYmdFromTs(s.date)}`;
    const list = map.get(key) ?? [];
    list.push(s);
    map.set(key, list);
  }
  map.forEach((list, key) => {
    list.sort(
      (a, b) =>
        (a.startTime ?? "").localeCompare(b.startTime ?? "") ||
        a.createdAt - b.createdAt
    );
    map.set(key, list);
  });
  return map;
}

export function isSameWeek(a: Date, b: Date): boolean {
  return toYmdFromDate(getWeekStart(a)) === toYmdFromDate(getWeekStart(b));
}
