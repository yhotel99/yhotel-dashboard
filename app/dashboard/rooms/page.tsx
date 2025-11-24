"use client";

import { Suspense } from "react";
import { RoomsContent } from "@/components/rooms/rooms-content";

export default function RoomsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex items-center justify-between px-4 lg:px-6">
            <div>
              <h1 className="text-2xl font-bold">Quản lý phòng</h1>
              <p className="text-muted-foreground text-sm">
                Quản lý và theo dõi thông tin các phòng trong khách sạn
              </p>
            </div>
          </div>
          <div className="px-4 lg:px-6">
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <RoomsContent />
    </Suspense>
  );
}
