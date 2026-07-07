import { createClient } from "@/lib/supabase/server";
import type { Settings, SettingsInput } from "@/lib/types";
import type { RoomCategoryItem } from "@/lib/room-categories";
import { parseSettingsRow } from "@/lib/settings-parse";
import { sortRoomCategories } from "@/lib/room-categories";
import { SETTINGS_ID } from "@/lib/constants";

export { SETTINGS_ID };

async function assertRoomCategoriesCanChange(
  previous: RoomCategoryItem[],
  next: RoomCategoryItem[]
): Promise<void> {
  const nextByCode = new Map(next.map((item) => [item.code, item]));
  const blockedCodes: string[] = [];

  for (const item of previous) {
    const updated = nextByCode.get(item.code);
    if (!updated) {
      blockedCodes.push(item.code);
      continue;
    }
    if (item.is_active && !updated.is_active) {
      blockedCodes.push(item.code);
    }
  }

  if (blockedCodes.length === 0) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("category_code")
    .in("category_code", blockedCodes)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }

  const usageCounts = new Map<string, number>();
  for (const row of data ?? []) {
    const code = row.category_code as string | null;
    if (!code) continue;
    usageCounts.set(code, (usageCounts.get(code) ?? 0) + 1);
  }

  if (usageCounts.size === 0) return;

  const details = [...usageCounts.entries()]
    .map(([code, count]) => `${code} (${count} phòng)`)
    .join(", ");
  throw new Error(
    `Không thể xóa hoặc tắt phân loại đang được sử dụng: ${details}`
  );
}

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

    if (input.room_categories !== undefined) {
      const current = await getSettings();
      const previous = current?.room_categories ?? [];
      const next = sortRoomCategories(input.room_categories);
      await assertRoomCategoriesCanChange(previous, next);
    }

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

    if (input.room_categories !== undefined) {
      updateData.room_categories = sortRoomCategories(input.room_categories);
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
