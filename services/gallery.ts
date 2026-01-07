
import { createClient } from "@/lib/supabase/server";
import type { GalleryImage, PaginationMeta } from "@/lib/types";

/**
 * Search gallery images with pagination
 * @param page - Page number
 * @param limit - Items per page
 * @returns Object containing images array and pagination metadata
 */
export async function searchGalleryImages({
  page,
  limit,
}: {
  page: number;
  limit: number;
}): Promise<{
  data: GalleryImage[];
  pagination: PaginationMeta;
}> {
  try {
    const supabase = await createClient();

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
      throw new Error(error.message);
    }

    const imagesData = (data || []) as GalleryImage[];
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: imagesData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể tải danh sách hình ảnh";
    throw new Error(errorMessage);
  }
}

/**
 * Add gallery images
 * @param urls - Array of image URLs to add
 * @returns Created gallery images
 */
export async function addGalleryImages(
  urls: string[]
): Promise<GalleryImage[]> {
  try {
    const supabase = await createClient();

    // Prepare data for insertion
    const imagesToInsert = urls.map((url) => ({
      url,
      created_at: new Date().toISOString(),
    }));

    // Insert into Supabase images table
    const { data, error } = await supabase
      .from("images")
      .insert(imagesToInsert)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as GalleryImage[];
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể thêm hình ảnh";
    throw new Error(errorMessage);
  }
}

/**
 * Delete gallery image
 * @param id - Image ID to delete
 */
export async function deleteGalleryImage(id: string): Promise<void> {
  try {
    const supabase = await createClient();

    // Delete from Supabase images table
    const { error } = await supabase
      .from("images")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể xóa hình ảnh";
    throw new Error(errorMessage);
  }
}
