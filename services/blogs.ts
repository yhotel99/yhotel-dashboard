
import { createClient } from "@/lib/supabase/server";
import type { Blog, BlogInput, PaginationMeta } from "@/lib/types";

/**
 * Search blogs with pagination and search
 * @param search - Search term
 * @param page - Page number
 * @param limit - Items per page
 * @returns Object containing blogs array and pagination metadata
 */
export async function searchBlogs({
  search,
  page,
  limit,
}: {
  search: string | null;
  page: number;
  limit: number;
}): Promise<{
  data: Blog[];
  pagination: PaginationMeta;
}> {
  try {
    const supabase = await createClient();

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query with profiles join for author info
    let query = supabase
      .from("blogs")
      .select(
        `
        *,
        profiles!blogs_author_id_fkey (
          id,
          full_name,
          email
        )
      `,
        { count: "exact" }
      )
      .is("deleted_at", null);

    // Add search filter if search term exists
    if (search && search.trim() !== "") {
      query = query.or(
        `title.ilike.%${search.trim()}%,content.ilike.%${search.trim()}%,slug.ilike.%${search.trim()}%`
      );
    }

    // Fetch data with pagination
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    // Process blogs to extract author info
    type BlogWithAuthorData = Blog & {
      profiles?: {
        id: string;
        full_name: string;
        email: string;
      } | null;
    };

    const blogsData = (data || []).map((blog: BlogWithAuthorData) => {
      const { profiles, ...blogWithoutAuthor } = blog;

      return {
        ...blogWithoutAuthor,
        author: profiles
          ? {
              full_name: profiles.full_name,
              email: profiles.email,
            }
          : null,
      } as Blog;
    });

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: blogsData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách blog";
    throw new Error(errorMessage);
  }
}

/**
 * Create a new blog
 * @param input - Blog input data
 * @returns Created blog record
 */
export async function createBlog(input: BlogInput): Promise<Blog> {
  try {
    const supabase = await createClient();

    // Get current user for author_id
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Người dùng chưa đăng nhập");
    }

    const { data, error } = await supabase
      .from("blogs")
      .insert([
        {
          ...input,
          author_id: user.id,
        },
      ])
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
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Process blog to extract author info
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
 * @returns Updated blog record
 */
export async function updateBlog(
  id: string,
  input: Partial<BlogInput>
): Promise<Blog> {
  try {
    const supabase = await createClient();

    // Update blog data
    const { data, error } = await supabase
      .from("blogs")
      .update(input)
      .eq("id", id)
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
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Process blog to extract author info
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
 * @returns Updated blog record
 */
export async function updateBlogStatus(
  id: string,
  status: Blog["status"]
): Promise<Blog> {
  try {
    const supabase = await createClient();

    // Update only blog status
    const { data, error } = await supabase
      .from("blogs")
      .update({ status })
      .eq("id", id)
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
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Process blog to extract author info
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
export async function deleteBlog(id: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("blogs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
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
export async function getBlogById(id: string): Promise<Blog | null> {
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
