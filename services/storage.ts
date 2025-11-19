import { createClient } from "@/lib/supabase/client";
import type { UploadResult } from "@/lib/types";

/**
 * Generate unique file name
 * @param file - File object
 * @returns Generated file name
 */
export function generateFileName(file: File): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 9);
  const extension = file.name.split(".").pop();
  const sanitizedName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();
  return `${sanitizedName}_${timestamp}_${randomString}.${extension}`;
}

/**
 * Validate if file is an image
 * @param file - File object
 * @returns True if file is an image
 */
export function isValidImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Upload single file to Supabase Storage
 * @param file - File to upload
 * @param bucket - Storage bucket name
 * @param folder - Folder path in bucket
 * @returns Upload result with URL and path
 */
export async function uploadFileToStorage(
  file: File,
  bucket: string = "yhotel",
  folder?: string
): Promise<UploadResult> {
  try {
    const supabase = createClient();
    const fileName = generateFileName(file);
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload thất bại: ${uploadError.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath,
    };
  } catch (err) {
    console.error("Error uploading file:", err);
    throw err;
  }
}
