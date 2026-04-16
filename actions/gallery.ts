"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GalleryImage, Result, ResultVoid } from "@/lib/types";
import sharp from "sharp";

type GalleryWebPMigrationSummary = {
  total: number;
  converted: number;
  skipped: number;
  failed: number;
  errors: string[];
};

function extractStorageObjectPath(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = publicUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const encodedPath = publicUrl.slice(markerIndex + marker.length).split("?")[0];
  return decodeURIComponent(encodedPath);
}

function toWebPPath(storagePath: string): string {
  return storagePath.replace(/\.[^/.]+$/, "") + ".webp";
}

async function processWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      await worker(item);
    }
  });

  await Promise.all(runners);
}

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

/**
 * Convert existing gallery images to WebP and update records.
 */
export async function convertGalleryImagesToWebPAction(): Promise<
  Result<GalleryWebPMigrationSummary>
> {
  const supabase = await createClient();
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "yhotel";

  const { data, error } = await supabase
    .from("images")
    .select("id, url")
    .is("deleted_at", null);

  if (error) {
    console.error("Error fetching gallery images for WebP conversion:", error);
    return {
      ok: false,
      message: "Không thể tải danh sách ảnh để chuyển đổi WebP",
    };
  }

  const images = (data ?? []) as GalleryImage[];
  const summary: GalleryWebPMigrationSummary = {
    total: images.length,
    converted: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  await processWithConcurrency(images, 4, async (image) => {
    const lowerUrl = image.url.toLowerCase();
    if (lowerUrl.endsWith(".webp") || lowerUrl.includes(".webp?")) {
      summary.skipped += 1;
      return;
    }

    try {
      const objectPath = extractStorageObjectPath(image.url, bucket);
      if (!objectPath) {
        throw new Error("Không xác định được đường dẫn file trong Storage");
      }

      const { data: sourceImage, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(objectPath);

      if (downloadError || !sourceImage) {
        throw new Error(
          `Tải ảnh gốc thất bại: ${downloadError?.message ?? "Không có dữ liệu"}`
        );
      }

      const arrayBuffer = await sourceImage.arrayBuffer();
      const webpBuffer = await sharp(Buffer.from(arrayBuffer))
        .rotate()
        .webp({ quality: 82 })
        .toBuffer();

      const webpPath = toWebPPath(objectPath);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(webpPath, webpBuffer, {
          cacheControl: "3600",
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload WebP thất bại: ${uploadError.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(webpPath);

      const { error: updateError } = await supabase
        .from("images")
        .update({ url: publicUrl })
        .eq("id", image.id);

      if (updateError) {
        throw new Error(`Cập nhật URL thất bại: ${updateError.message}`);
      }

      if (objectPath !== webpPath) {
        const { error: removeError } = await supabase.storage
          .from(bucket)
          .remove([objectPath]);

        if (removeError) {
          console.warn("Could not remove original image after WebP conversion:", {
            imageId: image.id,
            path: objectPath,
            message: removeError.message,
          });
        }
      }

      summary.converted += 1;
    } catch (conversionError) {
      summary.failed += 1;
      const message =
        conversionError instanceof Error
          ? conversionError.message
          : "Lỗi không xác định";
      summary.errors.push(`${image.id}: ${message}`);
    }
  });

  revalidatePath("/dashboard/gallery");

  return {
    ok: true,
    data: summary,
  };
}
