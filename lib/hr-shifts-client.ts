"use client";

import { hrSupabase } from "@/lib/hr-supabase";
import {
  filterByBranchUserIds,
  filterStaffForAdmin,
  getAdminBranchId,
  isAdminUser,
} from "@/lib/hr-branch-access";
import {
  mapBranch,
  mapDepartment,
  mapHoliday,
  mapShift,
  mapUser,
} from "@/lib/hr-shifts";
import {
  getEmployeeShiftRegEnabled,
} from "@/lib/hr-shifts-config";
import {
  type HrShiftData,
  type HrUser,
  type ShiftRegistration,
  HrUserRole,
  RequestStatus,
  ShiftTime,
  OffType,
} from "@/types/hr-shifts";

async function getConfigValue(key: string, defaultValue: string): Promise<string> {
  const supabase = hrSupabase();
  const { data } = await supabase
    .from("system_configs")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? defaultValue;
}

export async function fetchHrShiftDataForAdmin(
  hrAdmin: HrUser
): Promise<HrShiftData> {
  const supabase = hrSupabase();

  const [shiftsRes, usersRes, branchesRes, deptsRes, holidaysRes, regEnabled, annualDaysRaw] =
    await Promise.all([
      supabase
        .from("shift_registrations")
        .select("*")
        .order("date")
        .order("created_at"),
      supabase.from("users").select("*").order("created_at", { ascending: false }),
      supabase.from("branches").select("*").eq("is_active", true),
      supabase.from("departments").select("*").eq("is_active", true),
      supabase.from("holidays").select("*").order("date"),
      getEmployeeShiftRegEnabled(supabase),
      getConfigValue("annual_leave_days_per_year", "12"),
    ]);

  const firstError =
    shiftsRes.error ||
    usersRes.error ||
    branchesRes.error ||
    deptsRes.error ||
    holidaysRes.error;

  if (firstError) {
    throw new Error(firstError.message || "Không tải được dữ liệu HR.");
  }

  const allUsers = (usersRes.data ?? []).map(mapUser);
  const scopedEmployees = filterStaffForAdmin(allUsers, hrAdmin);
  const allowedIds = new Set(scopedEmployees.map((e) => e.id));
  const branchId = getAdminBranchId(hrAdmin);
  const branches = (branchesRes.data ?? []).map(mapBranch);
  const filteredBranches = branchId
    ? branches.filter((b) => b.id === branchId)
    : branches;

  return {
    shifts: filterByBranchUserIds(
      (shiftsRes.data ?? []).map(mapShift),
      allowedIds
    ),
    users: scopedEmployees,
    branches: filteredBranches,
    departments: (deptsRes.data ?? []).map(mapDepartment),
    holidays: (holidaysRes.data ?? []).map(mapHoliday),
    employeeShiftRegEnabled: regEnabled,
    annualLeaveDaysPerYear: parseFloat(annualDaysRaw) || 12,
  };
}

export async function updateShiftStatus(
  id: string,
  status: RequestStatus,
  rejectionReason?: string
): Promise<void> {
  const supabase = hrSupabase();
  const payload: { status: RequestStatus; rejection_reason?: string | null } = {
    status,
  };
  if (status === RequestStatus.REJECTED) {
    payload.rejection_reason = rejectionReason?.trim() || null;
  } else {
    payload.rejection_reason = null;
  }
  const { error } = await supabase
    .from("shift_registrations")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateShiftRegistration(
  id: string,
  data: {
    shift: string;
    startTime?: string | null;
    endTime?: string | null;
    offType?: string | null;
  },
  options?: { keepStatus?: boolean }
): Promise<void> {
  const supabase = hrSupabase();
  const payload: Record<string, unknown> = {
    shift: data.shift,
    start_time: data.startTime || null,
    end_time: data.endTime || null,
    off_type: data.offType || null,
    rejection_reason: null,
  };
  if (!options?.keepStatus) {
    payload.status = RequestStatus.PENDING;
  }
  const { error } = await supabase
    .from("shift_registrations")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function registerShift(
  shift: ShiftRegistration,
  options?: { initialStatus?: RequestStatus }
): Promise<void> {
  const supabase = hrSupabase();
  const status = options?.initialStatus ?? shift.status;
  const { error } = await supabase.from("shift_registrations").insert({
    user_id: shift.userId,
    date: shift.date,
    shift: shift.shift,
    start_time: shift.startTime || null,
    end_time: shift.endTime || null,
    off_type: shift.offType || null,
    reason: shift.reason || null,
    status,
    created_at: shift.createdAt,
  });
  if (error) throw new Error(error.message);
}

export async function lookupHrAdminByEmail(
  email: string
): Promise<HrUser | null> {
  const supabase = hrSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error || !data) return null;
  const user = mapUser(data);
  return isAdminUser(user.role) ? user : null;
}

export function isHrAdminRole(role: HrUserRole | string): boolean {
  return role === HrUserRole.ADMIN || role === HrUserRole.BRANCH_ADMIN;
}

export function buildNewShift(
  userId: string,
  date: Date,
  form: {
    shift: ShiftTime;
    startTime: string;
    endTime: string;
    offType: OffType;
  }
): ShiftRegistration {
  const dateTs = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  ).getTime();

  return {
    id: `admin-${Date.now()}`,
    userId,
    date: dateTs,
    shift: form.shift,
    startTime: form.shift === ShiftTime.CUSTOM ? form.startTime : undefined,
    endTime: form.shift === ShiftTime.CUSTOM ? form.endTime : undefined,
    offType: form.shift === ShiftTime.OFF ? form.offType : undefined,
    status: RequestStatus.APPROVED,
    createdAt: Date.now(),
  };
}
