
import { createClient } from "@/lib/supabase/server";
import type {
  Room,
  RoomInput,
  RoomWithImages,
  PaginationMeta,
  ImageValue,
} from "@/lib/types";

/**
 * Get available rooms for a date range
 * @param checkIn - Check-in date (ISO string)
 * @param checkOut - Check-out date (ISO string)
 * @returns Array of available rooms
 */
type RoomFromRPC = {
  id: string;
  name: string;
  description: string | null;
  room_type: Room["room_type"];
  price_per_night: string | number;
  max_guests: number;
  amenities: string[] | unknown;
  status: Room["status"];
  room_number?: string | null;
  floor_number?: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getAvailableRooms(
  checkIn: string,
  checkOut: string
): Promise<Room[]> {
  try {
    const supabase = await createClient();
    // Use type assertion to bypass Supabase type checking
    const { data, error } = (await supabase.rpc("get_available_rooms", {
      p_check_in: checkIn,
      p_check_out: checkOut,
    })) as { data: RoomFromRPC[] | null; error: { message: string } | null };

    if (error) {
      throw new Error(error.message);
    }

    // Cast to expected type and map to Room type
    const roomsData = (data || []) as RoomFromRPC[];
    const rooms: Room[] = roomsData.map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description,
      room_type: room.room_type,
      price_per_night:
        typeof room.price_per_night === "string"
          ? parseFloat(room.price_per_night)
          : room.price_per_night,
      max_guests: room.max_guests,
      amenities: Array.isArray(room.amenities) ? room.amenities : [],
      status: room.status,
      room_number: room.room_number || null,
      floor_number: room.floor_number || null,
      deleted_at: room.deleted_at,
      created_at: room.created_at,
      updated_at: room.updated_at,
    }));

    return rooms;
  } catch (err) {
    console.error("Error getting available rooms:", err);
    throw err;
  }
}



/**
 * Create a new room
 * @param input - Room input data
 * @param thumbnail - Thumbnail image (optional)
 * @param imageList - Additional images (optional)
 * @returns Created room record
 */
export async function createRoom(
  input: RoomInput,
  thumbnail?: ImageValue,
  imageList?: ImageValue[]
): Promise<Room> {
  try {
    const supabase = await createClient();
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
          position: positionIndex++, // Position increases: 0, 1, 2, 3...
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
        // Don't throw error, room is already created
      }
    }

    return newRoom;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tạo phòng";
    throw new Error(errorMessage);
  }
}

/**
 * Update room
 * @param id - Room ID
 * @param input - Partial room input data
 * @param thumbnail - Thumbnail image (optional)
 * @param imageList - Additional images (optional)
 * @returns Updated room record
 */
export async function updateRoom(
  id: string,
  input: Partial<RoomInput>,
  thumbnail?: ImageValue,
  imageList?: ImageValue[]
): Promise<Room> {
  try {
    const supabase = await createClient();

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

    // Only update images if thumbnail or imageList is provided
    const hasThumbnail = thumbnail !== undefined;
    const hasImageList = imageList !== undefined;

    if (hasThumbnail || hasImageList) {
      // Delete existing room_images only if we're updating images
      const { error: deleteError } = await supabase
        .from("room_images")
        .delete()
        .eq("room_id", id);

      if (deleteError) {
        console.warn("Error deleting room_images:", deleteError);
      }

      // Create new room_images records
      const roomImagesToInsert: Array<{
        room_id: string;
        image_id: string;
        position: number;
        is_main: boolean;
      }> = [];

      // Handle thumbnail (main image) - only if provided
      if (thumbnail?.id) {
        roomImagesToInsert.push({
          room_id: id,
          image_id: thumbnail.id,
          position: 0,
          is_main: true,
        });
      }

      // Handle additional images - only if provided
      if (imageList && imageList.length > 0) {
        let positionIndex = thumbnail?.id ? 1 : 0; // Start from 1 if thumbnail exists
        imageList.forEach((image) => {
          roomImagesToInsert.push({
            room_id: id,
            image_id: image.id,
            position: positionIndex++, // Position increases: 0 or 1, 2, 3...
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
          // Don't throw error, room is already updated
        }
      }
    }

    return updatedRoom;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể cập nhật phòng";
    throw new Error(errorMessage);
  }
}

/**
 * Update room status only
 * @param id - Room ID
 * @param status - New status
 * @returns Updated room record
 */
export async function updateRoomStatus(
  id: string,
  status: Room["status"]
): Promise<Room> {
  try {
    const supabase = await createClient();

    // Update only room status
    const { data, error } = await supabase
      .from("rooms")
      .update({ status })
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

    return updatedRoom;
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể cập nhật trạng thái phòng";
    throw new Error(errorMessage);
  }
}

/**
 * Delete room (soft delete)
 * @param id - Room ID
 */
export async function deleteRoom(id: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("rooms")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể xóa phòng";
    throw new Error(errorMessage);
  }
}

/**
 * Get room by ID with images
 * @param id - Room ID
 * @returns Room with images or null
 */
export async function getRoomById(id: string): Promise<RoomWithImages | null> {
  try {
    const supabase = await createClient();

    // Fetch room data with nested room_images and images
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
  } catch {
    return null;
  }
}

/**
 * Get rooms list with pagination
 * @param search - Search term (optional)
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @returns Object with rooms data and pagination metadata
 */
export async function getRoomsListWithPagination({
  search,
  page = 1,
  limit = 10,
}: {
  search?: string | null;
  page?: number;
  limit?: number;
}): Promise<{
  data: Room[];
  pagination: PaginationMeta;
}> {
  try {
    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      throw new Error("Page and limit must be greater than 0");
    }

    const supabase = await createClient();

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query with room_images join
    // We don't use !inner or top-level filter on is_main to avoid duplicating room rows
    // in the result set, which would break server-side pagination.
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

    // Add search filter: tên phòng hoặc số phòng (room_number)
    if (search && search.trim() !== "") {
      const term = search.trim();
      const pattern = `%${term}%`;
      query = query.or(`name.ilike.${pattern},room_number.ilike.${pattern}`);
    }

    // Fetch data with server-side pagination
    // Added .order("id") to ensure stable sorting when created_at is identical
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    // Process rooms to extract thumbnails
    type RoomWithImagesData = Room & {
      room_images?: Array<{
        image_id: string;
        is_main: boolean;
        images: {
          id: string;
          url: string;
        } | null;
      }>;
    };

    const roomsData = (data || []).map((room: RoomWithImagesData) => {
      const roomImages = room.room_images || [];

      // Get thumbnail - find the one marked as main
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

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: roomsData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách phòng";
    console.error("Error fetching rooms list:", err);
    throw new Error(errorMessage);
  }
}