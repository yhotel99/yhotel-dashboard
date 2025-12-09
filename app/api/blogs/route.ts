import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Blog, PaginationMeta } from "@/lib/types";

/**
 * GET /api/blogs
 * Search blogs with pagination and search
 * Query parameters:
 * - search: Search term (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Page and limit must be greater than 0" },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ error: error.message }, { status: 400 });
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

    const response: {
      data: Blog[];
      pagination: PaginationMeta;
    } = {
      data: blogsData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách blog";
    console.error("Error fetching blogs:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
