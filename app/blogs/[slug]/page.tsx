import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";

import { getBlogBySlugAction } from "@/actions/blogs";
import { formatDateOnly } from "@/lib/functions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

// Cache để generateMetadata và page chỉ query Supabase 1 lần cho mỗi request
const getPublishedBlog = cache(async (slug: string) => {
  const result = await getBlogBySlugAction(slug);
  if (!result.ok || result.data.status !== "published") {
    return null;
  }
  return result.data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getPublishedBlog(slug);

  if (!blog) {
    return { title: "Không tìm thấy bài viết" };
  }

  const description = blog.excerpt || blog.title;
  const images = blog.featured_image
    ? [{ url: blog.featured_image, alt: blog.title }]
    : undefined;

  return {
    title: blog.title,
    description,
    openGraph: {
      type: "article",
      title: blog.title,
      description,
      publishedTime: blog.published_at || undefined,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: blog.title,
      description,
      images: blog.featured_image ? [blog.featured_image] : undefined,
    },
  };
}

export default async function PublicBlogPage({ params }: Props) {
  const { slug } = await params;
  const blog = await getPublishedBlog(slug);

  if (!blog) {
    notFound();
  }

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:py-12">
      {blog.featured_image ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
          <Image
            src={blog.featured_image}
            alt={blog.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>
      ) : null}

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{blog.title}</h1>
        <p className="text-muted-foreground text-sm">
          {blog.author?.full_name ? `${blog.author.full_name} · ` : ""}
          {formatDateOnly(blog.published_at || blog.created_at)}
        </p>
        {blog.excerpt ? (
          <p className="text-muted-foreground text-lg">{blog.excerpt}</p>
        ) : null}
      </header>

      <div
        className={cn(
          "prose prose-lg max-w-none text-foreground",
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
        )}
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />
    </article>
  );
}
