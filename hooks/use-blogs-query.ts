"use client";

import { useMemo, useCallback } from "react";
import useSWR from "swr";
import type {
  Blog,
  BlogInput,
  PaginationMeta,
} from "@/lib/types";
import {
  searchBlogs,
  createBlog as createBlogService,
  updateBlog as updateBlogService,
  updateBlogStatus as updateBlogStatusService,
  deleteBlog as deleteBlogService,
  getBlogById as getBlogByIdService,
} from "@/services/blogs";

// Type for SWR data
type BlogsData = {
  blogs: Blog[];
  pagination: PaginationMeta;
};

// Fetcher function for SWR
async function blogsFetcher(key: string): Promise<BlogsData> {
  const [, page, limit, search] = key.split(":");
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const trimmedSearch = search === "null" ? null : search;

  const { data, pagination } = await searchBlogs({
    search: trimmedSearch,
    page: pageNum,
    limit: limitNum,
  });

  return {
    blogs: data,
    pagination,
  };
}

/**
 * Hook for managing blogs with SWR
 * @param page - Page number
 * @param limit - Items per page
 * @param search - Search term
 * @param enabled - Whether to enable fetching (default: true)
 */
export function useBlogsQuery(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  enabled: boolean = true
) {
  // Create SWR key from params
  const swrKey = useMemo(() => {
    if (!enabled) return null;
    return `blogs:${page}:${limit}:${search?.trim() || "null"}`;
  }, [page, limit, search, enabled]);

  // Use SWR to fetch blogs
  const { data, error, isLoading, mutate } = useSWR<BlogsData>(
    swrKey,
    blogsFetcher
  );

  const blogs = data?.blogs || [];
  const pagination: PaginationMeta = data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  // Create blog
  const createBlog = useCallback(
    async (input: BlogInput) => {
      try {
        const newBlog = await createBlogService(input);

        // Revalidate SWR cache
        await mutate();
        return newBlog;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Update blog
  const updateBlog = useCallback(
    async (id: string, input: Partial<BlogInput>) => {
      try {
        const updatedBlog = await updateBlogService(id, input);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            blogs: current.blogs.map((blog) => {
              if (blog.id === id) {
                return updatedBlog;
              }
              return blog;
            }),
          };
        }, false);

        // Revalidate to ensure consistency
        await mutate();
        return updatedBlog;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Update blog status only
  const updateBlogStatus = useCallback(
    async (id: string, status: Blog["status"]) => {
      try {
        const updatedBlog = await updateBlogStatusService(id, status);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            blogs: current.blogs.map((blog) => {
              if (blog.id === id) {
                return { ...blog, status: updatedBlog.status };
              }
              return blog;
            }),
          };
        }, false);

        // Revalidate to ensure consistency
        await mutate();
        return updatedBlog;
      } catch (err) {
        throw err;
      }
    },
    [mutate]
  );

  // Delete blog
  const deleteBlog = useCallback(
    async (id: string) => {
      try {
        await deleteBlogService(id);

        // Optimistically update SWR cache
        await mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            blogs: current.blogs.filter((blog) => blog.id !== id),
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

  // Get blog by ID
  const getBlogById = useCallback(
    async (id: string): Promise<Blog | null> => {
      try {
        return await getBlogByIdService(id);
      } catch {
        return null;
      }
    },
    []
  );

  // Refetch blogs
  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    blogs,
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Không thể tải danh sách blog"
      : null,
    pagination,
    createBlog,
    updateBlog,
    updateBlogStatus,
    deleteBlog,
    getBlogById,
    refetch,
    mutate,
  };
}

