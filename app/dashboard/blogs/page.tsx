import { Suspense } from "react";
import { BlogsContent } from "@/components/blogs/blogs-content";

export default async function BlogsPage({
  searchParams,
}: {
  searchParams?:
    | Promise<{ [key: string]: string | string[] | undefined }>
    | { [key: string]: string | string[] | undefined };
}) {
  // Resolve searchParams nếu là Promise (Next.js 16+)
  const params =
    searchParams instanceof Promise ? await searchParams : searchParams;

  // Log searchParams để debug
  console.log("BlogsPage searchParams:", params);
  console.log("Search:", params?.search);
  console.log("Page:", params?.page);
  console.log("Limit:", params?.limit);

  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex items-center justify-between px-4 lg:px-6">
            <div>
              <h1 className="text-2xl font-bold">Quản lý blog</h1>
              <p className="text-muted-foreground text-sm">
                Quản lý và theo dõi các bài viết blog
              </p>
            </div>
          </div>
          <div className="px-4 lg:px-6">
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted rounded animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <BlogsContent />
    </Suspense>
  );
}
