import { ColumnDef } from "@tanstack/react-table";
import type { Blog } from "@/lib/types";
import { formatDateOnly } from "@/lib/functions";
import { BlogActionsCell } from "./actions-cell";
import { BlogStatusCell } from "./status-cell";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Column definitions constants
export const BLOG_COLUMNS = {
  IMAGE: { accessorKey: "Ảnh", header: "Ảnh" },
  TITLE: { accessorKey: "Tiêu đề", header: "Tiêu đề" },
  SLUG: { accessorKey: "slug", header: "Slug" },
  STATUS: { accessorKey: "Trạng thái", header: "Trạng thái" },
  AUTHOR: { accessorKey: "Tác giả", header: "Tác giả" },
  PUBLISHED_AT: { accessorKey: "Ngày xuất bản", header: "Ngày xuất bản" },
  CREATED_AT: { accessorKey: "Ngày tạo", header: "Ngày tạo" },
  ACTIONS: { accessorKey: "Hành động", header: "Hành động" },
} as const;

export function createColumns(
  onEdit: (blog: Blog) => void,
  onDelete: (blog: Blog) => void,
  onChangeStatus?: (blogId: string, newStatus: Blog["status"]) => void
): ColumnDef<Blog>[] {
  return [
    {
      accessorKey: BLOG_COLUMNS.IMAGE.accessorKey,
      header: BLOG_COLUMNS.IMAGE.header,
      cell: ({ row }) => (
        <div className="relative aspect-video xl:w-18 w-14 xl:h-14 h-10 rounded-md border overflow-hidden">
          {row.original.featured_image ? (
            <Image
              src={row.original.featured_image}
              alt={row.original.title}
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 56px, 72px"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">
                Không có ảnh
              </span>
            </div>
          )}
        </div>
      ),
      size: 50,
      minSize: 50,
      maxSize: 80,
    },
    {
      accessorKey: BLOG_COLUMNS.TITLE.accessorKey,
      header: BLOG_COLUMNS.TITLE.header,
      cell: ({ row }) => {
        const title = row.original.title;
        const excerpt = row.original.excerpt;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col gap-1 cursor-pointer">
                <span className="font-medium line-clamp-1 truncate block">
                  {title}
                </span>
                {excerpt && (
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {excerpt}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-2">
                <p className="font-medium">{title}</p>
                {excerpt && (
                  <p className="text-sm text-muted-foreground">{excerpt}</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
      enableHiding: false,
      size: 180,
      minSize: 180,
      maxSize: 200,
    },
    {
      accessorKey: BLOG_COLUMNS.SLUG.accessorKey,
      header: BLOG_COLUMNS.SLUG.header,
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm text-muted-foreground font-mono line-clamp-1">
              {row.original.slug}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{row.original.slug}</p>
          </TooltipContent>
        </Tooltip>
      ),
      size: 180,
      minSize: 150,
    },
    {
      accessorKey: BLOG_COLUMNS.STATUS.accessorKey,
      header: BLOG_COLUMNS.STATUS.header,
      cell: ({ row }) => (
        <BlogStatusCell
          blogId={row.original.id}
          status={row.original.status}
          onChangeStatus={onChangeStatus}
        />
      ),
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: BLOG_COLUMNS.AUTHOR.accessorKey,
      header: BLOG_COLUMNS.AUTHOR.header,
      cell: ({ row }) => row.original.author?.full_name || "-",
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: BLOG_COLUMNS.PUBLISHED_AT.accessorKey,
      header: BLOG_COLUMNS.PUBLISHED_AT.header,
      cell: ({ row }) =>
        row.original.published_at
          ? formatDateOnly(row.original.published_at)
          : "-",
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: BLOG_COLUMNS.CREATED_AT.accessorKey,
      header: BLOG_COLUMNS.CREATED_AT.header,
      cell: ({ row }) => formatDateOnly(row.original.created_at),
      size: 120,
      minSize: 100,
    },
    {
      id: "actions",
      accessorKey: BLOG_COLUMNS.ACTIONS.accessorKey,
      header: BLOG_COLUMNS.ACTIONS.header,
      cell: ({ row }) => (
        <BlogActionsCell
          blog={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
      size: 60,
      minSize: 40,
      maxSize: 60,
    },
  ];
}
