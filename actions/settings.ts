"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Settings, SettingsInput } from "@/lib/types";
import { USER_ROLE } from "@/lib/constants";
import { getSettings, updateSettings } from "@/services/settings";

/**
 * Get global settings (singleton, not per branch).
 */
export async function getSettingsAction(): Promise<Settings | null> {
  try {
    return await getSettings();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (
      !errorMessage.includes("DYNAMIC_SERVER_USAGE") &&
      !errorMessage.includes("cookies")
    ) {
      console.error("Error getting settings:", err);
    }
    return null;
  }
}

/**
 * Update global settings (admin/manager only).
 */
export async function updateSettingsAction(
  input: SettingsInput
): Promise<Settings> {
  try {
    const supabase = await createClient();

    const { data: currentUser } = await supabase.auth.getUser();
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.user?.id)
      .single();

    if (
      ![USER_ROLE.ADMIN, USER_ROLE.MANAGER].includes(profileData?.role) ||
      !profileData
    ) {
      throw new Error("Không có quyền cập nhật cài đặt");
    }

    const settings = await updateSettings(input);

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/rooms/create");
    revalidatePath("/dashboard/rooms", "layout");
    revalidatePath("/", "layout");

    return settings;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể cập nhật cài đặt";
    throw new Error(errorMessage);
  }
}
