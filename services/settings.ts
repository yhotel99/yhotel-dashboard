import { createClient } from "@/lib/supabase/server";
import type { Settings, SettingsInput } from "@/lib/types";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Get settings (singleton)
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

    // Parse social_media_links from JSONB (Supabase returns it as object, but ensure it's correct)
    if (settings.social_media_links && typeof settings.social_media_links === 'string') {
      try {
        settings.social_media_links = JSON.parse(settings.social_media_links);
      } catch {
        settings.social_media_links = {};
      }
    } else if (!settings.social_media_links) {
      settings.social_media_links = {};
    }

    if (Array.isArray(settings.pricing_holiday_periods)) {
      // keep as-is
    } else if (
      settings.pricing_holiday_periods &&
      typeof settings.pricing_holiday_periods === "string"
    ) {
      try {
        settings.pricing_holiday_periods = JSON.parse(
          settings.pricing_holiday_periods
        );
      } catch {
        settings.pricing_holiday_periods = [];
      }
    } else if (!settings.pricing_holiday_periods) {
      settings.pricing_holiday_periods = [];
    }

    return settings as Settings;
  } catch (err) {
    console.error("Error getting settings:", err);
    return null;
  }
}

/**
 * Update settings
 */
export async function updateSettings(
  input: SettingsInput
): Promise<Settings> {
  try {
    const supabase = await createClient();
    
    // Prepare update data, convert hero_images array to JSONB
    const updateData: Record<string, unknown> = {
      ...input,
      updated_at: new Date().toISOString(),
    };
    
    if (input.hero_images !== undefined) {
      updateData.hero_images = input.hero_images ? JSON.stringify(input.hero_images) : '[]';
    }

    // social_media_links is already an object, Supabase will handle JSONB conversion
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

    // Parse social_media_links from JSONB (Supabase returns it as object, but ensure it's correct)
    if (settings.social_media_links && typeof settings.social_media_links === 'string') {
      try {
        settings.social_media_links = JSON.parse(settings.social_media_links);
      } catch {
        settings.social_media_links = {};
      }
    } else if (!settings.social_media_links) {
      settings.social_media_links = {};
    }

    if (Array.isArray(settings.pricing_holiday_periods)) {
      // keep as-is
    } else if (
      settings.pricing_holiday_periods &&
      typeof settings.pricing_holiday_periods === "string"
    ) {
      try {
        settings.pricing_holiday_periods = JSON.parse(
          settings.pricing_holiday_periods
        );
      } catch {
        settings.pricing_holiday_periods = [];
      }
    } else if (!settings.pricing_holiday_periods) {
      settings.pricing_holiday_periods = [];
    }

    return settings as Settings;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể cập nhật cài đặt";
    throw new Error(errorMessage);
  }
}

