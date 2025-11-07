"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Room data type matching database schema
export type Room = {
  id: string;
  name: string;
  description: string | null;
  room_type: "standard" | "deluxe" | "superior" | "family";
  price_per_night: number;
  max_guests: number;
  amenities: string[];
  status: "available" | "maintenance" | "inactive";
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

// Room input type for create/update
export type RoomInput = {
  name: string;
  description?: string | null;
  room_type: "standard" | "deluxe" | "superior" | "family";
  price_per_night: number;
  max_guests: number;
  amenities: string[];
  status: "available" | "maintenance" | "inactive";
};

// Pagination metadata type
export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Hook for managing rooms
export function useRooms(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // Fetch rooms with pagination and search
  const fetchRooms = useCallback(
    async (
      pageNum: number = page,
      limitNum: number = limit,
      searchTerm: string = search
    ) => {
      try {
        setIsLoading(true);
        setError(null);
        const supabase = createClient();

        // Calculate offset
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        // Build query
        let query = supabase
          .from("rooms")
          .select("*", { count: "exact" })
          .is("deleted_at", null);

        // Add search filter if search term exists
        if (searchTerm && searchTerm.trim() !== "") {
          query = query.ilike("name", `%${searchTerm.trim()}%`);
        }

        // Fetch data with pagination
        const { data, error, count } = await query
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) {
          throw new Error(error.message);
        }

        const roomsData = (data || []).map((room) => ({
          ...room,
          amenities: Array.isArray(room.amenities) ? room.amenities : [],
        })) as Room[];

        const total = count || 0;
        const totalPages = Math.ceil(total / limitNum);

        setRooms(roomsData);
        setPagination({
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tải danh sách phòng";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [page, limit, search]
  );

  // Load rooms on mount or when page/limit/search changes
  useEffect(() => {
    fetchRooms(page, limit, search);
  }, [page, limit, search, fetchRooms]);

  // Create room
  const createRoom = useCallback(
    async (input: RoomInput) => {
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

        // Refetch current page to update total count
        // Note: New room will appear on page 1 due to ordering by created_at desc
        // The calling component should navigate to page 1 if needed
        await fetchRooms(page, limit, search);
        toast.success("Tạo phòng thành công!", {
          description: `Phòng ${input.name} đã được tạo thành công.`,
        });
        return newRoom;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tạo phòng";
        toast.error("Tạo phòng thất bại", {
          description: errorMessage,
        });
        throw err;
      }
    },
    [fetchRooms, page, limit, search]
  );

  // Update room
  const updateRoom = useCallback(
    async (id: string, input: Partial<RoomInput>) => {
      try {
        const supabase = createClient();
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

        // Refetch current page to ensure consistency
        await fetchRooms(page, limit, search);
        toast.success("Cập nhật phòng thành công!", {
          description: `Phòng ${updatedRoom.name} đã được cập nhật thành công.`,
        });
        return updatedRoom;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể cập nhật phòng";
        toast.error("Cập nhật phòng thất bại", {
          description: errorMessage,
        });
        throw err;
      }
    },
    [fetchRooms, page, limit, search]
  );

  // Delete room
  const deleteRoom = useCallback(
    async (id: string) => {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("rooms")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", id);

        if (error) {
          throw new Error(error.message);
        }

        // Refetch current page to ensure consistency
        await fetchRooms(page, limit, search);
        toast.success("Xóa phòng thành công!");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể xóa phòng";
        toast.error("Xóa phòng thất bại", {
          description: errorMessage,
        });
        throw err;
      }
    },
    [fetchRooms, page, limit, search]
  );

  // Get room by ID
  const getRoomById = useCallback(async (id: string): Promise<Room | null> => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        ...data,
        amenities: Array.isArray(data.amenities) ? data.amenities : [],
      } as Room;
    } catch {
      return null;
    }
  }, []);

  return {
    rooms,
    isLoading,
    error,
    pagination,
    fetchRooms,
    createRoom,
    updateRoom,
    deleteRoom,
    getRoomById,
  };
}

// Hook for getting a single room
export function useRoom(id: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    const fetchRoom = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", id)
          .is("deleted_at", null)
          .single();

        if (fetchError || !data) {
          setRoom(null);
          return;
        }

        const roomData = {
          ...data,
          amenities: Array.isArray(data.amenities) ? data.amenities : [],
        } as Room;

        setRoom(roomData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tải thông tin phòng";
        setError(errorMessage);
        setRoom(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [id]);

  return { room, isLoading, error };
}
