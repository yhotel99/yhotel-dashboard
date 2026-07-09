import type { RoomCategoryItem } from "@/lib/room-categories";
import { getActiveRoomCategories } from "@/lib/room-categories";
import { roomTypeLabels, DEFAULT_BRANCH_ID } from "@/lib/constants";
import type { Room } from "@/lib/types";

export type CategoryRoomSummary = {
  id: string;
  name: string;
  description: string | null;
  room_type: Room["room_type"];
  room_number: string | null;
  floor_number: number | null;
  price_per_night: number;
  max_guests: number;
  amenities: string[];
  status: Room["status"];
  category_code: string | null;
  branch_id: string;
  thumbnail_url?: string | null;
};

export type WebDisplayCategoryGroup = {
  category_code: string;
  branch_id: string;
  branch_name?: string;
  name: string;
  description: string | null;
  room_type: Room["room_type"];
  min_price: number;
  max_price: number;
  max_guests: number;
  amenities: string[];
  total_count: number;
  sample_room_id: string;
  thumbnail_url?: string | null;
  category_label?: string;
};

export type WebCategoryManagementGroup = WebDisplayCategoryGroup & {
  rooms: CategoryRoomSummary[];
  is_empty?: boolean;
};

export type WebCategoryManagementData = {
  groups: WebCategoryManagementGroup[];
  unassigned_rooms: CategoryRoomSummary[];
};

export type RoomWebPreviewData = {
  name: string;
  description?: string | null;
  room_type: Room["room_type"];
  category_code?: string | null;
  category_label?: string | null;
  price_per_night: number;
  max_guests: number;
  amenities: string[];
  thumbnail_url?: string | null;
  is_visible_on_web: boolean;
};

type RoomRow = Pick<
  Room,
  | "id"
  | "name"
  | "description"
  | "room_type"
  | "category_code"
  | "branch_id"
  | "price_per_night"
  | "max_guests"
  | "amenities"
> & {
  thumbnail_url?: string | null;
};

export function groupRoomsForWebDisplay(
  rooms: RoomRow[],
  categories: RoomCategoryItem[] = []
): WebDisplayCategoryGroup[] {
  const categoryLabelByCode = new Map(
    categories.map((item) => [item.code, item.name])
  );
  const groups = new Map<string, WebDisplayCategoryGroup>();

  for (const room of rooms) {
    if (!room.category_code) continue;

    const groupKey = `${room.branch_id}::${room.category_code}`;
    const existing = groups.get(groupKey);

    if (!existing) {
      groups.set(groupKey, {
        category_code: room.category_code,
        branch_id: room.branch_id,
        name: room.name,
        description: room.description,
        room_type: room.room_type,
        min_price: room.price_per_night,
        max_price: room.price_per_night,
        max_guests: room.max_guests,
        amenities: room.amenities ?? [],
        total_count: 1,
        sample_room_id: room.id,
        thumbnail_url: room.thumbnail_url,
        category_label: categoryLabelByCode.get(room.category_code),
      });
      continue;
    }

    existing.total_count += 1;
    if (room.price_per_night < existing.min_price) {
      existing.min_price = room.price_per_night;
    }
    if (room.price_per_night > existing.max_price) {
      existing.max_price = room.price_per_night;
    }

    const roomDescription = room.description?.trim();
    if (roomDescription && !existing.description?.trim()) {
      existing.description = room.description;
      existing.sample_room_id = room.id;
      existing.name = room.name;
      existing.thumbnail_url = room.thumbnail_url ?? existing.thumbnail_url;
    }
  }

  return Array.from(groups.values()).sort((a, b) =>
    (a.category_label ?? a.name).localeCompare(b.category_label ?? b.name)
  );
}

function toCategoryRoomSummary(
  room: RoomRow & {
    status?: Room["status"];
    room_number?: string | null;
    floor_number?: number | null;
    max_guests?: number;
  }
): CategoryRoomSummary {
  return {
    id: room.id,
    name: room.name,
    description: room.description ?? null,
    room_type: room.room_type,
    room_number: room.room_number ?? null,
    floor_number: room.floor_number ?? null,
    price_per_night: room.price_per_night,
    max_guests: room.max_guests ?? 0,
    amenities: room.amenities ?? [],
    status: room.status ?? "available",
    category_code: room.category_code ?? null,
    branch_id: room.branch_id,
    thumbnail_url: room.thumbnail_url ?? null,
  };
}

