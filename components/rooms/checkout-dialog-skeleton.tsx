"use client";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export function CheckoutDialogSkeleton() {
  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
      {/* Hàng 1: Thông tin đặt phòng và Thanh toán */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Thông tin đặt phòng Skeleton */}
        <Card className="p-2.5 sm:p-3 border">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <Skeleton className="size-3.5 sm:size-4 rounded" />
            <Skeleton className="h-3.5 sm:h-4 w-24 sm:w-28" />
          </div>
          <div className="space-y-2 sm:space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-16 sm:w-20" />
                <Skeleton className="h-4 sm:h-5 w-24 sm:w-28" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-20 sm:w-24" />
                <Skeleton className="h-4 w-full max-w-[120px] sm:max-w-none" />
              </div>
            </div>
            <Separator className="my-2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-14 sm:w-16" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-14 sm:w-16" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        </Card>

        {/* Thanh toán Skeleton */}
        <Card className="p-2.5 sm:p-3 border bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between p-2 sm:p-2.5 bg-background/50 rounded-lg">
              <Skeleton className="h-3.5 sm:h-4 w-16 sm:w-20" />
              <Skeleton className="h-4 sm:h-5 w-24 sm:w-28" />
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 sm:h-3.5 w-20 sm:w-24" />
              <Skeleton className="h-3.5 sm:h-4 w-16 sm:w-20" />
            </div>
          </div>
        </Card>
      </div>

      {/* Ghi chú Skeleton */}
      <Card className="p-2.5 sm:p-3 border">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="size-3.5 sm:size-4 rounded" />
          <Skeleton className="h-3.5 sm:h-4 w-12 sm:w-16" />
        </div>
        <div className="flex items-start gap-2">
          <Skeleton className="size-3 sm:size-3.5 rounded mt-0.5 shrink-0" />
          <Skeleton className="h-3 sm:h-3.5 w-full" />
        </div>
      </Card>
    </div>
  );
}

