"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import type {
  RefundRequestStatus,
  RefundRequest,
  RefundRequestWithRelations,
  RefundRequestsResponse,
} from "@/lib/types";
import { useRefundRequests } from "@/hooks/use-refund-requests";
import { updateRefundRequestStatusAction } from "@/actions/refund-requests";
import { formatCurrency, formatDateOnly } from "@/lib/functions";
import { useDebounce } from "@/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IconCheck,
  IconCurrencyDollar,
  IconEye,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  REFUND_REQUEST_STATUS,
  refundRequestStatusLabels,
} from "@/lib/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy } from "lucide-react";
import { RefundRequestDetailDialog } from "./refund-request-detail-dialog";

// Refund request status colors
const refundRequestStatusColors: Record<RefundRequestStatus, string> = {
  [REFUND_REQUEST_STATUS.PENDING]:
    "bg-yellow-100 text-yellow-800 border-yellow-300",
  [REFUND_REQUEST_STATUS.APPROVED]: "bg-blue-100 text-blue-800 border-blue-300",
  [REFUND_REQUEST_STATUS.REJECTED]: "bg-red-100 text-red-800 border-red-300",
  [REFUND_REQUEST_STATUS.REFUNDED]:
    "bg-green-100 text-green-800 border-green-300",
};

// Status badge component
function RefundRequestStatusBadge({ status }: { status: RefundRequestStatus }) {
  return (
    <Badge
      variant="outline"
      className={`${refundRequestStatusColors[status]} border`}
    >
      {refundRequestStatusLabels[status]}
    </Badge>
  );
}