export function buildWebCategoryManagementData(
  rooms: Array<
    RoomRow & {
      status?: Room["status"];
      room_number?: string | null;
      floor_number?: number | null;
    }
  >,
  categories: RoomCategoryItem[] = [],
  options?: {
    branchFilter?: string | null;
    branches?: Array<{ id: string; name: string }>;
  }
): WebCategoryManagementData {
  const branchFilter = options?.branchFilter ?? null;
  const branches = options?.branches ?? [];
  const branchNameById = new Map(branches.map((b) => [b.id, b.name]));

  const withBranchName = (
    group: WebCategoryManagementGroup
  ): WebCategoryManagementGroup => ({
    ...group,
    branch_name: branchNameById.get(group.branch_id) ?? group.branch_name,
  });
  const assignedRooms: CategoryRoomSummary[] = [];
  const unassigned_rooms: CategoryRoomSummary[] = [];

  for (const room of rooms) {
    const summary = toCategoryRoomSummary(room);
    if (!room.category_code) {
      unassigned_rooms.push(summary);
    } else {
      assignedRooms.push(summary);
    }
  }

  const baseGroups = groupRoomsForWebDisplay(assignedRooms, categories);
  const groups: WebCategoryManagementGroup[] = baseGroups.map((group) =>
    withBranchName({
      ...group,
      rooms: assignedRooms.filter(
        (room) =>
          room.category_code === group.category_code &&
          room.branch_id === group.branch_id
      ),
      is_empty: false,
    })
  );

  const activeCategories = getActiveRoomCategories(categories);
  const targetBranches =
    branchFilter != null
      ? branches.filter((b) => b.id === branchFilter)
      : branches.length > 0
        ? branches
        : [{ id: DEFAULT_BRANCH_ID, name: "Chi nhánh mặc định" }];

  for (const branch of targetBranches) {
    for (const category of activeCategories) {
      const hasGroup = groups.some(
        (group) =>
          group.category_code === category.code &&
          group.branch_id === branch.id
      );
      if (hasGroup) continue;

      groups.push(
        withBranchName({
          category_code: category.code,
          branch_id: branch.id,
          name: category.name,
          description: category.description ?? null,
          room_type: "standard",
          min_price: 0,
          max_price: 0,
          max_guests: 0,
          amenities: [],
          total_count: 0,
          sample_room_id: "",
          thumbnail_url: null,
          category_label: category.name,
          rooms: [],
          is_empty: true,
        })
      );
    }
  }

  groups.sort((a, b) => {
    const branchCompare = (a.branch_name ?? "").localeCompare(b.branch_name ?? "");
    if (branchCompare !== 0) return branchCompare;
    return (a.category_label ?? a.name).localeCompare(b.category_label ?? b.name);
  });

  unassigned_rooms.sort((a, b) => {
    const aNum = a.room_number ?? a.name;
    const bNum = b.room_number ?? b.name;
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });

  return { groups, unassigned_rooms };
}

export function buildRoomWebPreviewData(
  values: {
    name: string;
    description?: string | null;
    room_type: Room["room_type"];
    category_code?: string | null;
    price_per_night: number | string;
    max_guests: number | string;
    amenities?: string[];
    thumbnail?: { url: string } | null;
  },
  categories: RoomCategoryItem[] = []
): RoomWebPreviewData {
  const price =
    typeof values.price_per_night === "string"
      ? Number(values.price_per_night) || 0
      : values.price_per_night;
  const guests =
    typeof values.max_guests === "string"
      ? Number(values.max_guests) || 0
      : values.max_guests;
  const categoryCode = values.category_code?.trim() || null;

  return {
    name: values.name.trim() || "Tên hạng phòng",
    description: values.description,
    room_type: values.room_type,
    category_code: categoryCode,
    category_label: categoryCode
      ? categories.find((item) => item.code === categoryCode)?.name ?? null
      : null,
    price_per_night: price,
    max_guests: guests,
    amenities: values.amenities ?? [],
    thumbnail_url: values.thumbnail?.url,
    is_visible_on_web: Boolean(categoryCode),
  };
}

export function formatWebPriceRange(min: number, max: number): string {
  if (min === max) {
    return min.toLocaleString("vi-VN");
  }
  return `${min.toLocaleString("vi-VN")} - ${max.toLocaleString("vi-VN")}`;
}

export function getRoomTypeBadgeLabel(roomType: Room["room_type"]): string {
  return roomTypeLabels[roomType] ?? roomType;
}
