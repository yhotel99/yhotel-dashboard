import { Suspense } from "react";
import { CheckoutSessionsContent } from "@/components/checkout-sessions/checkout-sessions-content";
import type { PageProps } from "@/lib/types";
import { getCheckoutSessionsListWithPagination } from "@/services/checkout-sessions";
import { CHECKOUT_SESSION_STATUS } from "@/lib/constants";

export default async function CheckoutSessionsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const page = params.page ? Number(params.page) : 1;
  const limit = params.limit ? Number(params.limit) : 10;
  const search = params.search ? String(params.search) : "";
  const status = params.status
    ? String(params.status)
    : CHECKOUT_SESSION_STATUS.NEEDS_ACTION;

  const initialData = await getCheckoutSessionsListWithPagination({
    page,
    limit,
    search,
    status,
  });

  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex items-center justify-between px-4 lg:px-6">
            <div>
              <h1 className="text-2xl font-bold">Phiên thanh toán online</h1>
              <p className="text-muted-foreground text-sm">
                Phiên QR/chuyển khoản trước khi tạo booking. Tạo booking thủ
                công nếu khách chuyển tiền sau khi mã hết hạn.
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
      <CheckoutSessionsContent initialData={initialData} />
    </Suspense>
  );
}
