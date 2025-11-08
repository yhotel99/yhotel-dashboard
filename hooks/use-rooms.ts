"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Room,
  RoomInput,
  RoomWithImages,
  PaginationMeta,
  ImageValue,
} from "@/lib/types";

// Re-export types for backward compatibility
export type {
  Room,
  RoomInput,
  RoomWithImages,
  PaginationMeta,
  ImageValue,
} from "@/lib/types";

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
    async (
      input: RoomInput,
      thumbnail?: ImageValue,
      imageList?: ImageValue[]
    ) => {
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

        // Refetch current page to update total count
        // Note: New room will appear on page 1 due to ordering by created_at desc
        // The calling component should navigate to page 1 if needed
        await fetchRooms(page, limit, search);
        return newRoom;
      } catch (err) {
        throw err;
      }
    },
    [fetchRooms, page, limit, search]
  );

  // Update room
  const updateRoom = useCallback(
    async (
      id: string,
      input: Partial<RoomInput>,
      thumbnail?: ImageValue,
      imageList?: ImageValue[]
    ) => {
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

        // Refetch current page to ensure consistency
        await fetchRooms(page, limit, search);
        return updatedRoom;
      } catch (err) {
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
      } catch (err) {
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


// Hook for getting a single room with images
export function useRoom(id: string | null) {
  const [room, setRoom] = useState<RoomWithImages | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Handle null id case - reset state asynchronously to avoid linter warning
  useEffect(() => {
    if (!id) {
      const timer = setTimeout(() => {
        setIsLoading(false);
        setRoom(null);
        setError(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }

    isMountedRef.current = true;

    // Abort previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchRoom = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const supabase = createClient();

        // Fetch room data with nested room_images and images in one query
        const { data, error: fetchError } = await supabase
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

        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        if (fetchError || !data) {
          // Only update state if not aborted and component is still mounted
          if (!abortController.signal.aborted && isMountedRef.current) {
            setRoom(null);
            setIsLoading(false);
          }
          return;
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

        // Remove room_images from roomData before setting state
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { room_images, ...roomWithoutImages } = roomData;

        // Only update state if not aborted and component is still mounted
        if (!abortController.signal.aborted && isMountedRef.current) {
          setRoom({
            ...(roomWithoutImages as Room),
            thumbnail,
            images,
          });
          setIsLoading(false);
        }
      } catch (err) {
        // Ignore AbortError
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        // Only update state if not aborted and component is still mounted
        if (!abortController.signal.aborted && isMountedRef.current) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Không thể tải thông tin phòng";
          setError(errorMessage);
          setRoom(null);
          setIsLoading(false);
        }
      }
    };

    fetchRoom();

    // Cleanup function to abort request when component unmounts or id changes
    return () => {
      isMountedRef.current = false;
      abortController.abort();
    };
  }, [id]);

  return { room, isLoading, error };
}
