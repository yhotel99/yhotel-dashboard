"use client";

import { useState, useEffect, useCallback } from "react";
import type { Profile, PaginationMeta } from "@/lib/types";
import {
  searchProfiles,
  updateProfile as updateProfileService,
  deleteProfile as deleteProfileService,
  getProfileById as getProfileByIdService,
} from "@/services/profiles";

// Re-export types for backward compatibility
export type { Profile, PaginationMeta } from "@/lib/types";

// Hook for managing profiles
export function useProfiles(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // Fetch profiles with pagination and search
  const fetchProfiles = useCallback(
    async (
      pageNum: number = page,
      limitNum: number = limit,
      searchTerm: string = search
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        const trimmedSearch = searchTerm?.trim() || null;
        const { profiles: profilesData, total } = await searchProfiles(
          trimmedSearch,
          pageNum,
          limitNum
        );

        const totalPages = Math.ceil(total / limitNum);

        setProfiles(profilesData);
        setPagination({
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách người dùng";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [page, limit, search]
  );

  // Load profiles on mount or when page/limit/search changes
  useEffect(() => {
    fetchProfiles(page, limit, search);
  }, [page, limit, search, fetchProfiles]);

  // Create user (via API route to avoid session change)
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

        // Refetch current page to update total count
        // Wait a bit for trigger to create profile
        // await new Promise((resolve) => setTimeout(resolve, 500));
        await fetchProfiles(page, limit, search);

        return data.user;
      } catch (err) {
        throw err;
      }
    },
    [fetchProfiles, page, limit, search]
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

        // Refetch current page to ensure consistency
        await fetchProfiles(page, limit, search);
        return updatedProfile;
      } catch (err) {
        throw err;
      }
    },
    [fetchProfiles, page, limit, search]
  );

  // Delete profile (soft delete)
  const deleteProfile = useCallback(
    async (id: string) => {
      try {
        await deleteProfileService(id);

        // Refetch current page to ensure consistency
        await fetchProfiles(page, limit, search);
      } catch (err) {
        throw err;
      }
    },
    [fetchProfiles, page, limit, search]
  );

  // Get profile by ID
  const getProfileById = useCallback(
    async (id: string): Promise<Profile | null> => {
      return getProfileByIdService(id);
    },
    []
  );

  return {
    profiles,
    isLoading,
    error,
    pagination,
    fetchProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    getProfileById,
  };
}
