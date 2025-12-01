"use client";

import { useMemo, useCallback } from "react";
import useSWR from "swr";
import type {
  Room,
  RoomInput,
  RoomWithImages,
  PaginationMeta,
  ImageValue,
} from "@/lib/types";
import {
  searchRooms,
  createRoom as createRoomService,
  updateRoom as updateRoomService,
  updateRoomStatus as updateRoomStatusService,
  deleteRoom as deleteRoomService,
  getRoomById as getRoomByIdService,
} from "@/services/rooms";

// Type for SWR data
type RoomsData = {
  rooms: Room[];
  pagination: PaginationMeta;
};

// Fetcher function for SWR
async function roomsFetcher(key: string): Promise<RoomsData> {
  const [, page, limit, search] = key.split(":");
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const trimmedSearch = search === "null" ? null : search;

  const { data, pagination } = await searchRooms({
    search: trimmedSearch,
    page: pageNum,
    limit: limitNum,
  });

  return {
    rooms: data,
    pagination,
  };
}

/**
 * Hook for managing rooms with SWR
 * @param page - Page number
 * @param limit - Items per page
 * @param search - Search term
 * @param enabled - Whether to enable fetching (default: true)
 */
export function useRoomsQuery(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  enabled: boolean = true
) {
  // Create SWR key from params
  const swrKey = useMemo(() => {
    if (!enabled) return null;
    return `rooms:${page}:${limit}:${search?.trim() || "null"}`;
  }, [page, limit, search, enabled]);

  // Use SWR to fetch rooms
  const { data, error, isLoading, mutate } = useSWR<RoomsData>(
    swrKey,
    roomsFetcher
  );

  const rooms = data?.rooms || [];
  const pagination: PaginationMeta = data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  // Create room
  const createRoom = useCallback(
    async (
      input: RoomInput,
      thumbnail?: ImageValue,
      imageList?: ImageValue[]
    ) => {
      try {
        const newRoom = await createRoomService(input, thumbnail, imageList);

        // Revalidate SWR cache
        await mutate();
        return newRoom;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
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
        const updatedRoom = await updateRoomService(
          id,
          input,
          thumbnail,
          imageList
        );

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            rooms: current.rooms.map((room) => {
              if (room.id === id) {
                return updatedRoom;
              }
              return room;
            }),
          };
        }, false);

        // Revalidate to ensure consistency
        await mutate();
        return updatedRoom;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Update room status only
  const updateRoomStatus = useCallback(
    async (id: string, status: Room["status"]) => {
      try {
        const updatedRoom = await updateRoomStatusService(id, status);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            rooms: current.rooms.map((room) => {
              if (room.id === id) {
                return { ...room, status: updatedRoom.status };
              }
              return room;
            }),
          };
        }, false);

        // Revalidate to ensure consistency
        await mutate();
        return updatedRoom;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Delete room
  const deleteRoom = useCallback(
    async (id: string) => {
      try {
        await deleteRoomService(id);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            rooms: current.rooms.filter((room) => room.id !== id),
            pagination: {
              ...current.pagination,
              total: Math.max(0, current.pagination.total - 1),
            },
          };
        }, false);

        // Revalidate to ensure consistency
        await mutate();
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Get room by ID with images
  const getRoomById = useCallback(
    async (id: string): Promise<RoomWithImages | null> => {
      try {
        return await getRoomByIdService(id);
      } catch {
        return null;
      }
    },
    []
  );

  // Refetch rooms
  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    rooms,
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách phòng"
      : null,
    pagination,
    createRoom,
    updateRoom,
    updateRoomStatus,
    deleteRoom,
    getRoomById,
    refetch,
    mutate,
  };
}
