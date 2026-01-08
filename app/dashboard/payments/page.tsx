import { Suspense } from "react";
import { PaymentsContent } from "@/components/payments/payments-content";
import type { PageProps } from "@/lib/types";
import { getPaymentsListWithPagination } from "@/services/payments";

export default async function PaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const page = params.page ? Number(params.page) : 1;
  const limit = params.limit ? Number(params.limit) : 10;
  const search = params.search ? String(params.search) : "";

  const initialData = await getPaymentsListWithPagination({
    page,
    limit,
    search,
  });

  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex items-center justify-between px-4 lg:px-6">
            <div>
              <h1 className="text-2xl font-bold">Quản lý thanh toán</h1>
              <p className="text-muted-foreground text-sm">
                Quản lý và theo dõi các giao dịch thanh toán
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
      <PaymentsContent initialData={initialData} />
    </Suspense>
  );
}
