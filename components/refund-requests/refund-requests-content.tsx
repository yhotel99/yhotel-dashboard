"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import type {
  RefundRequestStatus,
  RefundRequest,
  RefundRequestWithRelations,
} from "@/lib/types";
import { useRefundRequests } from "@/hooks/use-refund-requests";
import { updateRefundRequestStatusAction } from "@/actions/refund-requests";
import { formatCurrency, formatDateOnly } from "@/lib/functions";
import { useDebounce } from "@/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconDotsVertical } from "@tabler/icons-react";
import { toast } from "sonner";
import {
  REFUND_REQUEST_STATUS,
  refundRequestStatusLabels,
} from "@/lib/constants";

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
}: {
  refundRequest: RefundRequestWithRelations;
  onStatusChange: () => void;
  updateRefundRequestStatus: (
    id: string,
    status: RefundRequestStatus
  ) => Promise<RefundRequest>;
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {refundRequest.status === REFUND_REQUEST_STATUS.PENDING && (
            <>
              <DropdownMenuItem onClick={() => setOpenApprove(true)}>
                Duyệt yêu cầu
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setOpenReject(true)}
                variant="destructive"
              >
                Từ chối
              </DropdownMenuItem>
            </>
          )}
          {refundRequest.status === REFUND_REQUEST_STATUS.APPROVED && (
            <DropdownMenuItem onClick={() => setOpenRefund(true)}>
              Hoàn tiền
            </DropdownMenuItem>
          )}
          {refundRequest.status !== REFUND_REQUEST_STATUS.PENDING &&
            refundRequest.status !== REFUND_REQUEST_STATUS.APPROVED && (
              <DropdownMenuItem disabled>
                Không có hành động khả dụng
              </DropdownMenuItem>
            )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Approve Confirmation Dialog */}
      <Dialog open={openApprove} onOpenChange={setOpenApprove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận duyệt yêu cầu hoàn tiền</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn duyệt yêu cầu hoàn tiền này không? Yêu cầu
              sẽ được chuyển sang trạng thái &quot;Đã duyệt&quot; và có thể thực
              hiện hoàn tiền.
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

      {/* Reject Confirmation Dialog */}
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

      {/* Refund Confirmation Dialog */}
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
    </>
  );
}

// Create columns
const createColumns = (
  onStatusChange: () => void,
  updateRefundRequestStatus: (
    id: string,
    status: RefundRequestStatus
  ) => Promise<RefundRequest>
): ColumnDef<RefundRequestWithRelations>[] => [
  {
    accessorKey: "id",
    header: "Mã yêu cầu",
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.id.slice(0, 8).toUpperCase()}
      </span>
    ),
    size: 120,
    minSize: 100,
  },
  {
    accessorKey: "customer",
    header: "Khách hàng",
    cell: ({ row }) => row.original.bookings?.customers?.full_name ?? "-",
    size: 150,
    minSize: 120,
  },
  {
    accessorKey: "room",
    header: "Phòng",
    cell: ({ row }) => row.original.bookings?.rooms?.name ?? "-",
    size: 100,
    minSize: 80,
  },
  {
    accessorKey: "booking_id",
    header: "Mã booking",
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.booking_id.slice(0, 8).toUpperCase()}
      </span>
    ),
    size: 120,
    minSize: 100,
  },
  {
    accessorKey: "amount",
    header: "Số tiền",
    cell: ({ row }) => formatCurrency(row.original.amount),
    size: 120,
    minSize: 100,
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => (
      <RefundRequestStatusBadge status={row.original.status} />
    ),
    size: 120,
    minSize: 100,
  },
  {
    accessorKey: "reason",
    header: "Lý do",
    cell: ({ row }) => row.original.reason ?? "-",
    size: 150,
    minSize: 120,
  },
  {
    accessorKey: "created_at",
    header: "Ngày tạo",
    cell: ({ row }) => formatDateOnly(row.original.created_at),
    size: 120,
    minSize: 100,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <RefundRequestActionsCell
        refundRequest={row.original}
        onStatusChange={onStatusChange}
        updateRefundRequestStatus={updateRefundRequestStatus}
      />
    ),
    size: 40,
    minSize: 40,
    maxSize: 50,
  },
];

// Main content component
export function RefundRequestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = useState("");

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

  // Sync local search with URL search
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Debounce search
  const debouncedSearch = useDebounce(localSearch, 500);

  useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearchParams(1, limit, debouncedSearch);
    }
  }, [debouncedSearch, search, limit, updateSearchParams]);

  // Use SWR hook for refund requests
  const { refundRequests, isLoading, pagination, refetch, mutate } =
    useRefundRequests(page, limit, search);

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

  const columns = useMemo(
    () => createColumns(() => refetch(), handleUpdateRefundRequestStatus),
    [refetch, handleUpdateRefundRequestStatus]
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
        />
      </div>
    </div>
  );
}

