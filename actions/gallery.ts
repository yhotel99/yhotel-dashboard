"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GalleryImage } from "@/lib/types";

/**
 * Add gallery images
 * @param urls - Array of image URLs to add
 * @returns Created gallery images
 */
export async function addGalleryImagesAction(
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

    // Revalidate gallery page
    revalidatePath("/dashboard/gallery");

    return (data || []) as GalleryImage[];
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể thêm hình ảnh";
    throw new Error(errorMessage);
  }
}

/**
 * Delete gallery image (soft delete)
 * @param id - Image ID to delete
 */
export async function deleteGalleryImageAction(id: string): Promise<void> {
  try {
    const supabase = await createClient();

    // Soft delete from Supabase images table
    const { error } = await supabase
      .from("images")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate gallery page
    revalidatePath("/dashboard/gallery");
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Không thể xóa hình ảnh";
    throw new Error(errorMessage);
  }
}
