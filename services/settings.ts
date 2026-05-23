import { createClient } from "@/lib/supabase/server";
import type { Settings, SettingsInput } from "@/lib/types";
import { parseSettingsRow } from "@/lib/settings-parse";
import { SETTINGS_ID } from "@/lib/constants";

export { SETTINGS_ID };

/**
 * Get global settings (singleton).
 */
export async function getSettings(): Promise<Settings | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("id", SETTINGS_ID)
      .single();

    if (error || !data) {
      return null;
    }

    return parseSettingsRow(data as Record<string, unknown>);
  } catch (err) {
    console.error("Error getting settings:", err);
    return null;
  }
}

/**
 * Update global settings.
 */
export async function updateSettings(
  input: SettingsInput
): Promise<Settings> {
  try {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    if (input.hero_images !== undefined) {
      updateData.hero_images = input.hero_images
        ? JSON.stringify(input.hero_images)
        : "[]";
    }

    if (input.social_media_links !== undefined) {
      updateData.social_media_links = input.social_media_links || {};
    }

    const { data, error } = await supabase
      .from("settings")
      .update(updateData)
      .eq("id", SETTINGS_ID)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return parseSettingsRow(data as Record<string, unknown>);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể cập nhật cài đặt";
    throw new Error(errorMessage);
  }
}
