"use client";

import {
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconLink,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Blog } from "@/lib/types";

export function BlogActionsCell({
  blog,
  onEdit,
  onDelete,
}: {
  blog: Blog;
  onEdit: (blog: Blog) => void;
  onDelete: (blog: Blog) => void;
}) {
  const router = useRouter();

  const handleView = () => {
    router.push(`/dashboard/blogs/${blog.slug}`);
  };

  const handleCopyShareLink = async () => {
    const shareUrl = `${window.location.origin}/blogs/${blog.slug}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Đã sao chép link chia sẻ");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
          size="icon"
        >
          <IconDotsVertical />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={handleView}>
          <IconEye className="mr-2 size-4" />
          Xem chi tiết
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(blog)}>
          <IconEdit className="mr-2 size-4" />
          Chỉnh sửa
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyShareLink}>
          <IconLink className="mr-2 size-4" />
          Sao chép link chia sẻ
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onDelete(blog)}
          className="text-red-600"
        >
          <IconTrash className="mr-2 size-4" />
          Xóa blog
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
