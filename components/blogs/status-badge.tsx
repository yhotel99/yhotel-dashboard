import { Badge } from "@/components/ui/badge";
import type { BlogStatus } from "@/lib/types";

const blogStatusLabels: Record<BlogStatus, string> = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  archived: "Đã lưu trữ",
};

export function BlogStatusBadge({ status }: { status: BlogStatus }) {
  const statusConfig = {
    draft: {
      label: blogStatusLabels.draft,
      variant: "outline" as const,
      className: "border-gray-300 text-gray-700",
    },
    published: {
      label: blogStatusLabels.published,
      variant: "default" as const,
      className: "bg-green-500 hover:bg-green-600 text-white border-0",
    },
    archived: {
      label: blogStatusLabels.archived,
      variant: "secondary" as const,
      className: "bg-gray-500 hover:bg-gray-600 text-white border-0",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

