"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  RoomInput,
  RoomStatus,
  ImageValue,
  RoomWithImages,
  Room,
  RoomFromRPC,
  RoomImageWithData,
  RoomImageInput,
  Result,
  ResultVoid,
} from "@/lib/types";
import { logPriceUpdate } from "@/lib/audit-helpers";



export async function getAvailableRoomsAction(
  checkIn: string,
  checkOut: string
): Promise<Result<Room[]>> {
  try {
    const supabase = await createClient();
    // Use type assertion to bypass Supabase type checking
    const { data, error } = (await supabase.rpc("get_available_rooms", {
      p_check_in: checkIn,
      p_check_out: checkOut,
    })) as { data: RoomFromRPC[] | null; error: { message: string } | null };

    if (error) {
      return {
        ok: false,
        message: error.message || "Không thể lấy danh sách phòng trống",
      };
    }

    // Cast to expected type and map to Room type
    const roomsData = (data || []) as RoomFromRPC[];
    const rooms: Room[] = roomsData.map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description,
      room_type: room.room_type,
      category_code: room.category_code || null,
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

    return {
      ok: true,
      data: rooms,
    };
  } catch (err) {
    console.error("Error getting available rooms:", err);
    return {
      ok: false,
      message: "Không thể lấy danh sách phòng trống",
    };
  }
}

/**
 * Create a new room
 * @param input - Room input data
 * @param thumbnail - Thumbnail image (optional)
 * @param imageList - Additional images (optional)
 */
export async function createRoom(
  input: RoomInput,
  thumbnail?: ImageValue,
  imageList?: ImageValue[]
): Promise<ResultVoid> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("rooms")
      .insert([input])
      .select()
      .single();

    if (error) {
      return {
        ok: false,
        message: error.message || "Không thể tạo phòng",
      };
    }

    const roomId = data.id;

    // Create room_images records
    const roomImagesToInsert: RoomImageInput[] = [];

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
        // Don't return error, room is already created
      }
    }

    // Revalidate rooms page after creating
    revalidatePath("/dashboard/rooms", "page");
    return { ok: true };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tạo phòng";
    return {
      ok: false,
      message: errorMessage,
    };
  }
}

/**
 * Update room
 * @param id - Room ID
 * @param input - Partial room input data
 * @param thumbnail - Thumbnail image (optional)
 * @param imageList - Additional images (optional)
 */
export async function updateRoom(
  id: string,
  input: Partial<RoomInput>,
  thumbnail?: ImageValue,
  imageList?: ImageValue[]
): Promise<ResultVoid> {
  try {
    const supabase = await createClient();

    // Get old price if being updated (only query if needed)
    let oldPrice = null;
    if (input.price_per_night !== undefined) {
      const { data } = await supabase
        .from("rooms")
        .select("price_per_night")
        .eq("id", id)
        .single();
      oldPrice = data?.price_per_night;
    }

    // Update room data
    const { error } = await supabase.from("rooms").update(input).eq("id", id);

    if (error) {
      return {
        ok: false,
        message: error.message || "Không thể cập nhật phòng",
      };
    }

    // Log price change if applicable
    if (input.price_per_night !== undefined && oldPrice !== null) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await logPriceUpdate(
          id,
          user.id,
          user.email!,
          oldPrice,
          input.price_per_night,
          { action: 'update_room_price' }
        );
      }
    }

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
      const roomImagesToInsert: RoomImageInput[] = [];

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
          // Don't return error, room is already updated
        }
      }
    }

    // Revalidate rooms page after updating
    revalidatePath("/dashboard/rooms", "page");
    return { ok: true };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể cập nhật phòng";
    return {
      ok: false,
      message: errorMessage,
    };
  }
}

/**
 * Update room status only
 * @param id - Room ID
 * @param status - New status
 */
export async function updateRoomStatus(
  id: string,
  status: RoomStatus
): Promise<ResultVoid> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("rooms")
      .update({ status })
      .eq("id", id);

    if (error) {
      return {
        ok: false,
        message: error.message || "Không thể cập nhật trạng thái phòng",
      };
    }

    // Revalidate rooms page after updating status
    revalidatePath("/dashboard/rooms");
    return { ok: true };
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Không thể cập nhật trạng thái phòng";
    return {
      ok: false,
      message: errorMessage,
    };
  }
}

/**
 * Delete room (soft delete)
 * @param id - Room ID
 */
export async function deleteRoom(id: string): Promise<ResultVoid> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("rooms")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return {
        ok: false,
        message: error.message || "Không thể xóa phòng",
      };
    }

    // Revalidate rooms page after deleting
    revalidatePath("/dashboard/rooms");
    return { ok: true };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể xóa phòng";
    return {
      ok: false,
      message: errorMessage,
    };
  }
}

/**
 * Get room by ID with images
 * @param id - Room ID
 * @returns Room with images or null
 */
export async function getRoomById(
  id: string
): Promise<Result<RoomWithImages>> {
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
      return {
        ok: false,
        message: "Không tìm thấy phòng",
      };
    }

    const roomData = {
      ...data,
      amenities: Array.isArray(data.amenities) ? data.amenities : [],
    } as Room & {
      room_images?: RoomImageWithData[];
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
      ok: true,
      data: {
        ...(roomWithoutImages as Room),
        thumbnail,
        images,
      } as RoomWithImages,
    };
  } catch (err) {
    console.error("Error fetching room by ID:", err);
    return {
      ok: false,
      message: "Không thể lấy thông tin phòng",
    };
  }
}
