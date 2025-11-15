"use client";

import { useState, useCallback } from "react";
import type {
  UploadProgress,
  UploadResult,
  UseStorageOptions,
} from "@/lib/types";
import { uploadFileToStorage, isValidImageFile } from "@/lib/storage";

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

  // Upload single file
  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult> => {
      return uploadFileToStorage(file, bucket, folder);
    },
    [bucket, folder]
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
          const result = await uploadFileToStorage(file, bucket, folder);

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
    [bucket, folder, onProgress]
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
