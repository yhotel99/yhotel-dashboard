"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import Image from "next/image";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBlogBySlugAction } from "@/actions/blogs";
import type { Blog } from "@/lib/types";
import { formatDateOnly } from "@/lib/functions";
import { cn } from "@/lib/utils";

export default function ViewBlogPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const [blog, setBlog] = useState<Blog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: "text-blue-600 underline",
        },
      }),
      ImageExtension.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-md",
        },
      }),
    ],
    content: blog?.content || "",
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-lg max-w-none focus:outline-none p-4 text-foreground",
          "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4",
          "[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-3",
          "[&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2",
          "[&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-base",
          "[&_strong]:font-bold [&_strong]:text-foreground",
          "[&_em]:italic [&_em]:text-foreground",
          "[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono",
          "[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-md [&_pre]:overflow-x-auto",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4",
          "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-4",
          "[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-4",
          "[&_li]:my-2",
          "[&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800",
          "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-4"
        ),
      },
    },
  });

  useEffect(() => {
    const fetchBlog = async () => {
      if (!slug) return;
      setIsLoading(true);
      const result = await getBlogBySlugAction(slug);
      if (result.ok) {
        setBlog(result.data);
      } else {
        setBlog(null);
      }
      setIsLoading(false);
    };

    fetchBlog();
  }, [slug]);

  useEffect(() => {
    if (editor && blog?.content) {
      editor.commands.setContent(blog.content);
    }
  }, [editor, blog?.content]);

  const getStatusLabel = (status: Blog["status"]) => {
    switch (status) {
      case "draft":
        return "Bản nháp";
      case "published":
        return "Đã xuất bản";
      case "archived":
        return "Đã lưu trữ";
      default:
        return status;
    }
  };

  const getStatusVariant = (status: Blog["status"]) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "published":
        return "default";
      case "archived":
        return "outline";
      default:
        return "secondary";
    }
  };

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
            <h1 className="text-2xl font-bold">Chi tiết blog</h1>
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
          <h1 className="text-2xl font-bold">Chi tiết blog</h1>
          <p className="text-muted-foreground text-sm">
            Xem chi tiết bài viết blog
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-6">
          {/* Featured Image */}
          {blog.featured_image && (
            <div className="relative aspect-video w-full rounded-lg border overflow-hidden">
              <Image
                src={blog.featured_image}
                alt={blog.title}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            </div>
          )}

          {/* Blog Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">{blog.title}</CardTitle>
                  {blog.excerpt && (
                    <p className="text-muted-foreground text-lg mt-2">
                      {blog.excerpt}
                    </p>
                  )}
                </div>
                <Badge variant={getStatusVariant(blog.status)}>
                  {getStatusLabel(blog.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Slug:</span>
                  <p className="font-mono text-sm mt-1">{blog.slug}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tác giả:</span>
                  <p className="mt-1">
                    {blog.author?.full_name || "Không xác định"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ngày tạo:</span>
                  <p className="mt-1">{formatDateOnly(blog.created_at)}</p>
                </div>
                {blog.published_at && (
                  <div>
                    <span className="text-muted-foreground">
                      Ngày xuất bản:
                    </span>
                    <p className="mt-1">{formatDateOnly(blog.published_at)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Blog Content */}
          <Card>
            <CardHeader>
              <CardTitle>Nội dung</CardTitle>
            </CardHeader>
            <CardContent>
              {editor ? (
                <div className="border rounded-md">
                  <EditorContent editor={editor} />
                </div>
              ) : (
                <div className="border rounded-md min-h-[300px] p-4">
                  <div className="text-muted-foreground">
                    Đang tải nội dung...
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
