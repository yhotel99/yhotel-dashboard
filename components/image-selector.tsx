"use client";

import { useState, useCallback, useMemo } from "react";
import {
  IconCheck,
  IconX,
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
} from "@/components/ui/dialog";
import { useGallery, GalleryImage } from "@/hooks/use-gallery";
import Image from "next/image";
import { cn } from "@/lib/utils";

import type { ImageValue } from "@/lib/types";

// Re-export type for backward compatibility
export type { ImageValue } from "@/lib/types";

interface ImageSelectorProps {
  value?: ImageValue | string;
  onChange: (value: ImageValue | undefined) => void;
  label?: string;
  description?: string;
  multiple?: boolean;
}

export function ImageSelector({
  value,
  onChange,
  label = "Chọn ảnh",
  description,
  multiple = false,
}: ImageSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<GalleryImage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 24;

  // Fetch images with pagination
  const { images, isLoading, pagination } = useGallery(
    currentPage,
    imagesPerPage
  );

  // Convert value to ImageValue if it's a string (backward compatibility)
  const imageValue = useMemo<ImageValue | undefined>(() => {
    if (typeof value === "string") {
      return value ? { id: "", url: value } : undefined;
    }
    return value;
  }, [value]);

  // Sync selectedImages when dialog opens
  const handleOpenDialog = useCallback(() => {
    if (imageValue) {
      // Find image in current gallery or use the value
      const foundImage = images.find((img) => img.url === imageValue.url);
      setSelectedImages(
        foundImage
          ? [foundImage]
          : imageValue.id
          ? [imageValue as GalleryImage]
          : []
      );
    } else {
      setSelectedImages([]);
    }
    setCurrentPage(1);
    setIsDialogOpen(true);
  }, [imageValue, images]);

  const handleImageClick = useCallback(
    (image: GalleryImage) => {
      if (multiple) {
        setSelectedImages((prev) => {
          if (prev.find((img) => img.id === image.id)) {
            return prev.filter((img) => img.id !== image.id);
          }
          return [...prev, image];
        });
      } else {
        setSelectedImages([image]);
      }
    },
    [multiple]
  );

  const handleConfirm = useCallback(() => {
    if (selectedImages.length > 0) {
      const selected = selectedImages[0];
      onChange({
        id: selected.id,
        url: selected.url,
      });
    } else {
      onChange(undefined);
    }
    setIsDialogOpen(false);
  }, [selectedImages, onChange]);

  const handleCancel = useCallback(() => {
    if (imageValue) {
      const foundImage = images.find((img) => img.url === imageValue.url);
      setSelectedImages(
        foundImage
          ? [foundImage]
          : imageValue.id
          ? [imageValue as GalleryImage]
          : []
      );
    } else {
      setSelectedImages([]);
    }
    setIsDialogOpen(false);
  }, [imageValue, images]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">{label}</label>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpenDialog}
      >
        {imageValue ? "Thay đổi" : "Chọn ảnh"}
      </Button>
      {imageValue && (
        <div className="relative aspect-video w-full max-w-md rounded-lg border overflow-hidden">
          <Image
            src={imageValue.url}
            alt="Selected"
            fill
            className="object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => onChange(undefined)}
          >
            <IconX className="size-4" />
          </Button>
        </div>
      )}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCancel();
          } else {
            setIsDialogOpen(true);
          }
        }}
      >
        <DialogContent className="min-w-2xl max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chọn ảnh từ gallery</DialogTitle>
            <DialogDescription>
              {multiple
                ? "Chọn nhiều ảnh (click để chọn/bỏ chọn)"
                : "Click vào ảnh để chọn"}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted rounded-lg" />
              ))}
            </div>
          ) : images.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              {images.map((image) => {
                const isSelected =
                  selectedImages.find((img) => img.id === image.id) !==
                  undefined;
                return (
                  <div
                    key={image.id}
                    className={cn(
                      "relative aspect-square cursor-pointer rounded-lg border-2 overflow-hidden transition-all",
                      isSelected
                        ? "border-primary ring-2 ring-primary"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => handleImageClick(image)}
                  >
                    <Image
                      src={image.url}
                      alt=""
                      fill
                      className="object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-2">
                          <IconCheck className="size-6" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có ảnh nào trong gallery
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Trang {pagination.page} / {pagination.totalPages} (
                {pagination.total} ảnh)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage <= 1}
                >
                  <IconChevronLeft className="size-4" />
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(pagination.totalPages, prev + 1)
                    )
                  }
                  disabled={currentPage >= pagination.totalPages}
                >
                  Sau
                  <IconChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleCancel}>
              Hủy
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedImages.length === 0}
            >
              Xác nhận ({selectedImages.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ImageListSelectorProps {
  value?: ImageValue[];
  onChange: (images: ImageValue[]) => void;
  label?: string;
  description?: string;
}

export function ImageListSelector({
  value = [],
  onChange,
  label = "Chọn danh sách ảnh",
  description,
}: ImageListSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<GalleryImage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 24;

  // Fetch images with pagination
  const { images, isLoading, pagination } = useGallery(
    currentPage,
    imagesPerPage
  );

  // Convert value to GalleryImage array, matching by URL or ID
  const getSelectedImagesFromValue = useCallback(
    (val: ImageValue[]) => {
      return val
        .map((valItem) => {
          // Try to find in current images by URL first, then by ID
          const found = images.find(
            (img) => img.url === valItem.url || img.id === valItem.id
          );
          return found || (valItem.id ? (valItem as GalleryImage) : null);
        })
        .filter((img): img is GalleryImage => img !== null);
    },
    [images]
  );

  // Sync selectedImages when dialog opens
  const handleOpenDialog = useCallback(() => {
    setSelectedImages(getSelectedImagesFromValue(value));
    setCurrentPage(1);
    setIsDialogOpen(true);
  }, [value, getSelectedImagesFromValue]);

  const handleImageClick = useCallback((image: GalleryImage) => {
    setSelectedImages((prev) => {
      if (prev.find((img) => img.id === image.id)) {
        return prev.filter((img) => img.id !== image.id);
      }
      return [...prev, image];
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const imageValues: ImageValue[] = selectedImages.map((img) => ({
      id: img.id,
      url: img.url,
    }));
    onChange(imageValues);
    setIsDialogOpen(false);
  }, [selectedImages, onChange]);

  const handleCancel = useCallback(() => {
    setSelectedImages(getSelectedImagesFromValue(value));
    setIsDialogOpen(false);
  }, [value, getSelectedImagesFromValue]);

  const handleRemove = useCallback(
    (imageId: string) => {
      onChange(value.filter((img) => img.id !== imageId));
    },
    [value, onChange]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">{label}</label>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpenDialog}
      >
        Chọn ảnh ({value.length})
      </Button>

      {value.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {value.map((imageValue) => (
            <div
              key={imageValue.id || imageValue.url}
              className="relative aspect-square rounded-lg border overflow-hidden group"
            >
              <Image
                src={imageValue.url}
                alt={`Selected`}
                fill
                className="object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                onClick={() => handleRemove(imageValue.id || imageValue.url)}
              >
                <IconX className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCancel();
          } else {
            setIsDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chọn danh sách ảnh từ gallery</DialogTitle>
            <DialogDescription>
              Click vào ảnh để chọn/bỏ chọn (đã chọn {selectedImages.length}{" "}
              ảnh)
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted rounded-lg" />
              ))}
            </div>
          ) : images.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              {images.map((image) => {
                const isSelected =
                  selectedImages.find((img) => img.id === image.id) !==
                  undefined;
                return (
                  <div
                    key={image.id}
                    className={cn(
                      "relative aspect-square cursor-pointer rounded-lg border-2 overflow-hidden transition-all",
                      isSelected
                        ? "border-primary ring-2 ring-primary"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => handleImageClick(image)}
                  >
                    <Image
                      src={image.url}
                      alt=""
                      fill
                      className="object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-2">
                          <IconCheck className="size-6" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có ảnh nào trong gallery
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Trang {pagination.page} / {pagination.totalPages} (
                {pagination.total} ảnh)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage <= 1}
                >
                  <IconChevronLeft className="size-4" />
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(pagination.totalPages, prev + 1)
                    )
                  }
                  disabled={currentPage >= pagination.totalPages}
                >
                  Sau
                  <IconChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleCancel}>
              Hủy
            </Button>
            <Button onClick={handleConfirm}>
              Xác nhận ({selectedImages.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
