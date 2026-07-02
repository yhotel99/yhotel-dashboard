import { Suspense } from "react";
import { CustomerBookingsContent } from "@/components/customers/customer-bookings-content";
import { getBookingsListWithPagination } from "@/services/bookings";
import { resolveListBranchId } from "@/lib/branch.server";

type CustomerBookingsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CustomerBookingsPage({
  params,
  searchParams,
}: CustomerBookingsPageProps) {
  const [{ id: customerId }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  const page = query.page ? Number(query.page) : 1;
  const limit = query.limit ? Number(query.limit) : 10;
  const search = query.search ? String(query.search) : "";
  const requestedBranchId = query.branchId ? String(query.branchId) : null;
  const branchId = await resolveListBranchId(requestedBranchId);

  const initialData = await getBookingsListWithPagination({
    page,
    limit,
    search,
    customerId,
    branchId,
  });

  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex items-center gap-4 px-4 lg:px-6">
            <div className="size-10 rounded-md bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
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
      <CustomerBookingsContent
        customerId={customerId}
        initialData={initialData}
      />
    </Suspense>
  );
}
