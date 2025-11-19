import { createClient } from "@/lib/supabase/client";
import type {
  Room,
  RoomInput,
  RoomStatusViewData,
  RoomWithBooking,
  RoomWithImages,
  ImageValue,
  RoomStatus,
} from "@/lib/types";
import type { RoomMapStatus } from "@/lib/constants";

/**
 * Fetch room map data from room_status_view
 * @returns Array of rooms with booking information and status
 */
export async function fetchRoomMapData(): Promise<RoomWithBooking[]> {
  try {
    const supabase = createClient();

    // Lấy data từ room_status_view
    const { data, error } = await supabase
      .from("room_status_view")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // Map data từ view sang RoomWithBooking
    const roomsWithBookings: RoomWithBooking[] = (data || []).map(
      (item: RoomStatusViewData) => {
        // Parse price_per_night từ string sang number
        const pricePerNight = parseFloat(item.price_per_night);

        // Tạo room object
        const room: Room = {
          id: item.id,
          name: item.name,
          description: item.description,
          room_type: item.room_type,
          price_per_night: pricePerNight,
          max_guests: item.max_guests,
          amenities: Array.isArray(item.amenities) ? item.amenities : [],
          status: item.status as Room["status"],
          deleted_at: item.deleted_at,
          created_at: item.created_at,
          updated_at: item.updated_at,
        };

        // Tạo currentBooking nếu có booking_id
        const currentBooking =
          item.booking_id && item.check_in && item.check_out
            ? {
                id: item.booking_id,
                check_in: item.check_in,
                check_out: item.check_out,
                status: item.booking_status || "pending",
              }
            : null;

        // Sử dụng trực tiếp current_status từ view (đã được chuẩn hóa)
        const mapStatus = item.current_status as RoomMapStatus;

        // isClean dựa vào technical_status
        const isClean = item.technical_status === "clean";

        return {
          ...room,
          currentBooking,
          mapStatus,
          isClean,
        };
      }
    );

    return roomsWithBookings;
  } catch (err) {
    console.error("Error fetching room map data:", err);
    throw err;
  }
}

/**
 * Room with images data from query
 */
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

/**
 * Search rooms with pagination and search
 * @param search - Search term (searches in name)
 * @param page - Page number
 * @param limit - Items per page
 * @returns Object with rooms array and total count
 */
export async function searchRooms(
  search: string | null,
  page: number,
  limit: number
): Promise<{ rooms: Room[]; total: number }> {
  try {
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

    // Process rooms to extract thumbnails
    const roomsData = ((data || []) as RoomWithImagesData[]).map((room) => {
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

    const total = count || 0;

    return {
      rooms: roomsData,
      total,
    };
  } catch (err) {
    console.error("Error searching rooms:", err);
    throw err;
  }
}

/**
 * Create room with images
 * @param input - Room input data
 * @param thumbnail - Thumbnail image (main image)
 * @param imageList - Additional images
 * @returns Created room record
 */
export async function createRoom(
  input: RoomInput,
  thumbnail?: ImageValue,
  imageList?: ImageValue[]
): Promise<Room> {
  try {
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
    console.error("Error creating room:", err);
    throw err;
  }
}

/**
 * Update room with images
 * @param id - Room ID
 * @param input - Update data
 * @param thumbnail - Thumbnail image (main image)
 * @param imageList - Additional images
 * @returns Updated room record
 */
export async function updateRoom(
  id: string,
  input: Partial<RoomInput>,
  thumbnail?: ImageValue,
  imageList?: ImageValue[]
): Promise<Room> {
  try {
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

    // Only update room_images if thumbnail or imageList is provided
    // This prevents accidentally deleting images when only updating other fields
    if (thumbnail !== undefined || imageList !== undefined) {
      // Delete existing room_images
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
          // Don't throw error, room is already updated
        }
      }
    }

    return updatedRoom;
  } catch (err) {
    console.error("Error updating room:", err);
    throw err;
  }
}

/**
 * Delete room (soft delete)
 * @param id - Room ID
 */
export async function deleteRoom(id: string): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("rooms")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    console.error("Error deleting room:", err);
    throw err;
  }
}

/**
 * Update room status
 * @param id - Room ID
 * @param status - New status
 */
export async function updateRoomStatus(
  id: string,
  status: RoomStatus
): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("rooms")
      .update({ status })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    console.error("Error updating room status:", err);
    throw err;
  }
}

/**
 * Get room by ID with images
 * @param id - Room ID
 * @returns Room with images or null
 */
export async function getRoomById(id: string): Promise<RoomWithImages | null> {
  try {
    const supabase = createClient();

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
  } catch (err) {
    console.error("Error fetching room:", err);
    return null;
  }
}
