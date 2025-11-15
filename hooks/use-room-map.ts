"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Room } from "@/lib/types";

export type RoomMapStatus =
  | "vacant" // Đang trống
  | "upcoming_checkin" // Sắp nhận
  | "occupied" // Đang sử dụng
  | "upcoming_checkout" // Sắp trả
  | "overdue_checkout"; // Quá giờ trả

// Type từ room_status_view
type RoomStatusViewData = {
  id: string;
  name: string;
  description: string | null;
  room_type: "standard" | "deluxe" | "superior" | "family";
  price_per_night: string;
  max_guests: number;
  amenities: string[];
  status: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  technical_status: string;
  check_in: string | null;
  check_out: string | null;
  booking_status: string | null;
  current_status: string;
  booking_id: string | null;
};

export type RoomWithBooking = Room & {
  currentBooking: {
    id: string;
    check_in: string;
    check_out: string;
    status: string;
  } | null;
  mapStatus: RoomMapStatus;
  isClean: boolean;
};

export function useRoomMap() {
  const [rooms, setRooms] = useState<RoomWithBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoomMap = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const supabase = createClient();

      // Lấy data từ room_status_view
      const { data, error } = await supabase
        .from("room_status_view")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      console.log(data);
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
    fetchRoomMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    rooms,
    isLoading,
    error,
    refetch: fetchRoomMap,
  };
}
