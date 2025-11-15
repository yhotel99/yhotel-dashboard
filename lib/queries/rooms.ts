import { createClient } from "@/lib/supabase/client";
import type {
  Room,
  RoomInput,
  RoomWithImages,
  PaginationMeta,
  ImageValue,
} from "@/lib/types";

// Query keys
export const roomKeys = {
  all: ["rooms"] as const,
  lists: () => [...roomKeys.all, "list"] as const,
  list: (page: number, limit: number, search: string) =>
    [...roomKeys.lists(), page, limit, search] as const,
  details: () => [...roomKeys.all, "detail"] as const,
  detail: (id: string) => [...roomKeys.details(), id] as const,
};

// Helper type for room with images data
type RoomWithImagesData = Room & {
  room_images?: Array<{
    image_id: string;
    is_main: boolean;
    position: number;
    images: {
      id: string;
      url: string;
    } | null;
  }>;
};

// Helper function to process room data
function processRoomData(data: RoomWithImagesData[]): Room[] {
  return data.map((room) => {
    const roomImages = room.room_images || [];

    // Find thumbnail (is_main = true)
    const thumbnailRoomImage = roomImages.find((ri) => ri.is_main === true);
    const thumbnail =
      thumbnailRoomImage && thumbnailRoomImage.images
        ? {
            id: thumbnailRoomImage.images.id,
            url: thumbnailRoomImage.images.url,
          }
        : undefined;

    // Remove room_images from room data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { room_images, ...roomWithoutImages } = room;

    return {
      ...roomWithoutImages,
      amenities: Array.isArray(room.amenities) ? room.amenities : [],
      thumbnail,
    } as Room;
  });
}

// Fetch rooms query function
export async function fetchRoomsQuery(
  page: number,
  limit: number,
  search: string
): Promise<{ rooms: Room[]; pagination: PaginationMeta }> {
  const supabase = createClient();

  // Calculate offset
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Build query with room_images join to get thumbnails
  let query = supabase
    .from("rooms")
    .select(
      `
      *,
      room_images (
        image_id,
        is_main,
        images (
          id,
          url
        )
      )
    `,
      { count: "exact" }
    )
    .is("deleted_at", null);

  // Add search filter if search term exists
  if (search && search.trim() !== "") {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  // Fetch data with pagination
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const roomsData = processRoomData((data || []) as RoomWithImagesData[]);
  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    rooms: roomsData,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

// Fetch single room query function
export async function fetchRoomByIdQuery(
  id: string
): Promise<RoomWithImages | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("rooms")
    .select(
      `
      *,
      room_images (
        image_id,
        is_main,
        position,
        images (
          id,
          url
        )
      )
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return null;
  }

  const roomData = {
    ...data,
    amenities: Array.isArray(data.amenities) ? data.amenities : [],
  } as Room & {
    room_images?: Array<{
      image_id: string;
      is_main: boolean;
      position: number;
      images: {
        id: string;
        url: string;
      } | null;
    }>;
  };

  // Process room_images to extract thumbnail and images
  const roomImages = roomData.room_images || [];

  // Find thumbnail (is_main = true)
  const thumbnailRoomImage = roomImages.find((ri) => ri.is_main === true);
  const thumbnail =
    thumbnailRoomImage && thumbnailRoomImage.images
      ? {
          id: thumbnailRoomImage.images.id,
          url: thumbnailRoomImage.images.url,
        }
      : undefined;

  // Find additional images (is_main = false), sorted by position
  const additionalRoomImages = roomImages
    .filter((ri) => ri.is_main === false && ri.images !== null)
    .sort((a, b) => a.position - b.position);

  const images: ImageValue[] = additionalRoomImages
    .map((ri) => {
      if (!ri.images) return null;
      return {
        id: ri.images.id,
        url: ri.images.url,
      };
    })
    .filter((img): img is ImageValue => img !== null);

  // Remove room_images from roomData
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { room_images, ...roomWithoutImages } = roomData;

  return {
    ...(roomWithoutImages as Room),
    thumbnail,
    images,
  } as RoomWithImages;
}

// Create room mutation function
export async function createRoomMutation({
  input,
  thumbnail,
  imageList,
}: {
  input: RoomInput;
  thumbnail?: ImageValue;
  imageList?: ImageValue[];
}): Promise<Room> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("rooms")
    .insert([input])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const newRoom = {
    ...data,
    amenities: Array.isArray(data.amenities) ? data.amenities : [],
  } as Room;

  const roomId = newRoom.id;

  // Create room_images records
  const roomImagesToInsert: Array<{
    room_id: string;
    image_id: string;
    position: number;
    is_main: boolean;
  }> = [];

  // Handle thumbnail (main image)
  if (thumbnail?.id) {
    roomImagesToInsert.push({
      room_id: roomId,
      image_id: thumbnail.id,
      position: 0,
      is_main: true,
    });
  }

  // Handle additional images
  if (imageList && imageList.length > 0) {
    let positionIndex = 0;
    imageList.forEach((image) => {
      roomImagesToInsert.push({
        room_id: roomId,
        image_id: image.id,
        position: positionIndex++,
        is_main: false,
      });
    });
  }

  // Insert room_images if any
  if (roomImagesToInsert.length > 0) {
    const { error: roomImagesError } = await supabase
      .from("room_images")
      .insert(roomImagesToInsert);

    if (roomImagesError) {
      console.warn("Failed to insert room_images:", roomImagesError);
    }
  }

  return newRoom;
}

// Update room mutation function
export async function updateRoomMutation({
  id,
  input,
  thumbnail,
  imageList,
}: {
  id: string;
  input: Partial<RoomInput>;
  thumbnail?: ImageValue;
  imageList?: ImageValue[];
}): Promise<Room> {
  const supabase = createClient();

  // Update room data
  const { data, error } = await supabase
    .from("rooms")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const updatedRoom = {
    ...data,
    amenities: Array.isArray(data.amenities) ? data.amenities : [],
  } as Room;

  // Delete existing room_images
  const { error: deleteError } = await supabase
    .from("room_images")
    .delete()
    .eq("room_id", id);

  if (deleteError) {
    console.warn("Error deleting room_images:", deleteError);
  }

  if (thumbnail !== undefined || imageList !== undefined) {
    // Create new room_images records
    const roomImagesToInsert: Array<{
      room_id: string;
      image_id: string;
      position: number;
      is_main: boolean;
    }> = [];

    // Handle thumbnail (main image)
    if (thumbnail?.id) {
      roomImagesToInsert.push({
        room_id: id,
        image_id: thumbnail.id,
        position: 0,
        is_main: true,
      });
    }

    // Handle additional images
    if (imageList && imageList.length > 0) {
      let positionIndex = 0;
      imageList.forEach((image) => {
        roomImagesToInsert.push({
          room_id: id,
          image_id: image.id,
          position: positionIndex++,
          is_main: false,
        });
      });
    }

    // Insert room_images if any
    if (roomImagesToInsert.length > 0) {
      const { error: roomImagesError } = await supabase
        .from("room_images")
        .insert(roomImagesToInsert);

      if (roomImagesError) {
        console.warn("Failed to insert room_images:", roomImagesError);
      }
    }
  }

  return updatedRoom;
}

// Delete room mutation function
export async function deleteRoomMutation(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("rooms")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

// Update room status mutation function
export async function updateRoomStatusMutation({
  id,
  status,
}: {
  id: string;
  status: "clean" | "not_clean";
}): Promise<{ id: string; status: "clean" | "not_clean" }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("rooms")
    .update({ status })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return { id, status };
}

