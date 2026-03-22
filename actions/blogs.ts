"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Blog, BlogInput, BlogStatus, Result, ResultVoid } from "@/lib/types";
import { BLOG_STATUS } from "@/lib/constants";

/**
 * Create a new blog
 * @param input - Blog input data
 */
export async function createBlog(
  input: BlogInput
): Promise<ResultVoid> {
  const supabase = await createClient();

  // Get current user for author_id
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      message: "Người dùng chưa đăng nhập",
    };
  }

  const { error } = await supabase.from("blogs").insert([
    {
      ...input,
      author_id: user.id,
    },
  ]);

  if (error) {
    console.error("Error creating blog:", error);
    return {
      ok: false,
      message: "Không thể tạo blog",
    };
  }

  // Revalidate blogs page after creating
  revalidatePath("/dashboard/blogs");
  
  return { ok: true };
}

/**
 * Update blog
 * @param id - Blog ID
 * @param input - Partial blog input data
 */
export async function updateBlog(
  id: string,
  input: Partial<BlogInput>
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("blogs").update(input).eq("id", id);

  if (error) {
    console.error("Error updating blog:", error);
    return {
      ok: false,
      message: "Không thể cập nhật blog",
    };
  }

  // Revalidate blogs page after updating
  revalidatePath("/dashboard/blogs");
  
  return { ok: true };
}

/**
 * Update blog status only
 * @param id - Blog ID
 * @param status - New status
 */
export async function updateBlogStatus(
  id: string,
  status: BlogStatus
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();


    const { error } = await supabase
      .from("blogs")
      .update({ status, published_at: status === BLOG_STATUS.PUBLISHED ? new Date().toISOString() : null })
      .eq("id", id);

  
  if (error) {
    console.error("Error updating blog status:", error);
    
    // Check for foreign key violations
    if (error.code === "23503") {
      return {
        ok: false,
        message: "Không thể cập nhật trạng thái vì có dữ liệu liên quan.",
      };
    }
    
    return {
      ok: false,
      message: "Không thể cập nhật trạng thái blog. Vui lòng thử lại.",
    };
  }

  // Revalidate blogs page after updating status
  revalidatePath("/dashboard/blogs");
  
  return { ok: true };
}

/**
 * Delete blog (soft delete)
 * @param id - Blog ID
 */
export async function deleteBlog(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("blogs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error deleting blog:", error);
    return {
      ok: false,
      message: "Không thể xóa blog",
    };
  }

  // Revalidate blogs page after deleting
  revalidatePath("/dashboard/blogs");
  
  return { ok: true };
}

/**
 * Get blog by ID
 * @param id - Blog ID
 * @returns Blog or null
 */
export async function getBlogByIdAction(
  id: string
): Promise<Result<Blog>> {
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

  if (error) {
    console.error("Error fetching blog by ID:", error);
    return {
      ok: false,
      message: "Không thể lấy thông tin blog",
    };
  }

  if (!data) {
    return {
      ok: false,
      message: "Không tìm thấy blog",
    };
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
    ok: true,
    data: {
      ...blogWithoutAuthor,
      author: profiles
        ? {
            full_name: profiles.full_name,
            email: profiles.email,
          }
        : null,
    } as Blog,
  };
}

/**
 * Get blog by slug
 * @param slug - Blog slug
 * @returns Blog or null
 */
export async function getBlogBySlugAction(
  slug: string
): Promise<Result<Blog>> {
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

  if (error) {
    console.error("Error fetching blog by slug:", error);
    return {
      ok: false,
      message: "Không thể lấy thông tin blog",
    };
  }

  if (!data) {
    return {
      ok: false,
      message: "Không tìm thấy blog",
    };
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
    ok: true,
    data: {
      ...blogWithoutAuthor,
      author: profiles
        ? {
            full_name: profiles.full_name,
            email: profiles.email,
          }
        : null,
    } as Blog,
  };
}

