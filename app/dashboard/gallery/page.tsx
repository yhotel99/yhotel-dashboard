import { Suspense } from "react";
import { GalleryContent } from "@/components/gallery/gallery-content";
import { Skeleton } from "@/components/ui/skeleton";
import type { PageProps } from "@/lib/types";

function GalleryPageSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 h-full">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="px-4 lg:px-6 flex flex-col h-full">
        <Skeleton className="mb-4 h-4 w-48" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 mb-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function GalleryPage() {
  return (
    <Suspense fallback={<GalleryPageSkeleton />}>
      <GalleryContent />
    </Suspense>
  );
}
