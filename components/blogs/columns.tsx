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

export function createColumns(
  onEdit: (blog: Blog) => void,
  onDelete: (blog: Blog) => void,
  onChangeStatus?: (blogId: string, newStatus: Blog["status"]) => void
): ColumnDef<Blog>[] {
  return [
    {
      accessorKey: "Ảnh",
      header: "Ảnh",
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
      size: 100,
      minSize: 80,
    },
    {
      accessorKey: "Tiêu đề",
      header: "Tiêu đề",
      enableHiding: false,
      size: 250,
      minSize: 200,
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium line-clamp-1">{row.original.title}</span>
          {row.original.excerpt && (
            <span className="text-xs text-muted-foreground line-clamp-1 ">
              {row.original.excerpt}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "slug",
      header: "Slug",
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
      accessorKey: "Trạng thái",
      header: "Trạng thái",
      cell: ({ row }) => (
        <BlogStatusCell
          blogId={row.original.id}
          status={row.original.status}
          onChangeStatus={onChangeStatus}
        />
      ),
      size: 180,
      minSize: 100,
    },
    {
      accessorKey: "Tác giả",
      header: "Tác giả",
      cell: ({ row }) => row.original.author?.full_name || "-",
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: "Ngày xuất bản",
      header: "Ngày xuất bản",
      cell: ({ row }) =>
        row.original.published_at
          ? formatDateOnly(row.original.published_at)
          : "-",
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: "Ngày tạo",
      header: "Ngày tạo",
      cell: ({ row }) => formatDateOnly(row.original.created_at),
      size: 120,
      minSize: 100,
    },
    {
      id: "Hành động",
      cell: ({ row }) => (
        <BlogActionsCell
          blog={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
      size: 40,
      minSize: 40,
      maxSize: 50,
    },
  ];
}
