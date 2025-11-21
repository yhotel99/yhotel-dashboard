"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function CheckoutDialogSkeleton() {
  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Booking Info Card Skeleton */}
        <Card className="p-3 sm:p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Card>

        {/* Payment Card Skeleton */}
        <Card className="p-3 sm:p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Card>
      </div>

      {/* Notes Card Skeleton */}
      <Card className="p-3 sm:p-4">
        <Skeleton className="h-5 w-24 mb-2" />
        <Skeleton className="h-16 w-full" />
      </Card>
    </div>
  );
}

