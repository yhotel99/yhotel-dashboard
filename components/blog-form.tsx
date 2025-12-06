"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useBlogsQuery } from "@/hooks/use-blogs-query";
import type { BlogInput } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { TiptapEditor } from "@/components/tiptap-editor";
import { ImageSelector } from "@/components/image-selector";

// Blog status enum
export const blogStatusEnum = ["draft", "published", "archived"] as const;

// Form validation schema
const blogFormSchema = z.object({
  title: z.string().min(1, "Tiêu đề là bắt buộc"),
  slug: z.string().min(1, "Slug là bắt buộc"),
  content: z.string().min(1, "Nội dung là bắt buộc"),
  excerpt: z.string().optional(),
  status: z.enum(blogStatusEnum),
  featured_image: z
    .object({
      id: z.string(),
      url: z.string(),
    })
    .optional()
    .nullable(),
  published_at: z.string().optional(),
});

export type BlogFormValues = z.infer<typeof blogFormSchema>;

interface BlogFormProps {
  mode: "create" | "edit";
  blogId?: string;
  defaultValues?: Partial<BlogFormValues>;
}

// Helper function to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function BlogForm({ mode, blogId, defaultValues }: BlogFormProps) {
  const router = useRouter();
  // Create a separate instance for form operations
  const { createBlog, updateBlog } = useBlogsQuery(1, 10, "", false);

  // Initialize slug manual edit flag based on defaultValues (for edit mode)
  const initialSlugManuallyEdited =
    defaultValues?.slug && defaultValues?.title
      ? defaultValues.slug !== generateSlug(defaultValues.title)
      : false;

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(
    initialSlugManuallyEdited
  );

  const form = useForm<BlogFormValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: defaultValues || {
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      status: "draft",
      featured_image: null,
    },
  });

  const onSubmit = async (values: BlogFormValues) => {
    try {
      const payload: BlogInput = {
        title: values.title.trim(),
        slug: values.slug.trim(),
        content: values.content.trim(),
        excerpt: values.excerpt?.trim() || null,
        status: values.status,
        featured_image: values.featured_image?.url || null,
        published_at:
          values.status === "published"
            ? values.published_at || new Date().toISOString()
            : null,
      };

      if (mode === "create") {
        await createBlog(payload);
        toast.success("Tạo blog thành công!", {
          description: `Blog "${payload.title}" đã được tạo thành công.`,
        });
        router.push("/dashboard/blogs");
      } else if (mode === "edit" && blogId) {
        await updateBlog(blogId, payload);
        toast.success("Cập nhật blog thành công!", {
          description: `Blog "${payload.title}" đã được cập nhật thành công.`,
        });
        router.push("/dashboard/blogs");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể lưu blog";
      toast.error(
        mode === "create" ? "Tạo blog thất bại" : "Cập nhật blog thất bại",
        {
          description: errorMessage,
        }
      );
    }
  };

  const handleTitleChange = (value: string) => {
    form.setValue("title", value);
    // Auto-generate slug from title only if slug hasn't been manually edited
    if (!isSlugManuallyEdited) {
      const newSlug = generateSlug(value);
      form.setValue("slug", newSlug);
    }
  };

  const handleSlugChange = (value: string) => {
    form.setValue("slug", value);
    // Mark slug as manually edited if user changes it from auto-generated value
    const currentTitle = form.getValues("title");
    const autoSlug = currentTitle ? generateSlug(currentTitle) : "";
    setIsSlugManuallyEdited(value !== autoSlug && value !== "");
  };

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="featured_image"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageSelector
                      value={field.value || undefined}
                      onChange={(value) => field.onChange(value || null)}
                      description="Ảnh đại diện sẽ hiển thị ở đầu blog"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiêu đề *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nhập tiêu đề blog"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleTitleChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="slug-blog"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleSlugChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    URL thân thiện cho blog (tự động tạo từ tiêu đề)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="excerpt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tóm tắt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Nhập tóm tắt ngắn gọn về nội dung blog"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Mô tả ngắn gọn về nội dung blog
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nội dung *</FormLabel>
                  <FormControl>
                    <TiptapEditor
                      content={field.value}
                      onChange={field.onChange}
                      placeholder="Nhập nội dung blog..."
                    />
                  </FormControl>
                  <FormDescription>
                    Sử dụng thanh công cụ để định dạng nội dung blog
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trạng thái *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Bản nháp</SelectItem>
                      <SelectItem value="published">Đã xuất bản</SelectItem>
                      <SelectItem value="archived">Đã lưu trữ</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Hủy
              </Button>
              <Button type="submit" className="min-w-[140px]">
                {mode === "create" ? "Tạo blog" : "Cập nhật"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
