import { Suspense } from "react";
import { PaymentsContent } from "@/components/payments/payments-content";
import type { PageProps, PaymentStatus, PaymentType } from "@/lib/types";
import { getPaymentsListWithPagination } from "@/services/payments";
import { PAYMENT_STATUS, PAYMENT_TYPE } from "@/lib/constants";

export default async function PaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const page = params.page ? Number(params.page) : 1;
  const limit = params.limit ? Number(params.limit) : 10;
  const search = params.search ? String(params.search) : "";
  const paymentStatus = params.paymentStatus
    ? String(params.paymentStatus)
    : null;
  const paymentType = params.paymentType ? String(params.paymentType) : null;
  const dateFieldRaw = params.dateField ? String(params.dateField) : "created_at";
  const dateField = dateFieldRaw === "paid_at" ? "paid_at" : "created_at";
  const dateFrom = params.dateFrom ? String(params.dateFrom) : null;
  const dateTo = params.dateTo ? String(params.dateTo) : null;

  const paymentStatuses = Object.values(PAYMENT_STATUS) as PaymentStatus[];
  const paymentTypes = Object.values(PAYMENT_TYPE) as PaymentType[];
  const normalizedPaymentStatus =
    paymentStatus &&
    paymentStatuses.includes(paymentStatus as PaymentStatus)
      ? (paymentStatus as PaymentStatus)
      : null;
  const normalizedPaymentType =
    paymentType &&
    paymentTypes.includes(paymentType as PaymentType)
      ? (paymentType as PaymentType)
      : null;

  const initialData = await getPaymentsListWithPagination({
    page,
    limit,
    search,
    paymentStatus: normalizedPaymentStatus,
    paymentType: normalizedPaymentType,
    dateField,
    dateFrom,
    dateTo,
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
