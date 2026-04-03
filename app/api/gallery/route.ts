import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { GalleryImage } from "@/lib/types";

/**
 * GET /api/gallery
 * Fetch gallery images with pagination
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 24);

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Fetch data with pagination from images table
    const { data, error, count } = await supabase
      .from("images")
      .select("id, url, created_at", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const imagesData = (data || []) as GalleryImage[];
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: imagesData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách hình ảnh";
    console.error("Error fetching gallery images:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
