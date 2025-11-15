"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Room, RoomInput, PaginationMeta, ImageValue } from "@/lib/types";
import {
  roomKeys,
  fetchRoomsQuery,
  fetchRoomByIdQuery,
  createRoomMutation,
  updateRoomMutation,
  deleteRoomMutation,
  updateRoomStatusMutation,
} from "@/lib/queries/rooms";

// Re-export types for backward compatibility
export type {
  Room,
  RoomInput,
  RoomWithImages,
  PaginationMeta,
  ImageValue,
} from "@/lib/types";

// Hook for managing rooms list
export function useRooms(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const queryClient = useQueryClient();

  // Fetch rooms with React Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: roomKeys.list(page, limit, search),
    queryFn: () => fetchRoomsQuery(page, limit, search),
  });

  const rooms = data?.rooms || [];
  const pagination = data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  // Create room mutation
  const createRoomMutationHook = useMutation({
    mutationFn: createRoomMutation,
    onSuccess: () => {
      // Invalidate and refetch rooms list
      queryClient.invalidateQueries({ queryKey: roomKeys.lists() });
    },
  });

  // Update room mutation
  const updateRoomMutationHook = useMutation({
    mutationFn: updateRoomMutation,
    onSuccess: () => {
      // Invalidate and refetch rooms list and detail
      queryClient.invalidateQueries({ queryKey: roomKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roomKeys.details() });
    },
  });

  // Delete room mutation
  const deleteRoomMutationHook = useMutation({
    mutationFn: deleteRoomMutation,
    onSuccess: () => {
      // Invalidate and refetch rooms list
      queryClient.invalidateQueries({ queryKey: roomKeys.lists() });
    },
  });

  // Update room status mutation
  const updateRoomStatusMutationHook = useMutation({
    mutationFn: updateRoomStatusMutation,
    onSuccess: ({ id, status }) => {
      // Optimistically update the room in the cache
      queryClient.setQueriesData<{ rooms: Room[]; pagination: PaginationMeta }>(
        { queryKey: roomKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            rooms: old.rooms.map((room) =>
              room.id === id ? { ...room, status } : room
            ),
          };
        }
      );
    },
  });

  return {
    rooms,
    isLoading,
    error: error ? (error as Error).message : null,
    pagination,
    fetchRooms: async () => {
      await refetch();
    },
    createRoom: async (
      input: RoomInput,
      thumbnail?: ImageValue,
      imageList?: ImageValue[]
    ) => {
      return createRoomMutationHook.mutateAsync({
        input,
        thumbnail,
        imageList,
      });
    },
    updateRoom: async (
      id: string,
      input: Partial<RoomInput>,
      thumbnail?: ImageValue,
      imageList?: ImageValue[]
    ) => {
      return updateRoomMutationHook.mutateAsync({
        id,
        input,
        thumbnail,
        imageList,
      });
    },
    deleteRoom: async (id: string) => {
      return deleteRoomMutationHook.mutateAsync(id);
    },
    updateRoomStatus: async (id: string, status: "clean" | "not_clean") => {
      return updateRoomStatusMutationHook.mutateAsync({ id, status });
    },
  };
}

// Hook for getting a single room by ID
export function useRoomById(id: string) {
  return useQuery({
    queryKey: roomKeys.detail(id),
    queryFn: () => fetchRoomByIdQuery(id),
    enabled: !!id,
  });
}
