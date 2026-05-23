import { Suspense } from "react";
import { KanbanContent } from "@/components/reservation/kanban-content";
import { getUpcomingCheckinsWithPagination } from "@/services/reservation";
import { getCurrentUserBranchScope, resolveBranchFilterId } from "@/lib/branch.server";
import type { PageProps } from "@/lib/types";

export default async function KanbanPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const page = params.page ? Number(params.page) : 1;
  const limit = params.limit ? Number(params.limit) : 50;
  const search = params.search ? String(params.search) : "";
  const requestedBranchId = params.branchId ? String(params.branchId) : null;
  const { scope } = await getCurrentUserBranchScope();
  const branchId = resolveBranchFilterId(scope, requestedBranchId);

  const initialData = await getUpcomingCheckinsWithPagination({
    page,
    limit,
    search,
    branchId,
  });

  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex items-center justify-between px-4 lg:px-6">
            <div>
              <h1 className="text-2xl font-bold">Kanban - Phòng sắp nhận</h1>
              <p className="text-muted-foreground text-sm">
                Theo dõi các phòng (2 ngày trước đến 30 ngày tới)
              </p>
            </div>
          </div>
          <div className="px-4 lg:px-6">
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="grid grid-cols-7 gap-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-8 bg-muted rounded animate-pulse" />
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div
                          key={j}
                          className="h-24 bg-muted rounded animate-pulse"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <KanbanContent initialData={initialData} />
    </Suspense>
  );
}