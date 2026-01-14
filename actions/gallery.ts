"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GalleryImage, Result, ResultVoid } from "@/lib/types";

/**
 * Add gallery images
 * @param urls - Array of image URLs to add
 * @returns Created gallery images
 */
export async function addGalleryImagesAction(
  urls: string[]
): Promise<Result<GalleryImage[]>> {
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
    console.error("Error adding gallery images:", error);
    return {
      ok: false,
      message: "Không thể thêm hình ảnh",
    };
  }

  // Revalidate gallery page
  revalidatePath("/dashboard/gallery");

  return {
    ok: true,
    data: (data || []) as GalleryImage[],
  };
}

/**
 * Delete gallery image (soft delete)
 * @param id - Image ID to delete
 */
export async function deleteGalleryImageAction(
  id: string
): Promise<ResultVoid> {
  const supabase = await createClient();

  // Soft delete from Supabase images table
  const { error } = await supabase
    .from("images")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error deleting gallery image:", error);
    return {
      ok: false,
      message: "Không thể xóa hình ảnh",
    };
  }

  // Revalidate gallery page
  revalidatePath("/dashboard/gallery");
  
  return { ok: true };
}
