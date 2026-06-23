export enum RequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum ShiftTime {
  CUSTOM = "CUSTOM",
  OFF = "OFF",
}

export enum OffType {
  OFF_DK = "OFF_DK",
  OFF_PN = "OFF_PN",
  OFF_KL = "OFF_KL",
  CT = "CT",
  LE = "LE",
}

export enum EmployeeStatus {
  ACTIVE = "ACTIVE",
  LEFT = "LEFT",
}

export enum HrUserRole {
  EMPLOYEE = "EMPLOYEE",
  MANAGER = "MANAGER",
  HR = "HR",
  ADMIN = "ADMIN",
  BRANCH_ADMIN = "BRANCH_ADMIN",
}

export enum ContractType {
  TRIAL = "TRIAL",
  OFFICIAL = "OFFICIAL",
  TEMPORARY = "TEMPORARY",
  PART_TIME = "PART_TIME",
}

export const OFF_TYPE_LABELS: Record<OffType, string> = {
  [OffType.OFF_DK]: "OFF DK - Định kỳ",
  [OffType.OFF_PN]: "OFF PN - Phép năm",
  [OffType.OFF_KL]: "OFF KL - Không lương",
  [OffType.CT]: "CT - Công tác",
  [OffType.LE]: "LỄ - Nghỉ lễ",
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: "Chờ duyệt",
  [RequestStatus.APPROVED]: "Đã duyệt",
  [RequestStatus.REJECTED]: "Từ chối",
};

export interface ShiftRegistration {
  id: string;
  userId: string;
  date: number;
  shift: ShiftTime;
  startTime?: string;
  endTime?: string;
  offType?: OffType;
  status: RequestStatus;
  reason?: string;
  rejectionReason?: string;
  note?: string;
  createdAt: number;
}

export interface HrUser {
  id: string;
  name: string;
  email?: string;
  department: string;
  branchId?: string;
  status?: EmployeeStatus;
  role: HrUserRole | string;
  contractType?: ContractType;
  startDate?: number;
}

export interface AnnualLeaveSummary {
  year: number;
  entitlementDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}

export interface HrBranch {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface HrDepartment {
  id: string;
  name: string;
  code?: string;
  isActive: boolean;
}

export interface HrHoliday {
  id: string;
  name: string;
  date: number;
  type: "NATIONAL" | "COMPANY" | "REGIONAL";
  isRecurring: boolean;
  description?: string;
}

export interface HrShiftData {
  shifts: ShiftRegistration[];
  users: HrUser[];
  branches: HrBranch[];
  departments: HrDepartment[];
  holidays: HrHoliday[];
  employeeShiftRegEnabled: boolean;
  annualLeaveDaysPerYear: number;
}

export interface ShiftCellDetail {
  user: HrUser;
  date: Date;
  shifts: ShiftRegistration[];
  holiday?: HrHoliday;
}

export type CellEditMode = "view" | "edit" | "add";

export type RejectTarget =
  | { type: "single"; id: string }
  | { type: "bulk"; userId: string };
