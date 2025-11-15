"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Profile, PaginationMeta } from "@/lib/types";
import {
  profileKeys,
  fetchProfilesQuery,
  createProfileMutation,
  updateProfileMutation,
  updatePasswordMutation,
  deleteProfileMutation,
} from "@/lib/queries/profiles";

// Re-export types for backward compatibility
export type { Profile, PaginationMeta } from "@/lib/types";

// Hook for managing profiles list
export function useProfiles(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const queryClient = useQueryClient();

  // Fetch profiles with React Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: profileKeys.list(page, limit, search),
    queryFn: () => fetchProfilesQuery(page, limit, search),
  });

  const profiles = data?.profiles || [];
  const pagination = data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  // Create profile mutation
  const createProfileMutationHook = useMutation({
    mutationFn: createProfileMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
    },
  });

  // Update profile mutation
  const updateProfileMutationHook = useMutation({
    mutationFn: updateProfileMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: profileKeys.details() });
    },
  });

  // Update password mutation
  const updatePasswordMutationHook = useMutation({
    mutationFn: updatePasswordMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.details() });
    },
  });

  // Delete profile mutation
  const deleteProfileMutationHook = useMutation({
    mutationFn: deleteProfileMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
    },
  });

  return {
    profiles,
    isLoading,
    error: error ? (error as Error).message : null,
    pagination,
    fetchProfiles: async () => {
      await refetch();
    },
    createProfile: async (
      input: Omit<
        Profile,
        "id" | "created_at" | "updated_at" | "deleted_at"
      > & {
        password: string;
      }
    ) => {
      return createProfileMutationHook.mutateAsync({
        email: input.email,
        password: input.password,
        full_name: input.full_name,
        phone: input.phone || null,
        role: input.role,
        status: input.status,
      });
    },
    updateProfile: async (
      id: string,
      input: Partial<
        Omit<Profile, "id" | "created_at" | "updated_at" | "deleted_at">
      >
    ) => {
      return updateProfileMutationHook.mutateAsync({ id, input });
    },
    updatePassword: async (id: string, newPassword: string) => {
      return updatePasswordMutationHook.mutateAsync({ id, newPassword });
    },
    deleteProfile: async (id: string) => {
      return deleteProfileMutationHook.mutateAsync(id);
    },
  };
}
