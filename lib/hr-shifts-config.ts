import type { SupabaseClient } from "@supabase/supabase-js";

export const EMPLOYEE_SHIFT_REGISTRATION_ENABLED_KEY =
  "employee_shift_registration_enabled";

export function parseEmployeeShiftRegEnabled(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return true;
}

export async function getEmployeeShiftRegEnabled(
  supabase: SupabaseClient
): Promise<boolean> {
  const { data } = await supabase
    .from("system_configs")
    .select("value")
    .eq("key", EMPLOYEE_SHIFT_REGISTRATION_ENABLED_KEY)
    .maybeSingle();
  return parseEmployeeShiftRegEnabled(data?.value ?? "true");
}

export async function setEmployeeShiftRegEnabled(
  supabase: SupabaseClient,
  enabled: boolean
): Promise<void> {
  const value = enabled ? "true" : "false";
  const desc =
    "Cho phép nhân viên đăng ký và sửa ca (true/false). Khi tắt, chỉ quản trị xử lý trên /admin/shift.";

  const { data: existing, error: fetchError } = await supabase
    .from("system_configs")
    .select("id")
    .eq("key", EMPLOYEE_SHIFT_REGISTRATION_ENABLED_KEY)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("system_configs")
      .update({
        value,
        updated_at: Math.floor(Date.now() / 1000),
      })
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("system_configs").insert({
    key: EMPLOYEE_SHIFT_REGISTRATION_ENABLED_KEY,
    value,
    description: desc,
    category: "ATTENDANCE",
    updated_at: Math.floor(Date.now() / 1000),
  });

  if (error) throw new Error(error.message);
}
