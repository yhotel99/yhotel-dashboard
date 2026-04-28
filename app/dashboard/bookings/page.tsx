import { Suspense } from "react";
import { BookingsContent } from "@/components/bookings/bookings-content";
import { getBookingsListWithPagination } from "@/services/bookings";
import type { PageProps } from "@/lib/types";

export default async function BookingsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const page = params.page ? Number(params.page) : 1;
  const limit = params.limit ? Number(params.limit) : 10;
  const search = params.search ? String(params.search) : "";
  const status = params.status ? String(params.status) : null;
  const creatorId = params.creatorId ? String(params.creatorId) : null;
  const dateFieldRaw = params.dateField ? String(params.dateField) : null;
  const dateField =
    dateFieldRaw === "created_at" || dateFieldRaw === "check_in"
      ? dateFieldRaw
      : null;
  const dateFrom = params.dateFrom ? String(params.dateFrom) : null;
  const dateTo = params.dateTo ? String(params.dateTo) : null;
  const cursorCreatedAt = params.cursorCreatedAt
    ? String(params.cursorCreatedAt)
    : null;
  const cursorId = params.cursorId ? String(params.cursorId) : null;

  const initialData = await getBookingsListWithPagination({
    page,
    limit,
    search,
    creatorId,
    dateField,
    dateFrom,
    dateTo,
    status,
    cursorCreatedAt,
    cursorId,
  });

  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex items-center justify-between px-4 lg:px-6">
            <div>
              <h1 className="text-2xl font-bold">Quản lý đặt phòng</h1>
              <p className="text-muted-foreground text-sm">
                Quản lý và theo dõi các đặt phòng trong khách sạn
              </p>
            </div>
          </div>
          <div className="px-4 lg:px-6">
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
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
      <BookingsContent initialData={initialData} />
    </Suspense>
  );
}