// Actions cell component
function RefundRequestActionsCell({
  refundRequest,
  onStatusChange,
  updateRefundRequestStatus,
  onViewDetail,
}: {
  refundRequest: RefundRequestWithRelations;
  onStatusChange: () => void;
  updateRefundRequestStatus: (
    id: string,
    status: RefundRequestStatus
  ) => Promise<RefundRequest>;
  onViewDetail: (refundRequest: RefundRequestWithRelations) => void;
}) {
  const [openApprove, setOpenApprove] = useState(false);
  const [openReject, setOpenReject] = useState(false);
  const [openRefund, setOpenRefund] = useState(false);

  const handleApprove = async () => {
    try {
      await updateRefundRequestStatus(
        refundRequest.id,
        REFUND_REQUEST_STATUS.APPROVED
      );
      toast.success("Đã duyệt yêu cầu hoàn tiền");
      setOpenApprove(false);
      onStatusChange();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể duyệt yêu cầu hoàn tiền"
      );
    }
  };

  const handleReject = async () => {
    try {
      await updateRefundRequestStatus(
        refundRequest.id,
        REFUND_REQUEST_STATUS.REJECTED
      );
      toast.success("Đã từ chối yêu cầu hoàn tiền");
      setOpenReject(false);
      onStatusChange();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể từ chối yêu cầu hoàn tiền"
      );
    }
  };

  const handleRefund = async () => {
    try {
      await updateRefundRequestStatus(
        refundRequest.id,
        REFUND_REQUEST_STATUS.REFUNDED
      );
      toast.success("Đã hoàn tiền thành công");
      setOpenRefund(false);
      onStatusChange();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể hoàn tiền"
      );
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onViewDetail(refundRequest)}
            >
              <IconEye className="size-4" />
              <span className="sr-only">Xem chi tiết</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Xem chi tiết</TooltipContent>
        </Tooltip>

        {refundRequest.status === REFUND_REQUEST_STATUS.PENDING && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => setOpenApprove(true)}
                >
                  <IconCheck className="size-4" />
                  <span className="sr-only">Duyệt yêu cầu</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duyệt yêu cầu</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setOpenReject(true)}
                >
                  <IconX className="size-4" />
                  <span className="sr-only">Từ chối</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Từ chối</TooltipContent>
            </Tooltip>
          </>
        )}

        {refundRequest.status === REFUND_REQUEST_STATUS.APPROVED && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => setOpenRefund(true)}
              >
                <IconCurrencyDollar className="size-4" />
                <span className="sr-only">Hoàn tiền</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hoàn tiền</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Approve Confirmation Dialog */}
      {openApprove && (
        <Dialog open={openApprove} onOpenChange={setOpenApprove}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận duyệt yêu cầu hoàn tiền</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn duyệt yêu cầu hoàn tiền này không? Yêu cầu
                sẽ được chuyển sang trạng thái &quot;Đã duyệt&quot; và có thể
                thực hiện hoàn tiền.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenApprove(false)}>
                Hủy
              </Button>
              <Button onClick={handleApprove}>Xác nhận duyệt</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Confirmation Dialog */}
      {openReject && (
        <Dialog open={openReject} onOpenChange={setOpenReject}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận từ chối yêu cầu hoàn tiền</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn từ chối yêu cầu hoàn tiền này không? Thao
                tác này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenReject(false)}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Xác nhận từ chối
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Refund Confirmation Dialog */}
      {openRefund && (
        <Dialog open={openRefund} onOpenChange={setOpenRefund}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận hoàn tiền</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn hoàn tiền cho yêu cầu này không? Số tiền{" "}
                <strong>{formatCurrency(refundRequest.amount)}</strong> sẽ được
                hoàn lại cho khách hàng. Thao tác này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenRefund(false)}>
                Hủy
              </Button>
              <Button onClick={handleRefund}>Xác nhận hoàn tiền</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Create columns
const createColumns = (
  onStatusChange: () => void,
  updateRefundRequestStatus: (
    id: string,
    status: RefundRequestStatus
  ) => Promise<RefundRequest>,
  onViewDetail: (refundRequest: RefundRequestWithRelations) => void
): ColumnDef<RefundRequestWithRelations>[] => [
  {
    accessorKey: "Mã yêu cầu",
    header: "Mã yêu cầu",
    cell: ({ row }) => {
      const id = row.original.id;
      const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        toast.success("Đã sao chép mã yêu cầu!");
      };

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex items-center justify-between gap-1.5 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
              onClick={handleCopy}
            >
              <span className="font-mono text-sm truncate uppercase">{id}</span>
              <Copy className="size-3 text-muted-foreground shrink-0" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col gap-1">
              <p className="font-mono text-xs">{id}</p>
              <p className="text-[10px] text-muted-foreground">
                Click để sao chép
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    },
    size: 120,
    minSize: 100,
  },
  {
    accessorKey: "Khách hàng",
    header: "Khách hàng",
    cell: ({ row }) => row.original.bookings?.customers?.full_name ?? "-",
    size: 150,
    minSize: 120,
  },
  {
    accessorKey: "Phòng",
    header: "Phòng",
    cell: ({ row }) => row.original.bookings?.rooms?.name ?? "-",
    size: 100,
    minSize: 80,
  },
  {
    accessorKey: "Số tiền",
    header: "Số tiền",
    cell: ({ row }) => formatCurrency(row.original.amount),
    size: 120,
    minSize: 100,
  },
  {
    accessorKey: "Trạng thái",
    header: "Trạng thái",
    cell: ({ row }) => (
      <RefundRequestStatusBadge status={row.original.status} />
    ),
    size: 120,
    minSize: 100,
  },

  {
    accessorKey: "Ngày tạo",
    header: "Ngày tạo",
    cell: ({ row }) => formatDateOnly(row.original.created_at),
    size: 120,
    minSize: 100,
  },
  {
    accessorKey: "Người yêu cầu",
    header: "Người yêu cầu",
    cell: ({ row }) =>
      row.original.request_by_profile?.full_name || (
        <span className="font-mono text-sm text-muted-foreground">
          {row.original.request_by.slice(0, 8).toUpperCase()}
        </span>
      ),
    size: 150,
    minSize: 120,
    enableHiding: true,
  },

  {
    id: "Hành động",
    cell: ({ row }) => (
      <RefundRequestActionsCell
        refundRequest={row.original}
        onStatusChange={onStatusChange}
        updateRefundRequestStatus={updateRefundRequestStatus}
        onViewDetail={onViewDetail}
      />
    ),
    size: 110,
    minSize: 110,
    maxSize: 120,
    enableHiding: false,
  },
];

// Main content component
export function RefundRequestsContent({
  initialData,
}: {
  initialData: RefundRequestsResponse;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = useState("");
  const [selectedRefundRequest, setSelectedRefundRequest] =
    useState<RefundRequestWithRelations | null>(null);
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
  const debouncedSearch = useDebounce(localSearch, 500);

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
      setSelectedRefundRequest(refundRequest);
      setOpenDetailDialog(true);
    },
    []
  );

  const columns = useMemo(
    () =>
      createColumns(
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
          onOpenChange={setOpenDetailDialog}
          refundRequest={selectedRefundRequest}
        />
      )}
    </div>
  );
}
