"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BlogStatusBadge } from "./status-badge";
import type { BlogStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BlogStatusCellProps {
  blogId: string;
  status: BlogStatus;
  onChangeStatus?: (blogId: string, newStatus: BlogStatus) => void;
}

const blogStatusLabels: Record<BlogStatus, string> = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  archived: "Đã lưu trữ",
};

export function BlogStatusCell({
  blogId,
  status,
  onChangeStatus,
}: BlogStatusCellProps) {
  const statusClasses: Record<BlogStatus, string> = {
    draft: "border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-500/60 dark:bg-gray-500/10 dark:text-gray-300",
    published:
      "border-green-300 bg-green-50 text-green-700 dark:border-green-500/60 dark:bg-green-500/10 dark:text-green-300",
    archived:
      "border-gray-400 bg-gray-100 text-gray-800 dark:border-gray-600/60 dark:bg-gray-600/10 dark:text-gray-400",
  };

  const handleChange = (value: string) => {
    if (!onChangeStatus) return;
    const newStatus = value as BlogStatus;
    if (newStatus === status) return;
    onChangeStatus(blogId, newStatus);
  };

  if (!onChangeStatus) {
    return <BlogStatusBadge status={status} />;
  }

  return (
    <Select defaultValue={status} onValueChange={handleChange}>
      <SelectTrigger
        className={cn(
          "w-[140px] border px-2 py-1 text-xs font-medium",
          statusClasses[status]
        )}
      >
        <SelectValue placeholder="Chọn trạng thái" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="draft" className="text-gray-700 dark:text-gray-300">
          {blogStatusLabels.draft}
        </SelectItem>
        <SelectItem
          value="published"
          className="text-green-700 dark:text-green-300"
        >
          {blogStatusLabels.published}
        </SelectItem>
        <SelectItem
          value="archived"
          className="text-gray-800 dark:text-gray-400"
        >
          {blogStatusLabels.archived}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

