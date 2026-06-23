import { getHrSupabase, isHrSupabaseConfigured } from "@/lib/hr-supabase";
import {
  filterByBranchUserIds,
  filterStaffForAdmin,
  getAdminBranchId,
  isAdminUser,
} from "@/lib/hr-branch-access";
import {
  type HrBranch,
  type HrDepartment,
  type HrHoliday,
  type HrShiftData,
  type HrUser,
  type ShiftRegistration,
  ContractType,
  EmployeeStatus,
  RequestStatus,
  ShiftTime,
  OffType,
  HrUserRole,
} from "@/types/hr-shifts";
import { GRID_EMPLOYEE_ROLES } from "@/lib/hr-shift-utils";

export function mapShift(row: Record<string, unknown>): ShiftRegistration {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    date: Number(row.date),
    shift: row.shift as ShiftTime,
    startTime: (row.start_time as string) || undefined,
    endTime: (row.end_time as string) || undefined,
    offType: (row.off_type as OffType) || undefined,
    status: row.status as RequestStatus,
    reason: (row.reason as string) || undefined,
    rejectionReason: (row.rejection_reason as string) || undefined,
    note: (row.note as string) || undefined,
    createdAt: Number(row.created_at),
  };
}

export function mapUser(row: Record<string, unknown>): HrUser {
  return {
    id: String(row.id),
    name: String(row.name),
    email: (row.email as string) || undefined,
    role: row.role as HrUserRole,
    department: String(row.department ?? ""),
    branchId: (row.branch_id as string) || undefined,
    status: (row.status as EmployeeStatus) || undefined,
    contractType: (row.contract_type as ContractType) || undefined,
    startDate: row.start_date ? Number(row.start_date) : undefined,
  };
}

export function mapBranch(row: Record<string, unknown>): HrBranch {
  return {
    id: String(row.id),
    name: String(row.name),
    code: String(row.code),
    isActive: (row.is_active as boolean) ?? true,
  };
}

export function mapDepartment(row: Record<string, unknown>): HrDepartment {
  return {
    id: String(row.id),
    name: String(row.name),
    code: (row.code as string) || undefined,
    isActive: (row.is_active as boolean) ?? true,
  };
}

export function mapHoliday(row: Record<string, unknown>): HrHoliday {
  return {
    id: String(row.id),
    name: String(row.name),
    date: Number(row.date),
    type: row.type as HrHoliday["type"],
    isRecurring: (row.is_recurring as boolean) ?? false,
    description: (row.description as string) || undefined,
  };
}

export type HrShiftFetchResult =
  | { ok: true; data: HrShiftData }
  | { ok: false; error: "not_configured" | "fetch_failed"; message: string };

async function getConfigValueServer(
  key: string,
  defaultValue: string
): Promise<string> {
  const supabase = getHrSupabase();
  const { data } = await supabase
    .from("system_configs")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? defaultValue;
}

export async function fetchHrAdminByEmail(
  email: string
): Promise<HrUser | null> {
  if (!isHrSupabaseConfigured()) return null;
  try {
    const supabase = getHrSupabase();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (error || !data) return null;
    const user = mapUser(data);
    return isAdminUser(user.role) ? user : null;
  } catch {
    return null;
  }
}

export async function fetchHrShiftData(
  hrAdmin?: HrUser | null
): Promise<HrShiftFetchResult> {
  if (!isHrSupabaseConfigured()) {
    return {
      ok: false,
      error: "not_configured",
      message:
        "Thiếu cấu hình HR Supabase. Thêm NEXT_PUBLIC_HR_SUPABASE_URL và NEXT_PUBLIC_HR_SUPABASE_ANON_KEY vào .env.local rồi khởi động lại server.",
    };
  }

  try {
    const supabase = getHrSupabase();

    const [shiftsRes, usersRes, branchesRes, deptsRes, holidaysRes, regRaw, annualRaw] =
      await Promise.all([
        supabase
          .from("shift_registrations")
          .select("*")
          .order("date")
          .order("created_at"),
        supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("branches").select("*").eq("is_active", true),
        supabase.from("departments").select("*").eq("is_active", true),
        supabase.from("holidays").select("*").order("date"),
        getConfigValueServer("employee_shift_registration_enabled", "true"),
        getConfigValueServer("annual_leave_days_per_year", "12"),
      ]);

    const firstError =
      shiftsRes.error ||
      usersRes.error ||
      branchesRes.error ||
      deptsRes.error ||
      holidaysRes.error;

    if (firstError) {
      return {
        ok: false,
        error: "fetch_failed",
        message: firstError.message || "Không tải được dữ liệu từ HR Supabase.",
      };
    }

    const allUsers = (usersRes.data ?? []).map(mapUser);
    const regOn = !["false", "0", "no", "off"].includes(
      regRaw.trim().toLowerCase()
    );

    let shifts = (shiftsRes.data ?? []).map(mapShift);
    let users = allUsers;
    let branches = (branchesRes.data ?? []).map(mapBranch);

    if (hrAdmin) {
      const scopedEmployees = filterStaffForAdmin(allUsers, hrAdmin);
      const allowedIds = new Set(scopedEmployees.map((e) => e.id));
      shifts = filterByBranchUserIds(shifts, allowedIds);
      users = scopedEmployees;
      const branchId = getAdminBranchId(hrAdmin);
      if (branchId) {
        branches = branches.filter((b) => b.id === branchId);
      }
    }

    return {
      ok: true,
      data: {
        shifts,
        users,
        branches,
        departments: (deptsRes.data ?? []).map(mapDepartment),
        holidays: (holidaysRes.data ?? []).map(mapHoliday),
        employeeShiftRegEnabled: regOn,
        annualLeaveDaysPerYear: parseFloat(annualRaw) || 12,
      },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Lỗi không xác định khi tải dữ liệu HR.";
    return { ok: false, error: "fetch_failed", message };
  }
}

export function filterGridEmployees(
  users: HrUser[],
  filters: {
    branchId?: string;
    department?: string;
    searchName?: string;
  }
): HrUser[] {
  const search = filters.searchName?.trim().toLowerCase() ?? "";

  return users
    .filter((u) => GRID_EMPLOYEE_ROLES.has(String(u.role)))
    .filter((u) => u.status !== EmployeeStatus.LEFT)
    .filter((u) => !filters.branchId || u.branchId === filters.branchId)
    .filter((u) => !filters.department || u.department === filters.department)
    .filter((u) => !search || u.name.toLowerCase().includes(search));
}
