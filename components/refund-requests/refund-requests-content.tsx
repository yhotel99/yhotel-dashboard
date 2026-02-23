"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import type {
  RefundRequestStatus,
  RefundRequestWithRelations,
  RefundRequestsResponse,
} from "@/lib/types";
import { useRefundRequests } from "@/hooks/use-refund-requests";
import { updateRefundRequestStatusAction } from "@/actions/refund-requests";
import { useDebounce } from "@/hooks/use-debounce";
import { RefundRequestDetailDialog } from "./refund-request-detail-dialog";
import { createRefundRequestColumns } from "./columns";

// Main content component
export function RefundRequestsContent({
  initialData,
}: {
  initialData: RefundRequestsResponse;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = useState("");
  const [selectedRefundRequestId, setSelectedRefundRequestId] = useState<
    string | null
  >(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);

  // Get pagination and search from URL params
  const page = useMemo(() => {
    const pageParam = searchParams.get("page");
    const pageNum = pageParam ? parseInt(pageParam, 10) : 1;
    return pageNum > 0 ? pageNum : 1;
  }, [searchParams]);

  const limit = useMemo(() => {
    const limitParam = searchParams.get("limit");
    const limitNum = limitParam ? parseInt(limitParam, 10) : 10;
    return limitNum > 0 ? limitNum : 10;
  }, [searchParams]);

  const search = useMemo(() => {
    return searchParams.get("search") || "";
  }, [searchParams]);

  // Update search params
  const updateSearchParams = useCallback(
    (newPage: number, newLimit: number, newSearch: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) {
        params.set("page", newPage.toString());
      } else {
        params.delete("page");
      }
      if (newLimit !== 10) {
        params.set("limit", newLimit.toString());
      } else {
        params.delete("limit");
      }
      if (newSearch) {
        params.set("search", newSearch);
      } else {
        params.delete("search");
      }
      router.push(`/dashboard/refund-requests?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Debounce search
  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearchParams(1, limit, debouncedSearch);
    }
  }, [debouncedSearch, search, limit, updateSearchParams]);

  // Use SWR hook for refund requests
  const { refundRequests, isLoading, pagination, refetch, mutate } =
    useRefundRequests({
      page,
      limit,
      search,
      fallbackData: initialData,
    });

  // Wrapper function to update refund request status
  const handleUpdateRefundRequestStatus = useCallback(
    async (id: string, status: RefundRequestStatus) => {
      const updatedRefundRequest = await updateRefundRequestStatusAction(
        id,
        status
      );
      // Refresh data after update
      await mutate();
      return updatedRefundRequest;
    },
    [mutate]
  );

  // Handle empty page after deletion or invalid page number
  useEffect(() => {
    if (!isLoading && pagination.totalPages > 0) {
      // If current page is beyond total pages, navigate to last page
      if (page > pagination.totalPages) {
        updateSearchParams(pagination.totalPages, limit, search);
        return;
      }
      // If current page is empty (after deletion), navigate to previous page
      if (refundRequests.length === 0 && page > 1) {
        const targetPage = Math.min(page - 1, pagination.totalPages);
        updateSearchParams(targetPage, limit, search);
      }
    }
  }, [
    refundRequests.length,
    pagination.totalPages,
    page,
    limit,
    search,
    isLoading,
    updateSearchParams,
  ]);

  const handleViewDetail = useCallback(
    (refundRequest: RefundRequestWithRelations) => {
      setSelectedRefundRequestId(refundRequest.id);
      setOpenDetailDialog(true);
    },
    []
  );

  const columns = useMemo(
    () =>
      createRefundRequestColumns(
        () => refetch(),
        handleUpdateRefundRequestStatus,
        handleViewDetail
      ),
    [refetch, handleUpdateRefundRequestStatus, handleViewDetail]
  );

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý yêu cầu hoàn tiền</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi các yêu cầu hoàn tiền
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={refundRequests}
          searchKey="id"
          searchPlaceholder="Tìm kiếm theo mã yêu cầu, mã booking, khách hàng..."
          emptyMessage="Không tìm thấy kết quả."
          entityName="yêu cầu hoàn tiền"
          getRowId={(row) => row.id}
          fetchData={() => refetch()}
          isLoading={isLoading}
          serverPagination={pagination}
          onPageChange={(newPage) => updateSearchParams(newPage, limit, search)}
          onLimitChange={(newLimit) => updateSearchParams(1, newLimit, search)}
          serverSearch={localSearch}
          onSearchChange={setLocalSearch}
          initialColumnVisibility={{
            request_by: false,
            approved_by: false,
            refunded_by: false,
            note: false,
          }}
        />
      </div>

      {openDetailDialog && (
        <RefundRequestDetailDialog
          open={openDetailDialog}
          onOpenChange={(open) => {
            setOpenDetailDialog(open);
            if (!open) setSelectedRefundRequestId(null);
          }}
          refundRequestId={selectedRefundRequestId}
        />
      )}
    </div>
  );
}
