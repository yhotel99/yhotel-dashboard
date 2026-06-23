"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchHrAdminByEmail } from "@/lib/hr-shifts";
import { getHrSupabase, isHrSupabaseConfigured } from "@/lib/hr-supabase";
import { setEmployeeShiftRegEnabled } from "@/lib/hr-shifts-config";

export type ToggleShiftRegistrationResult =
  | { ok: true; enabled: boolean }
  | { ok: false; message: string };

export async function toggleEmployeeShiftRegistrationAction(
  enabled: boolean
): Promise<ToggleShiftRegistrationResult> {
  if (!isHrSupabaseConfigured()) {
    return {
      ok: false,
      message: "Chưa cấu hình HR Supabase.",
    };
  }

  const pms = await createClient();
  const {
    data: { user },
  } = await pms.auth.getUser();

  if (!user?.email) {
    return { ok: false, message: "Vui lòng đăng nhập." };
  }

  const hrAdmin = await fetchHrAdminByEmail(user.email);
  if (!hrAdmin) {
    return { ok: false, message: "Không có quyền quản trị ca HR." };
  }

  try {
    await setEmployeeShiftRegEnabled(getHrSupabase(), enabled);
    return { ok: true, enabled };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không cập nhật được cấu hình.";
    return { ok: false, message };
  }
}
