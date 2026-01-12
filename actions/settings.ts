"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Settings, SettingsInput } from "@/lib/types";
import { USER_ROLE } from "@/lib/constants";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Get settings (singleton)
 */
export async function getSettingsAction(): Promise<Settings | null> {
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

    // Parse hero_images from JSONB to ImageValue[]
    const settings = data as Record<string, unknown>;
    if (settings.hero_images && typeof settings.hero_images === 'string') {
      try {
        settings.hero_images = JSON.parse(settings.hero_images);
      } catch {
        settings.hero_images = [];
      }
    } else if (!settings.hero_images) {
      settings.hero_images = [];
    }

    // Parse social_media_links from JSONB
    if (settings.social_media_links && typeof settings.social_media_links === 'string') {
      try {
        settings.social_media_links = JSON.parse(settings.social_media_links);
      } catch {
        settings.social_media_links = {};
      }
    } else if (!settings.social_media_links) {
      settings.social_media_links = {};
    }

    return settings as Settings;
  } catch (err) {
    // Silently handle dynamic server usage errors during static generation
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (!errorMessage.includes('DYNAMIC_SERVER_USAGE') && !errorMessage.includes('cookies')) {
      console.error("Error getting settings:", err);
    }
    return null;
  }
}

/**
 * Update settings
 */
export async function updateSettingsAction(
  input: SettingsInput
): Promise<Settings> {
  try {
    const supabase = await createClient();
    
    // Check permissions (only admin and manager can update settings)
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

    // Prepare update data, convert hero_images array to JSONB
    const updateData: Record<string, unknown> = {
      ...input,
      updated_at: new Date().toISOString(),
    };
    
    if (input.hero_images !== undefined) {
      updateData.hero_images = input.hero_images ? JSON.stringify(input.hero_images) : '[]';
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

    // Parse hero_images from JSONB to ImageValue[]
    const settings = data as Record<string, unknown>;
    if (settings.hero_images && typeof settings.hero_images === 'string') {
      try {
        settings.hero_images = JSON.parse(settings.hero_images);
      } catch {
        settings.hero_images = [];
      }
    } else if (!settings.hero_images) {
      settings.hero_images = [];
    }

    // Revalidate settings page and root layout
    revalidatePath("/dashboard/settings");
    revalidatePath("/", "layout");

    return settings as Settings;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể cập nhật cài đặt";
    throw new Error(errorMessage);
  }
}

