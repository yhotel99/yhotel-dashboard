"use client"
import { createClient } from "@/lib/supabase/client";
import type { UploadResult } from "@/lib/types";
import { isValidImageFile, generateFileName } from "@/lib/functions";

const CLIENT_WEBP_QUALITY = 0.85;

function changeFileExtensionToWebP(fileName: string): string {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  return `${baseName}.webp`;
}

async function convertImageFileToWebP(file: File): Promise<File> {
  if (file.type === "image/webp" || file.type === "image/svg+xml") {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Không thể đọc file ${file.name}`));
      image.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Trình duyệt không hỗ trợ chuyển đổi ảnh");
    }

    context.drawImage(image, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", CLIENT_WEBP_QUALITY);
    });

    if (!blob) {
      throw new Error(`Không thể chuyển đổi file ${file.name} sang WebP`);
    }

    return new File([blob], changeFileExtensionToWebP(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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

  const normalizedFile = await convertImageFileToWebP(file);
  const supabase = createClient();
  const fileName = generateFileName(normalizedFile);
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  // Upload file to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, normalizedFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: normalizedFile.type,
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
