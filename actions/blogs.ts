"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Blog, BlogInput, BlogStatus } from "@/lib/types";

/**
 * Create a new blog
 * @param input - Blog input data
 */
export async function createBlog(input: BlogInput) {
  try {
    const supabase = await createClient();

    // Get current user for author_id
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Người dùng chưa đăng nhập");
    }

    const { error } = await supabase.from("blogs").insert([
      {
        ...input,
        author_id: user.id,
      },
    ]);

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate blogs page after creating
    revalidatePath("/dashboard/blogs");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tạo blog";
    throw new Error(errorMessage);
  }
}

/**
 * Update blog
 * @param id - Blog ID
 * @param input - Partial blog input data
 */
export async function updateBlog(id: string, input: Partial<BlogInput>) {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("blogs").update(input).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate blogs page after updating
    revalidatePath("/dashboard/blogs");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể cập nhật blog";
    throw new Error(errorMessage);
  }
}

/**
 * Update blog status only
 * @param id - Blog ID
 * @param status - New status
 */
export async function updateBlogStatus(id: string, status: BlogStatus) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("blogs")
      .update({ status })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate blogs page after updating status
    revalidatePath("/dashboard/blogs");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể cập nhật trạng thái blog";
    throw new Error(errorMessage);
  }
}

/**
 * Delete blog (soft delete)
 * @param id - Blog ID
 */
export async function deleteBlog(id: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("blogs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate blogs page after deleting
    revalidatePath("/dashboard/blogs");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể xóa blog";
    throw new Error(errorMessage);
  }
}

/**
 * Get blog by ID
 * @param id - Blog ID
 * @returns Blog or null
 */
export async function getBlogByIdAction(id: string): Promise<Blog | null> {
  try {
    const supabase = await createClient();

    // Fetch blog data with author info
    const { data, error } = await supabase
      .from("blogs")
      .select(
        `
        *,
        profiles!blogs_author_id_fkey (
          id,
          full_name,
          email
        )
      `
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return null;
    }

    type BlogWithAuthorData = Blog & {
      profiles?: {
        id: string;
        full_name: string;
        email: string;
      } | null;
    };

    const blogData = data as BlogWithAuthorData;
    const { profiles, ...blogWithoutAuthor } = blogData;

    return {
      ...blogWithoutAuthor,
      author: profiles
        ? {
            full_name: profiles.full_name,
            email: profiles.email,
          }
        : null,
    } as Blog;
  } catch {
    return null;
  }
}

/**
 * Get blog by slug
 * @param slug - Blog slug
 * @returns Blog or null
 */
export async function getBlogBySlugAction(slug: string): Promise<Blog | null> {
  try {
    const supabase = await createClient();

    // Fetch blog data with author info
    const { data, error } = await supabase
      .from("blogs")
      .select(
        `
        *,
        profiles!blogs_author_id_fkey (
          id,
          full_name,
          email
        )
      `
      )
      .eq("slug", slug)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return null;
    }

    type BlogWithAuthorData = Blog & {
      profiles?: {
        id: string;
        full_name: string;
        email: string;
      } | null;
    };

    const blogData = data as BlogWithAuthorData;
    const { profiles, ...blogWithoutAuthor } = blogData;

    return {
      ...blogWithoutAuthor,
      author: profiles
        ? {
            full_name: profiles.full_name,
            email: profiles.email,
          }
        : null,
    } as Blog;
  } catch {
    return null;
  }
}
