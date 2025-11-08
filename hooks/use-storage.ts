"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

import type {
  UploadProgress,
  UploadResult,
  UseStorageOptions,
} from "@/lib/types";

// Re-export types for backward compatibility
export type {
  UploadProgress,
  UploadResult,
  UseStorageOptions,
} from "@/lib/types";

// Hook for uploading files to Supabase Storage
export function useStorage(options: UseStorageOptions = {}) {
  const { bucket = "yhotel", folder = "gallery", onProgress } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Validate file type
  const isValidImageFile = useCallback((file: File): boolean => {
    return file.type.startsWith("image/");
  }, []);

  // Generate unique file name
  const generateFileName = useCallback((file: File): string => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const extension = file.name.split(".").pop();
    const sanitizedName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    return `${sanitizedName}_${timestamp}_${randomString}.${extension}`;
  }, []);

  // Upload single file
  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult> => {
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
    },
    [bucket, folder, isValidImageFile, generateFileName]
  );

  // Upload multiple files
  const uploadFiles = useCallback(
    async (files: File[]): Promise<UploadResult[]> => {
      if (files.length === 0) {
        throw new Error("Vui lòng chọn ít nhất một hình ảnh");
      }

      // Validate all files
      const invalidFiles = files.filter((file) => !isValidImageFile(file));
      if (invalidFiles.length > 0) {
        const invalidNames = invalidFiles.map((f) => f.name).join(", ");
        throw new Error(`Các file sau không phải là hình ảnh: ${invalidNames}`);
      }

      setIsUploading(true);
      setError(null);

      // Initialize progress tracking
      const progress: UploadProgress[] = files.map((file) => ({
        fileName: file.name,
        progress: 0,
        status: "pending",
      }));
      setUploadProgress(progress);
      onProgress?.(progress);

      const results: UploadResult[] = [];
      const errors: { fileName: string; error: string }[] = [];

      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          // Update progress: uploading
          progress[i] = {
            ...progress[i],
            status: "uploading",
            progress: 0,
          };
          setUploadProgress([...progress]);
          onProgress?.(progress);

          // Upload file
          const result = await uploadFile(file);

          // Update progress: success
          progress[i] = {
            ...progress[i],
            status: "success",
            progress: 100,
          };
          setUploadProgress([...progress]);
          onProgress?.(progress);

          results.push(result);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Upload thất bại";

          // Update progress: error
          progress[i] = {
            ...progress[i],
            status: "error",
            progress: 0,
            error: errorMessage,
          };
          setUploadProgress([...progress]);
          onProgress?.(progress);

          errors.push({
            fileName: file.name,
            error: errorMessage,
          });
        }
      }

      // Set error if any files failed
      if (errors.length > 0) {
        const errorMessage = `Không thể tải lên ${errors.length} hình ảnh`;
        setError(errorMessage);
      }

      if (results.length === 0) {
        throw new Error("Không thể tải lên bất kỳ hình ảnh nào");
      }

      setIsUploading(false);
      return results;
    },
    [isValidImageFile, uploadFile, onProgress]
  );

  // Upload files from FileList or File[]
  const upload = useCallback(
    async (files: File[] | FileList): Promise<UploadResult[]> => {
      const fileArray = Array.from(files);
      return uploadFiles(fileArray);
    },
    [uploadFiles]
  );

  // Reset upload state
  const reset = useCallback(() => {
    setIsUploading(false);
    setUploadProgress([]);
    setError(null);
  }, []);

  return {
    upload,
    uploadFiles,
    uploadFile,
    isUploading,
    uploadProgress,
    error,
    reset,
  };
}
