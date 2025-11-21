import { createClient } from "@/lib/supabase/client";
import type { Room } from "@/lib/types";

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
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getAvailableRooms(
  checkIn: string,
  checkOut: string
): Promise<Room[]> {
  try {
    const supabase = createClient();
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
