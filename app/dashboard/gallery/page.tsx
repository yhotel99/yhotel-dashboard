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
    const limitNum = limitParam ? parseInt(limitParam, 10) : 20;
    return limitNum > 0 ? limitNum : 20;
  }, [searchParams]);

  const { images, isLoading, pagination, addImages, deleteImage } = useGallery(
    page,
    limit
  );

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
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const newFiles: File[] = Array.from(files);
      const fileUrls: string[] = [];

      newFiles.forEach((file) => {
        if (!file.type.startsWith("image/")) {
          toast.error(`File ${file.name} không phải là hình ảnh`);
          return;
        }

        // Create preview URL
        const url = URL.createObjectURL(file);
        fileUrls.push(url);
      });

      setImageUrls((prev) => [...prev, ...fileUrls]);
    },
    []
  );

  // Handle URL input (paste multiple URLs separated by newline)
  const handleUrlInput = useCallback((urls: string) => {
    const urlList = urls
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0 && isValidUrl(url));
    setImageUrls((prev) => [...prev, ...urlList]);
  }, []);

  // Check if URL is valid
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (imageUrls.length === 0) {
      toast.error("Vui lòng chọn ít nhất một hình ảnh");
      return;
    }

    setIsUploading(true);
    try {
      await addImages(imageUrls);
      setImageUrls([]);
      setUrlInput("");
      setIsUploadDialogOpen(false);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  }, [imageUrls, addImages]);

  // Handle delete image
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteImage(id);
    },
    [deleteImage]
  );

  // Remove preview image
  const handleRemovePreview = useCallback((index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
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
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
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

      <div className="px-4 lg:px-6">
        {/* Image Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg" />
            ))}
          </div>
        ) : images.length > 0 ? (
          <>
            <div className="mb-4 text-muted-foreground text-sm">
              Hiển thị {images.length} trong tổng số {pagination.total} hình ảnh
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
                      handleDelete(image.id);
                    }}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
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
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tải ảnh lên</DialogTitle>
            <DialogDescription>
              Chọn file ảnh hoặc nhập URL hình ảnh (mỗi URL một dòng)
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
                className="cursor-pointer"
              />
              <p className="text-muted-foreground text-xs">
                Bạn có thể chọn nhiều file cùng lúc
              </p>
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <Label htmlFor="url-input">Hoặc nhập URL hình ảnh</Label>
              <textarea
                id="url-input"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  handleUrlInput(e.target.value);
                }}
                placeholder={
                  "https://example.com/image1.jpg\nhttps://example.com/image2.jpg"
                }
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-muted-foreground text-xs">Mỗi URL một dòng</p>
            </div>

            {/* Preview */}
            {imageUrls.length > 0 && (
              <div className="space-y-2">
                <Label>Ảnh đã chọn ({imageUrls.length})</Label>
                <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover rounded border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100"
                        onClick={() => handleRemovePreview(index)}
                      >
                        <IconTrash className="size-3" />
                      </Button>
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
                setIsUploadDialogOpen(false);
                setImageUrls([]);
                setUrlInput("");
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || imageUrls.length === 0}
            >
              <IconUpload className="size-4 mr-2" />
              {isUploading
                ? "Đang tải lên..."
                : `Tải lên ${imageUrls.length} ảnh`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
