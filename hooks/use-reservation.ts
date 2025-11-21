"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RoomWithBooking, Room, RoomStatusViewData } from "@/lib/types";
import { ROOM_STATUS, type RoomMapStatus } from "@/lib/constants";

/**
 * Fetch reservation data from room_status_view
 * @returns Array of rooms with booking information and status
 */
export async function fetchReservationData(): Promise<RoomWithBooking[]> {
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
        const isClean = item.technical_status === ROOM_STATUS.CLEAN;

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
    console.error("Error fetching reservation data:", err);
    throw err;
  }
}

export function useReservation() {
  const [rooms, setRooms] = useState<RoomWithBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReservation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const roomsWithBookings = await fetchReservationData();
      setRooms(roomsWithBookings);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể tải sơ đồ phòng";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    rooms,
    isLoading,
    error,
    refetch: fetchReservation,
  };
}
