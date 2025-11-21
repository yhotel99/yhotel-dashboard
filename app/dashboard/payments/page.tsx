"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table";
import { usePayments } from "@/hooks/use-payments";
import type { PaymentWithBooking } from "@/lib/types";
import { PaymentStatusBadge } from "@/components/payments/status";
import { IdCell } from "@/components/payments/id-cell";
import { formatCurrency, formatDate } from "@/lib/utils";
import { paymentMethodLabels, paymentTypeLabels } from "@/lib/constants";
import { useDebounce } from "@/hooks/use-debounce";

const createColumns = (): ColumnDef<PaymentWithBooking>[] => [
  {
    accessorKey: "id",
    header: "Mã thanh toán",
    cell: ({ row }) => <IdCell id={row.original.id} />,
    size: 150,
    minSize: 130,
  },
  {
    accessorKey: "booking_id",
    header: "Mã booking",
    cell: ({ row }) => <IdCell id={row.original.booking_id} />,
    size: 150,
    minSize: 130,
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
    accessorKey: "amount",
    header: "Số tiền",
    cell: ({ row }) => formatCurrency(row.original.amount),
    size: 120,
    minSize: 100,
  },
  {
    accessorKey: "payment_type",
    header: "Loại thanh toán",
    cell: ({ row }) =>
      paymentTypeLabels[
        row.original.payment_type as keyof typeof paymentTypeLabels
      ] ?? row.original.payment_type,
    size: 130,
    minSize: 120,
  },
  {
    accessorKey: "payment_method",
    header: "Phương thức",
    cell: ({ row }) =>
      paymentMethodLabels[
        row.original.payment_method as keyof typeof paymentMethodLabels
      ] ?? row.original.payment_method,
    size: 150,
    minSize: 130,
  },
  {
    accessorKey: "payment_status",
    header: "Trạng thái",
    cell: ({ row }) => (
      <PaymentStatusBadge status={row.original.payment_status} />
    ),
    size: 130,
    minSize: 120,
  },
  {
    accessorKey: "paid_at",
    header: "Ngày thanh toán",
    cell: ({ row }) =>
      row.original.paid_at ? formatDate(row.original.paid_at) : "-",
    size: 150,
    minSize: 130,
  },
  {
    accessorKey: "refunded_at",
    header: "Ngày hoàn tiền",
    cell: ({ row }) =>
      row.original.refunded_at ? formatDate(row.original.refunded_at) : "-",
    size: 150,
    minSize: 130,
  },
  {
    accessorKey: "created_at",
    header: "Ngày tạo",
    cell: ({ row }) => formatDate(row.original.created_at),
    size: 150,
    minSize: 130,
  },
];

export default function PaymentsPage() {
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
      router.push(`/dashboard/payments?${params.toString()}`);
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

  const { payments, isLoading, pagination, fetchPayments } = usePayments(
    page,
    limit,
    search
  );

  // Fetch payments when component mounts or params change
  useEffect(() => {
    fetchPayments(page, limit, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search]);

  // Handle empty page after deletion or invalid page number
  useEffect(() => {
    if (!isLoading && pagination.totalPages > 0) {
      // If current page is beyond total pages, navigate to last page
      if (page > pagination.totalPages) {
        updateSearchParams(pagination.totalPages, limit, search);
        return;
      }
      // If current page is empty (after deletion), navigate to previous page
      if (payments.length === 0 && page > 1) {
        const targetPage = Math.min(page - 1, pagination.totalPages);
        updateSearchParams(targetPage, limit, search);
      }
    }
  }, [
    payments.length,
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
          <h1 className="text-2xl font-bold">Quản lý thanh toán</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi các giao dịch thanh toán
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={payments}
          searchKey="id"
          searchPlaceholder="Tìm kiếm theo mã thanh toán, mã booking..."
          emptyMessage="Không tìm thấy kết quả."
          entityName="thanh toán"
          getRowId={(row) => row.id}
          fetchData={() => fetchPayments(page, limit, search)}
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

