"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useBookings } from "@/hooks/use-bookings";
import { useDebounce } from "@/hooks/use-debounce";
import { StatusBadge } from "@/components/bookings/status";
import { formatCurrency, formatDateOnly } from "@/lib/functions";
import { BookingRecord } from "@/lib/types";

const createColumns = (): ColumnDef<BookingRecord>[] => [
  {
    accessorKey: "Mã booking",
    header: "Mã booking",
    cell: ({ row }) => row.original.id.slice(0, 8),
  },
  {
    accessorKey: "Phòng",
    header: "Phòng",
    cell: ({ row }) => row.original.rooms?.name ?? "-",
  },
  {
    accessorKey: "Ngày check-in",
    header: "Check-in",
    cell: ({ row }) => formatDateOnly(row.original.check_in),
  },
  {
    accessorKey: "Ngày check-out",
    header: "Check-out",
    cell: ({ row }) => formatDateOnly(row.original.check_out),
  },
  {
    accessorKey: "Số đêm",
    header: "Số đêm",
    cell: ({ row }) => `${row.original.number_of_nights} đêm`,
  },
  {
    accessorKey: "Tổng tiền",
    header: "Tổng tiền",
    cell: ({ row }) => formatCurrency(row.original.total_amount),
  },
  {
    accessorKey: "Tiền đặt cọc",
    header: "Tiền cọc",
    cell: ({ row }) => formatCurrency(row.original.advance_payment || 0),
  },
  {
    accessorKey: "Trạng thái",
    header: "Trạng thái",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export default function CustomerBookingsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = params.id as string;

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
      router.push(
        `/dashboard/customers/${customerId}/bookings?${params.toString()}`
      );
    },
    [router, searchParams, customerId]
  );

  // Debounce search
  const debouncedSearch = useDebounce(localSearch, 500);

  useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearchParams(1, limit, debouncedSearch);
    }
  }, [debouncedSearch, search, limit, updateSearchParams]);

  const { bookings, isLoading, pagination, mutate } = useBookings({
    page,
    limit,
    search,
    customerId: customerId || null,
  });

  const customerInfo = useMemo(() => {
    if (bookings.length > 0 && bookings[0].customers) {
      return {
        name: bookings[0].customers.full_name,
        phone: bookings[0].customers.phone || "",
      };
    }
    return {
      name: "Khách hàng",
      phone: "",
    };
  }, [bookings]);

  const columns = useMemo(() => createColumns(), []);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/customers`)}
          className="h-10 w-10 cursor-pointer"
        >
          <IconArrowLeft className="size-4" />
          <span className="sr-only">Quay lại</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Booking của {customerInfo.name}
          </h1>
          {customerInfo.phone ? (
            <p className="text-muted-foreground text-sm">
              SĐT: {customerInfo.phone}
            </p>
          ) : null}
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={bookings}
          searchKey="id"
          searchPlaceholder="Tìm theo mã booking hoặc số phòng..."
          emptyMessage="Khách hàng chưa có booking."
          entityName="booking"
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
