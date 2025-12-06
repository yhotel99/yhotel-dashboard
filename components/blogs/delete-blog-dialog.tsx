"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Blog } from "@/lib/types";

interface DeleteBlogDialogProps {
  blog: Blog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteBlogDialog({
  blog,
  open,
  onOpenChange,
  onConfirm,
}: DeleteBlogDialogProps) {
  if (!blog) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận xóa blog</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn xóa blog <strong>{blog.title}</strong>? Hành
            động này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Xóa blog
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

