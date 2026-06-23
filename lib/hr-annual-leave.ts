import {
  type AnnualLeaveSummary,
  type HrUser,
  type ShiftRegistration,
  OffType,
  RequestStatus,
  ShiftTime,
} from "@/types/hr-shifts";

const toLocalDateKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function countOffPnDays(
  shifts: ShiftRegistration[],
  year: number,
  status?: RequestStatus
): number {
  const daySet = new Set<string>();
  for (const shift of shifts) {
    if (shift.shift !== ShiftTime.OFF || shift.offType !== OffType.OFF_PN) {
      continue;
    }
    if (status && shift.status !== status) continue;
    if (new Date(shift.date).getFullYear() !== year) continue;
    daySet.add(toLocalDateKey(shift.date));
  }
  return daySet.size;
}

export function calculateAnnualLeaveEntitlement(
  annualLeaveDaysPerYear: number,
  startDate: number | undefined,
  year: number
): number {
  const maxDaysPerYear =
    annualLeaveDaysPerYear > 0 ? annualLeaveDaysPerYear : 12;
  if (!startDate) return maxDaysPerYear;

  const normalizedStartDate = startDate < 1e12 ? startDate * 1000 : startDate;
  const joinedDate = new Date(normalizedStartDate);
  if (Number.isNaN(joinedDate.getTime())) return maxDaysPerYear;

  const joinedYear = joinedDate.getFullYear();
  const joinedMonth = joinedDate.getMonth();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (year > currentYear) return 0;
  if (joinedYear > year) return 0;

  const accrualStartMonth = joinedYear === year ? joinedMonth : 0;
  const accrualEndMonth = year === currentYear ? currentMonth : 11;

  if (accrualEndMonth < accrualStartMonth) return 0;

  const accruedDays = accrualEndMonth - accrualStartMonth + 1;
  return Math.min(maxDaysPerYear, accruedDays);
}

export function getAnnualLeaveSummary(
  user: HrUser | undefined,
  userShifts: ShiftRegistration[],
  annualLeaveDaysPerYear: number,
  year: number = new Date().getFullYear()
): AnnualLeaveSummary {
  const entitlementDays = calculateAnnualLeaveEntitlement(
    annualLeaveDaysPerYear,
    user?.startDate,
    year
  );
  const usedDays = countOffPnDays(userShifts, year, RequestStatus.APPROVED);
  const pendingDays = countOffPnDays(userShifts, year, RequestStatus.PENDING);

  return {
    year,
    entitlementDays,
    usedDays,
    pendingDays,
    remainingDays: Number(Math.max(0, entitlementDays - usedDays).toFixed(2)),
  };
}
