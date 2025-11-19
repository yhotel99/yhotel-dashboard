import { createClient } from "@/lib/supabase/client";
import type { GalleryImage } from "@/lib/types";

/**
 * Search gallery images with pagination
 * @param page - Page number
 * @param limit - Items per page
 * @returns Object with images array and total count
 */
export async function searchGalleryImages(
  page: number,
  limit: number
): Promise<{ images: GalleryImage[]; total: number }> {
  try {
    const supabase = createClient();

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Fetch data with pagination from images table
    const { data, error, count } = await supabase
      .from("images")
      .select("id, url, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const imagesData = (data || []) as GalleryImage[];
    const total = count || 0;

    return {
      images: imagesData,
      total,
    };
  } catch (err) {
    console.error("Error searching gallery images:", err);
    throw err;
  }
}

/**
 * Add images to gallery
 * @param urls - Array of image URLs
 */
export async function addGalleryImages(urls: string[]): Promise<void> {
  try {
    const supabase = createClient();

    // Prepare data for insertion
    const imagesToInsert = urls.map((url) => ({
      url,
      created_at: new Date().toISOString(),
    }));

    // Insert into Supabase images table
    const { error } = await supabase.from("images").insert(imagesToInsert);

    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    console.error("Error adding gallery images:", err);
    throw err;
  }
}

/**
 * Delete image from gallery
 * @param id - Image ID
 */
export async function deleteGalleryImage(id: string): Promise<void> {
  try {
    const supabase = createClient();

    // Delete from Supabase images table
    const { error } = await supabase.from("images").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    console.error("Error deleting gallery image:", err);
    throw err;
  }
}

