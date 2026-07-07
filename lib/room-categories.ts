export type RoomCategoryItem = {
  code: string;
  name: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
};

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export function normalizeCategoryCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isValidCategoryCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

function parseRoomCategoryItem(raw: unknown): RoomCategoryItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const code = typeof item.code === "string" ? item.code.trim() : "";
  const name = typeof item.name === "string" ? item.name.trim() : "";
  if (!code || !name || !isValidCategoryCode(code)) return null;

  return {
    code,
    name,
    description:
      typeof item.description === "string" ? item.description.trim() || null : null,
    sort_order:
      typeof item.sort_order === "number" && Number.isFinite(item.sort_order)
        ? item.sort_order
        : 0,
    is_active: item.is_active !== false,
  };
}

export function parseRoomCategories(raw: unknown): RoomCategoryItem[] {
  if (!raw) return [];
  let list: unknown[] = [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } else if (Array.isArray(raw)) {
    list = raw;
  } else {
    return [];
  }

  const seen = new Set<string>();
  const result: RoomCategoryItem[] = [];
  for (const entry of list) {
    const item = parseRoomCategoryItem(entry);
    if (!item || seen.has(item.code)) continue;
    seen.add(item.code);
    result.push(item);
  }
  return result;
}

export function sortRoomCategories(
  items: RoomCategoryItem[]
): RoomCategoryItem[] {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }
    return a.name.localeCompare(b.name);
  });
}

export function getActiveRoomCategories(
  items: RoomCategoryItem[]
): RoomCategoryItem[] {
  return sortRoomCategories(items.filter((item) => item.is_active));
}

export function getRoomCategoryLabel(
  code: string | null | undefined,
  categories: RoomCategoryItem[]
): string {
  if (!code) return "—";
  return categories.find((item) => item.code === code)?.name ?? code;
}

/** Categories for room form select: active + current value if inactive. */
export function getRoomFormCategoryOptions(
  categories: RoomCategoryItem[],
  currentCode?: string | null
): RoomCategoryItem[] {
  const active = getActiveRoomCategories(categories);
  if (!currentCode || active.some((item) => item.code === currentCode)) {
    return active;
  }
  const current = categories.find((item) => item.code === currentCode);
  return current ? sortRoomCategories([...active, current]) : active;
}
