"use client";

import { useMemo, useCallback } from "react";
import useSWR from "swr";
import type { Profile, PaginationMeta } from "@/lib/types";
import {
  searchProfiles,
  countProfiles,
  getProfileById as getProfileByIdService,
  updateProfile as updateProfileService,
  deleteProfile as deleteProfileService,
} from "@/services/profiles";

// Type for SWR data
type ProfilesData = {
  profiles: Profile[];
  pagination: PaginationMeta;
};

// Fetcher function for SWR
async function profilesFetcher(key: string): Promise<ProfilesData> {
  const [, page, limit, search] = key.split(":");
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const trimmedSearch = search === "null" ? null : search;

  // Call both service functions in parallel for better performance
  const [profilesData, total] = await Promise.all([
    searchProfiles({
      search: trimmedSearch,
      page: pageNum,
      limit: limitNum,
    }),
    countProfiles({ search: trimmedSearch }),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  return {
    profiles: profilesData,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
  };
}

/**
 * Hook for managing profiles with SWR
 * @param page - Page number
 * @param limit - Items per page
 * @param search - Search term
 */
export function useProfilesQuery(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  // Create SWR key from params
  const swrKey = useMemo(
    () => `profiles:${page}:${limit}:${search?.trim() || "null"}`,
    [page, limit, search]
  );

  // Use SWR to fetch profiles
  const { data, error, isLoading, mutate } = useSWR<ProfilesData>(
    swrKey,
    profilesFetcher
  );

  const profiles = data?.profiles || [];
  const pagination: PaginationMeta = data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  // Create profile (via API route to avoid session change)
  const createProfile = useCallback(
    async (
      input: Omit<
        Profile,
        "id" | "created_at" | "updated_at" | "deleted_at"
      > & {
        password: string;
      }
    ) => {
      try {
        // Call API route to create user (server-side with admin client)
        const response = await fetch("/api/users/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: input.email,
            password: input.password,
            full_name: input.full_name,
            phone: input.phone || null,
            role: input.role,
            status: input.status,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Không thể tạo người dùng");
        }

        // Revalidate SWR cache
        await mutate();
        return data.user;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Update profile
  const updateProfile = useCallback(
    async (
      id: string,
      input: Partial<
        Omit<Profile, "id" | "created_at" | "updated_at" | "deleted_at">
      >
    ) => {
      try {
        const updatedProfile = await updateProfileService(id, input);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            profiles: current.profiles.map((profile) => {
              if (profile.id === id) {
                return updatedProfile;
              }
              return profile;
            }),
          };
        }, false);

        // Revalidate to ensure consistency
        await mutate();
        return updatedProfile;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Delete profile (soft delete)
  const deleteProfile = useCallback(
    async (id: string) => {
      try {
        await deleteProfileService(id);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            profiles: current.profiles.filter((profile) => profile.id !== id),
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

  // Get profile by ID
  const getProfileById = useCallback(
    async (id: string): Promise<Profile | null> => {
      try {
        return await getProfileByIdService(id);
      } catch (err) {
        console.error("Error getting profile:", err);
        return null;
      }
    },
    []
  );

  // Refetch profiles
  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    profiles,
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách người dùng"
      : null,
    pagination,
    createProfile,
    updateProfile,
    deleteProfile,
    getProfileById,
    refetch,
    mutate,
  };
}

