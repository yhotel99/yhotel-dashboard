import type { Settings } from "@/lib/types";

/** Normalize raw settings row from Supabase (JSONB fields). */
export function parseSettingsRow(
  data: Record<string, unknown>
): Settings {
  const settings = { ...data };

  if (settings.hero_images && typeof settings.hero_images === "string") {
    try {
      settings.hero_images = JSON.parse(settings.hero_images);
    } catch {
      settings.hero_images = [];
    }
  } else if (!settings.hero_images) {
    settings.hero_images = [];
  }

  if (
    settings.social_media_links &&
    typeof settings.social_media_links === "string"
  ) {
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
}
