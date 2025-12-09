import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { RoomWithBooking, Room, RoomStatusViewData } from "@/lib/types";
import { ROOM_STATUS, type RoomMapStatus } from "@/lib/constants";

/**
 * GET /api/reservations
 * Fetch reservation data from room_status_view
 * Returns array of rooms with booking information and status
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch data from room_status_view
    const { data, error } = await supabase
      .from("room_status_view")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Map data from view to RoomWithBooking
    const roomsWithBookings: RoomWithBooking[] = (data || []).map(
      (item: RoomStatusViewData) => {
        // Parse price_per_night from string to number
        const pricePerNight = parseFloat(item.price_per_night);

        // Create room object
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

        // Create currentBooking if booking_id exists
        const currentBooking =
          item.booking_id && item.check_in && item.check_out
            ? {
                id: item.booking_id,
                check_in: item.check_in,
                check_out: item.check_out,
                status: item.booking_status || "pending",
              }
            : null;

        // Use current_status from view (already normalized)
        const mapStatus = item.current_status as RoomMapStatus;

        // isClean based on technical_status
        const isClean = item.technical_status === ROOM_STATUS.CLEAN;

        return {
          ...room,
          currentBooking,
          mapStatus,
          isClean,
        };
      }
    );

    return NextResponse.json({
      data: roomsWithBookings,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải sơ đồ phòng";
    console.error("Error fetching reservation data:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
