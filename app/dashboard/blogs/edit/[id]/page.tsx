"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IconArrowLeft } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { BlogForm, type BlogFormValues } from "@/components/blog-form";
import { getBlogByIdAction } from "@/actions/blogs";
import type { Blog } from "@/lib/types";

export default function EditBlogPage() {
  const router = useRouter();
  const params = useParams();
  const blogId = params.id as string;
  const [blog, setBlog] = useState<Blog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      if (!blogId) return;
      setIsLoading(true);
      const result = await getBlogByIdAction(blogId);
      if (result.ok) {
        setBlog(result.data);
      } else {
        setBlog(null);
      }
      setIsLoading(false);
    };

    fetchBlog();
  }, [blogId]);

  const defaultValues: Partial<BlogFormValues> | undefined = blog
    ? {
        title: blog.title,
        slug: blog.slug,
        content: blog.content,
        excerpt: blog.excerpt || "",
        status: blog.status,
        featured_image: blog.featured_image
          ? { id: "", url: blog.featured_image }
          : null,
      }
    : undefined;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4 px-4 lg:px-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 cursor-pointer"
          >
            <IconArrowLeft className="size-4" />
            <span className="sr-only">Quay lại</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Chỉnh sửa blog</h1>
            <p className="text-muted-foreground text-sm">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4 px-4 lg:px-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 cursor-pointer"
          >
            <IconArrowLeft className="size-4" />
            <span className="sr-only">Quay lại</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Không tìm thấy blog</h1>
            <p className="text-muted-foreground text-sm">
              Blog không tồn tại hoặc đã bị xóa
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="h-10 w-10 cursor-pointer"
        >
          <IconArrowLeft className="size-4" />
          <span className="sr-only">Quay lại</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Chỉnh sửa blog</h1>
          <p className="text-muted-foreground text-sm">
            Cập nhật thông tin blog {blog.title}
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <BlogForm mode="edit" blogId={blogId} defaultValues={defaultValues} />
      </div>
    </div>
  );
}
