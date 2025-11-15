import { createClient } from "@/lib/supabase/client";
import type { GalleryImage, PaginationMeta } from "@/lib/types";

// Query keys
export const galleryKeys = {
  all: ["gallery"] as const,
  lists: () => [...galleryKeys.all, "list"] as const,
  list: (page: number, limit: number) =>
    [...galleryKeys.lists(), page, limit] as const,
};

// Fetch gallery images query function
export async function fetchGalleryImagesQuery(
  page: number,
  limit: number
): Promise<{ images: GalleryImage[]; pagination: PaginationMeta }> {
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
  const totalPages = Math.ceil(total / limit);

  return {
    images: imagesData,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

// Add images mutation function
export async function addImagesMutation(urls: string[]): Promise<void> {
  const supabase = createClient();

  // Prepare data for insertion
  const imagesToInsert = urls.map((url) => ({
    url,
    created_at: new Date().toISOString(),
  }));

  // Insert into Supabase images table
  const { error: insertError } = await supabase
    .from("images")
    .insert(imagesToInsert);

  if (insertError) {
    throw new Error(insertError.message);
  }
}

// Delete image mutation function
export async function deleteImageMutation(id: string): Promise<void> {
  const supabase = createClient();

  // Delete from Supabase images table
  const { error: deleteError } = await supabase
    .from("images")
    .delete()
    .eq("id", id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }
}

