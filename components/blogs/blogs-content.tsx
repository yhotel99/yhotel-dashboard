"use client";

import * as React from "react";
import { IconPlus } from "@tabler/icons-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useDebounce } from "@/hooks/use-debounce";
import { createColumns } from "@/components/blogs/columns";
import { DeleteBlogDialog } from "@/components/blogs/delete-blog-dialog";
import { toast } from "sonner";
import { useBlogs } from "@/hooks/use-blogs";
import {
  updateBlogStatus as updateBlogStatusAction,
  deleteBlog as deleteBlogAction,
} from "@/actions/blogs";
import type { Blog } from "@/lib/types";

export function BlogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = React.useState("");
  const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
  const [blogToDelete, setBlogToDelete] = React.useState<Blog | null>(null);

  // Get pagination and search from URL params
  const page = React.useMemo(() => {
    const pageParam = searchParams.get("page");
    const pageNum = pageParam ? parseInt(pageParam, 10) : 1;
    return pageNum > 0 ? pageNum : 1;
  }, [searchParams]);

  const limit = React.useMemo(() => {
    const limitParam = searchParams.get("limit");
    const limitNum = limitParam ? parseInt(limitParam, 10) : 10;
    return limitNum > 0 ? limitNum : 10;
  }, [searchParams]);

  const search = React.useMemo(() => {
    return searchParams.get("search") || "";
  }, [searchParams]);

  // Update search params
  const updateSearchParams = React.useCallback(
    (newPage: number, newLimit: number, newSearch: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) {
        params.set("page", newPage.toString());
      } else {
        params.delete("page");
      }
      if (newLimit !== 10) {
        params.set("limit", newLimit.toString());
      } else {
        params.delete("limit");
      }
      if (newSearch) {
        params.set("search", newSearch);
      } else {
        params.delete("search");
      }
      router.push(`/dashboard/blogs?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Debounce search
  const debouncedSearch = useDebounce(localSearch, 500);

  React.useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearchParams(1, limit, debouncedSearch);
    }
  }, [debouncedSearch, search, limit, updateSearchParams]);

  const { blogs, isLoading, pagination, mutate } = useBlogs({
    search,
    page,
    limit,
  });

  const handleEditBlog = React.useCallback(
    (blog: Blog) => {
      router.push(`/dashboard/blogs/edit/${blog.id}`);
    },
    [router]
  );

  const handleCreateBlog = React.useCallback(() => {
    router.push("/dashboard/blogs/create");
  }, [router]);

  const handleConfirmDelete = async () => {
    if (!blogToDelete) return;

    try {
      await deleteBlogAction(blogToDelete.id);
      toast.success("Xóa blog thành công!", {
        description: `Blog "${blogToDelete.title}" đã được xóa thành công.`,
      });
      setOpenDeleteDialog(false);
      setBlogToDelete(null);
      // Refresh SWR cache
      await mutate();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể xóa blog";
      toast.error("Xóa blog thất bại", {
        description: errorMessage,
      });
      throw err;
    }
  };

  const handleInlineStatusChange = React.useCallback(
    async (blogId: string, newStatus: Blog["status"]) => {
      try {
        await updateBlogStatusAction(blogId, newStatus);
        toast.success("Cập nhật trạng thái thành công!", {
          description: `Trạng thái blog đã được cập nhật thành công.`,
        });
        // Refresh SWR cache
        await mutate();
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể cập nhật trạng thái blog";
        toast.error("Cập nhật trạng thái thất bại", {
          description: errorMessage,
        });
        throw err;
      }
    },
    [mutate]
  );

  // Create columns with handlers
  const columns = React.useMemo(
    () =>
      createColumns(
        handleEditBlog,
        (blog) => {
          setBlogToDelete(blog);
          setOpenDeleteDialog(true);
        },
        handleInlineStatusChange
      ),
    [handleEditBlog, handleInlineStatusChange]
  );

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý blog</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi các bài viết blog
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreateBlog}>
          <IconPlus className="size-4" />
          Tạo blog mới
        </Button>
      </div>
      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={blogs}
          searchKey="title"
          searchPlaceholder="Tìm kiếm theo tiêu đề, nội dung..."
          emptyMessage="Không tìm thấy blog nào."
          entityName="blog"
          getRowId={(row) => row.id}
          fetchData={async () => {
            await mutate();
          }}
          isLoading={isLoading}
          serverPagination={pagination}
          onPageChange={(newPage) => updateSearchParams(newPage, limit, search)}
          onLimitChange={(newLimit) => updateSearchParams(1, newLimit, search)}
          serverSearch={localSearch}
          onSearchChange={setLocalSearch}
        />
      </div>

      {blogToDelete && (
        <DeleteBlogDialog
          blog={blogToDelete}
          open={openDeleteDialog}
          onOpenChange={setOpenDeleteDialog}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
