import { createClient } from "@/lib/supabase/client";
import type { UploadResult } from "@/lib/types";

// Validate file type
export function isValidImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

// Generate unique file name
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

// Upload single file
export async function uploadFileToStorage(
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

