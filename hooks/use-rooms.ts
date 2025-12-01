"use client";

import { useState, useEffect, useCallback } from "react";
import {
  searchRooms,
  createRoom as createRoomService,
  updateRoom as updateRoomService,
  updateRoomStatus as updateRoomStatusService,
  deleteRoom as deleteRoomService,
  getRoomById as getRoomByIdService,
} from "@/services/rooms";
import type {
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
  search: string = "",
  autoFetch: boolean = true
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

        const { data, pagination: paginationData } = await searchRooms({
          search: searchTerm || null,
          page: pageNum,
          limit: limitNum,
        });

        setRooms(data);
        setPagination(paginationData);
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

  // Load rooms on mount or when page/limit/search changes (only if autoFetch is true)
  useEffect(() => {
    if (autoFetch) {
      fetchRooms(page, limit, search);
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, autoFetch]);

  // Create room
  const createRoom = useCallback(
    async (
      input: RoomInput,
      thumbnail?: ImageValue,
      imageList?: ImageValue[]
    ) => {
      try {
        const newRoom = await createRoomService(input, thumbnail, imageList);

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
        const updatedRoom = await updateRoomService(
          id,
          input,
          thumbnail,
          imageList
        );

        // Refetch current page to ensure consistency
        await fetchRooms(page, limit, search);
        return updatedRoom;
      } catch (err) {
        throw err;
      }
    },
    [fetchRooms, page, limit, search]
  );

  // Update room status only
  const updateRoomStatus = useCallback(
    async (id: string, status: Room["status"]) => {
      try {
        const updatedRoom = await updateRoomStatusService(id, status);

        // Update local state instead of refetching
        setRooms((prevRooms) =>
          prevRooms.map((room) =>
            room.id === id ? { ...room, status: updatedRoom.status } : room
          )
        );

        return updatedRoom;
      } catch (err) {
        throw err;
      }
    },
    []
  );

  // Delete room
  const deleteRoom = useCallback(
    async (id: string) => {
      try {
        await deleteRoomService(id);

        // Refetch current page to ensure consistency
        await fetchRooms(page, limit, search);
      } catch (err) {
        throw err;
      }
    },
    [fetchRooms, page, limit, search]
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

  return {
    rooms,
    isLoading,
    error,
    pagination,
    fetchRooms,
    createRoom,
    updateRoom,
    updateRoomStatus,
    deleteRoom,
    getRoomById,
  };
}
