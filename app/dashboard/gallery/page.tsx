"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconPlus,
  IconTrash,
  IconUpload,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useGallery } from "@/hooks/use-gallery";
import { useStorage } from "@/hooks/use-storage";
import { ImageZoom } from "@/components/ui/shadcn-io/image-zoom";
import Image from "next/image";

export default function GalleryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get page and limit from URL search params
  const page = useMemo(() => {
    const pageParam = searchParams.get("page");
    const pageNum = pageParam ? parseInt(pageParam, 10) : 1;
    return pageNum > 0 ? pageNum : 1;
  }, [searchParams]);

  const limit = useMemo(() => {
    const limitParam = searchParams.get("limit");
    const limitNum = limitParam ? parseInt(limitParam, 10) : 18;
    return limitNum > 0 ? limitNum : 18;
  }, [searchParams]);

  const { images, isLoading, pagination, addImages, deleteImage } = useGallery(
    page,
    limit
  );

  // Storage upload hook
  const {
    upload,
    isUploading: isUploadingFiles,
    uploadProgress,
  } = useStorage({
    bucket: "yhotel",
    folder: "gallery",
  });

  // Update URL search params when pagination changes
  const updateSearchParams = useCallback(
    (newPage: number, newLimit: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) {
        params.set("page", newPage.toString());
      } else {
        params.delete("page");
      }
      if (newLimit !== 20) {
        params.set("limit", newLimit.toString());
      } else {
        params.delete("limit");
      }
      router.push(`/dashboard/gallery?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Upload dialog state
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [imageIdToDelete, setImageIdToDelete] = useState<string | null>(null);

  // Store preview items with unique IDs
  type PreviewItem = {
    id: string;
    file: File;
    url: string;
  };
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);

  // Store all URLs that need cleanup on unmount
  const urlsToCleanupRef = useRef<Set<string>>(new Set());

  // Handle file selection
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const newFiles: File[] = Array.from(files);
      const newPreviewItems: PreviewItem[] = [];

      newFiles.forEach((file, index) => {
        if (!file.type.startsWith("image/")) {
          toast.error(`File ${file.name} không phải là hình ảnh`);
          return;
        }

        // Create preview URL and unique ID
        const url = URL.createObjectURL(file);
        const id = `${Date.now()}-${index}-${Math.random()
          .toString(36)
          .substring(2, 11)}-${file.name}`;
        newPreviewItems.push({ id, file, url });
        // Track URL for cleanup on unmount
        urlsToCleanupRef.current.add(url);
      });

      setPreviewItems((prev) => [...prev, ...newPreviewItems]);
    },
    []
  );

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (previewItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một hình ảnh");
      return;
    }

    try {
      // Upload files to storage
      const filesToUpload = previewItems.map((item) => item.file);
      const results = await upload(filesToUpload);

      // Get URLs from upload results
      const uploadedUrls = results.map((result) => result.url);

      // Add to gallery
      await addImages(uploadedUrls);

      // Clean up preview URLs
      previewItems.forEach((item) => {
        URL.revokeObjectURL(item.url);
        // Remove from cleanup tracking
        urlsToCleanupRef.current.delete(item.url);
      });

      // Reset state
      setPreviewItems([]);
      setIsUploadDialogOpen(false);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast.success(`Đã tải lên thành công ${results.length} hình ảnh`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể tải lên hình ảnh";
      toast.error("Tải lên thất bại", {
        description: errorMessage,
      });
    }
  }, [previewItems, upload, addImages]);

  // Handle delete image click - open confirmation dialog
  const handleDeleteClick = useCallback((id: string) => {
    setImageIdToDelete(id);
    setIsDeleteDialogOpen(true);
  }, []);

  // Confirm delete image
  const handleConfirmDelete = useCallback(async () => {
    if (!imageIdToDelete) return;

    try {
      await deleteImage(imageIdToDelete);
      setIsDeleteDialogOpen(false);
      setImageIdToDelete(null);
      toast.success("Đã xóa hình ảnh");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể xóa hình ảnh";
      toast.error("Xóa hình ảnh thất bại", {
        description: errorMessage,
      });
    }
  }, [imageIdToDelete, deleteImage]);

  // Remove preview image
  const handleRemovePreview = useCallback((id: string) => {
    setPreviewItems((prev) => {
      const itemToRemove = prev.find((item) => item.id === id);
      if (itemToRemove) {
        // Revoke object URL to free memory
        URL.revokeObjectURL(itemToRemove.url);
        // Remove from cleanup tracking
        urlsToCleanupRef.current.delete(itemToRemove.url);
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  // Handle dialog close with cleanup
  const handleDialogClose = useCallback(
    (open: boolean) => {
      if (!open && !isUploadingFiles) {
        // Cleanup all preview URLs when dialog closes
        previewItems.forEach((item) => {
          URL.revokeObjectURL(item.url);
          urlsToCleanupRef.current.delete(item.url);
        });
        // Reset preview items
        setPreviewItems([]);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
      setIsUploadDialogOpen(open);
    },
    [previewItems, isUploadingFiles]
  );

  // Cleanup preview URLs on unmount (when navigating away)
  useEffect(() => {
    // Store reference to the Set for cleanup
    const urlsSet = urlsToCleanupRef.current;

    return () => {
      // Cleanup all tracked URLs when component unmounts
      urlsSet.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      urlsSet.clear();
    };
  }, []);

  // Handle empty page after deletion
  useEffect(() => {
    if (!isLoading && pagination.totalPages > 0) {
      if (page > pagination.totalPages) {
        updateSearchParams(pagination.totalPages, limit);
      }
      if (images.length === 0 && page > 1) {
        const targetPage = Math.min(page - 1, pagination.totalPages);
        updateSearchParams(targetPage, limit);
      }
    }
  }, [
    images.length,
    pagination.totalPages,
    page,
    limit,
    isLoading,
    updateSearchParams,
  ]);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 h-full">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Gallery</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và xem hình ảnh trong hệ thống
          </p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)} className="gap-2">
          <IconPlus className="size-4" />
          Tải ảnh lên
        </Button>
      </div>

      <div className="px-4 lg:px-6 flex flex-col h-full">
        {/* Image Count */}
        <div className="mb-4 text-muted-foreground text-sm">
          Hiển thị {images.length} trong tổng số {pagination.total} hình ảnh
        </div>

        {/* Image Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 mb-4">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg" />
            ))}
          </div>
        ) : images.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 mb-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="group relative aspect-square overflow-hidden rounded-lg border bg-card"
                >
                  <ImageZoom className="relative aspect-square">
                    <Image
                      src={image.url}
                      alt=""
                      fill
                      className="object-contain w-full h-full"
                      loading="lazy"
                    />
                  </ImageZoom>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 z-10 shadow-lg pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(image.id);
                    }}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-auto">
                <div className="text-muted-foreground text-sm">
                  Trang {pagination.page} / {pagination.totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateSearchParams(page - 1, limit)}
                    disabled={page <= 1}
                  >
                    <IconChevronLeft className="size-4" />
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateSearchParams(page + 1, limit)}
                    disabled={page >= pagination.totalPages}
                  >
                    Sau
                    <IconChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">Chưa có hình ảnh nào</p>
            <p className="text-muted-foreground text-sm mt-1">
              Nhấn &quot;Tải ảnh lên&quot; để thêm hình ảnh
            </p>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tải ảnh lên</DialogTitle>
            <DialogDescription>
              Chọn file ảnh từ máy tính của bạn
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">Chọn file ảnh</Label>
              <Input
                id="file-upload"
                type="file"
                accept="image/*"
                multiple
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="cursor-pointer py-1.5"
              />
              <p className="text-muted-foreground text-xs">
                Bạn có thể chọn nhiều file cùng lúc
              </p>
            </div>

            {/* Preview */}
            {previewItems.length > 0 && (
              <div className="space-y-2">
                <Label>Ảnh đã chọn ({previewItems.length})</Label>
                <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
                  {previewItems.map((item) => (
                    <div key={item.id} className="relative aspect-square group">
                      <Image
                        src={item.url}
                        alt={`Preview ${item.file.name}`}
                        fill
                        className="w-full h-full object-cover rounded border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100"
                        onClick={() => handleRemovePreview(item.id)}
                      >
                        <IconTrash className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploadingFiles && uploadProgress.length > 0 && (
              <div className="space-y-2">
                <Label>Tiến trình tải lên</Label>
                <div className="space-y-3">
                  {uploadProgress.map((progress, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[320px]">
                          {progress.fileName}
                        </span>
                        <span className="text-muted-foreground">
                          {progress.status === "uploading" && "Đang tải..."}
                          {progress.status === "success" && "✓ Thành công"}
                          {progress.status === "error" && "✗ Lỗi"}
                          {progress.status === "pending" && "Chờ..."}
                        </span>
                      </div>
                      {progress.status === "uploading" && (
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progress.progress}%` }}
                          />
                        </div>
                      )}
                      {progress.error && (
                        <p className="text-sm text-destructive">
                          {progress.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                // Close dialog - cleanup will happen in handleDialogClose
                handleDialogClose(false);
              }}
              disabled={isUploadingFiles}
            >
              Hủy
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploadingFiles || previewItems.length === 0}
            >
              <IconUpload className="size-4 mr-2" />
              {isUploadingFiles
                ? "Đang tải lên..."
                : `Tải lên ${previewItems.length} ảnh`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa hình ảnh</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa hình ảnh này? Hành động này không thể
              hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setImageIdToDelete(null);
              }}
            >
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
