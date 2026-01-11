"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { usePaymentLogs } from "@/hooks/use-payment-logs";
import type { PaymentLogsResponse, PaymentLogWithBooking } from "@/lib/types";
import { formatCurrency, formatDateOnly, formatDate } from "@/lib/functions";
import { useDebounce } from "@/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const createColumns = (): ColumnDef<PaymentLogWithBooking>[] => [
  {
    accessorKey: "booking_code",
    header: "Mã Booking",
    cell: ({ row }) => {
      const bookingCode = row.original.booking_code;
      if (!bookingCode) return "-";
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="max-w-[100px] truncate block">{bookingCode}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs break-all">{bookingCode}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
    size: 120,
    minSize: 100,
  },
  {
    accessorKey: "transaction_id",
    header: "Mã Giao Dịch",
    cell: ({ row }) => {
      const transactionId = row.original.transaction_id;
      if (!transactionId) return "-";
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="max-w-[120px] truncate block">
              {transactionId}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs break-all">{transactionId}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
    size: 150,
    minSize: 120,
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
    cell: ({ row }) =>
      row.original.amount ? formatCurrency(row.original.amount) : "-",
    size: 120,
    minSize: 100,
  },
  {
    accessorKey: "bank_code",
    header: "Ngân hàng",
    cell: ({ row }) => row.original.bank_code || "-",
    size: 100,
    minSize: 80,
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => {
      const status = row.original.status;
      if (!status) return "-";
      return (
        <Badge variant={status === "success" ? "default" : "secondary"}>
          {status}
        </Badge>
      );
    },
    size: 120,
    minSize: 100,
  },
  {
    accessorKey: "content",
    header: "Nội dung",
    cell: ({ row }) => {
      const content = row.original.content;
      if (!content) return "-";
      return (
        <span className="max-w-[200px] truncate block" title={content}>
          {content}
        </span>
      );
    },
    size: 200,
    minSize: 150,
  },
  {
    accessorKey: "processed_at",
    header: "Thời gian xử lý",
    cell: ({ row }) =>
      row.original.processed_at ? formatDate(row.original.processed_at) : "-",
    size: 150,
    minSize: 130,
  },
  {
    accessorKey: "created_at",
    header: "Ngày tạo",
    cell: ({ row }) => formatDateOnly(row.original.created_at),
    size: 150,
    minSize: 130,
  },
  {
    id: "actions",
    header: "Chi tiết",
    cell: ({ row }) => {
      const log = row.original;
      return (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="!max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chi tiết Webhook Payment</DialogTitle>
              <DialogDescription>
                Thông tin chi tiết về webhook thanh toán
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh]">
              <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Mã Booking
                  </p>
                  <p className="text-sm">{log.booking_code || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Mã Giao Dịch
                  </p>
                  <p className="text-sm">{log.transaction_id || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Khách hàng
                  </p>
                  <p className="text-sm">
                    {log.bookings?.customers?.full_name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Phòng
                  </p>
                  <p className="text-sm">{log.bookings?.rooms?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Số tiền
                  </p>
                  <p className="text-sm">
                    {log.amount ? formatCurrency(log.amount) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Ngân hàng
                  </p>
                  <p className="text-sm">{log.bank_code || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Trạng thái
                  </p>
                  <p className="text-sm">{log.status || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Thời gian xử lý
                  </p>
                  <p className="text-sm">
                    {log.processed_at ? formatDate(log.processed_at) : "-"}
                  </p>
                </div>
              </div>
              {log.content && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Nội dung
                  </p>
                  <p className="text-sm bg-muted p-3 rounded-md">
                    {log.content}
                  </p>
                </div>
              )}
              {log.raw_payload && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Raw Payload
                  </p>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[300px]">
                    {JSON.stringify(log.raw_payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      );
    },
    size: 100,
    minSize: 80,
  },
];

export function PaymentLogsContent({
  initialData,
}: {
  initialData: PaymentLogsResponse;
}) {
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
      router.push(`/dashboard/payment-logs?${params.toString()}`);
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

  const { paymentLogs, isLoading, pagination, mutate } = usePaymentLogs({
    search,
    page,
    limit,
    fallbackData: initialData,
  });

  // Handle empty page after deletion or invalid page number
  useEffect(() => {
    if (!isLoading && pagination.totalPages > 0) {
      // If current page is beyond total pages, navigate to last page
      if (page > pagination.totalPages) {
        updateSearchParams(pagination.totalPages, limit, search);
        return;
      }
      // If current page is empty (after deletion), navigate to previous page
      if (paymentLogs.length === 0 && page > 1) {
        const targetPage = Math.min(page - 1, pagination.totalPages);
        updateSearchParams(targetPage, limit, search);
      }
    }
  }, [
    paymentLogs.length,
    pagination.totalPages,
    page,
    limit,
    search,
    isLoading,
    updateSearchParams,
  ]);

  const columns = useMemo(() => createColumns(), []);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Lịch sử Webhook Thanh toán</h1>
          <p className="text-muted-foreground text-sm">
            Xem và theo dõi lịch sử webhook thanh toán từ hệ thống
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={paymentLogs}
          searchKey="id"
          searchPlaceholder="Tìm kiếm theo mã booking, mã giao dịch, nội dung..."
          emptyMessage="Không tìm thấy kết quả."
          entityName="lịch sử thanh toán"
          getRowId={(row) => row.id}
          fetchData={async () => {
            await mutate();
          }}
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
