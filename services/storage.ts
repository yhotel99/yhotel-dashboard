import { createClient } from "@/lib/supabase/client";
import type { UploadResult } from "@/lib/types";

/**
 * Validate file type
 * @param file - File to validate
 * @returns True if file is an image
 */
export function isValidImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Generate unique file name
 * @param file - File to generate name for
 * @returns Unique file name
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
 * Upload single file to Supabase Storage
 * @param file - File to upload
 * @param bucket - Storage bucket name
 * @param folder - Folder path in bucket
 * @returns Upload result with URL and path
 */
export async function uploadFile(
  file: File,
  bucket: string = "yhotel",
  folder: string = "gallery"
): Promise<UploadResult> {
  if (!isValidImageFile(file)) {
    throw new Error(`File ${file.name} không phải là hình ảnh`);
  }

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
}

/**
 * Upload multiple files to Supabase Storage
 * @param files - Array of files to upload
 * @param bucket - Storage bucket name
 * @param folder - Folder path in bucket
 * @returns Array of upload results
 */
export async function uploadFiles(
  files: File[],
  bucket: string = "yhotel",
  folder: string = "gallery"
): Promise<UploadResult[]> {
  if (files.length === 0) {
    throw new Error("Vui lòng chọn ít nhất một hình ảnh");
  }

  // Validate all files
  const invalidFiles = files.filter((file) => !isValidImageFile(file));
  if (invalidFiles.length > 0) {
    const invalidNames = invalidFiles.map((f) => f.name).join(", ");
    throw new Error(`Các file sau không phải là hình ảnh: ${invalidNames}`);
  }

  const results: UploadResult[] = [];
  const errors: { fileName: string; error: string }[] = [];

  // Upload files sequentially to avoid overwhelming the server
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const result = await uploadFile(file, bucket, folder);
      results.push(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Upload thất bại";
      errors.push({
        fileName: file.name,
        error: errorMessage,
      });
    }
  }

  if (results.length === 0) {
    throw new Error("Không thể tải lên bất kỳ hình ảnh nào");
  }

  return results;
}
