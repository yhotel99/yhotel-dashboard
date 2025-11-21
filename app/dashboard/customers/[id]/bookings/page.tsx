"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useCustomers } from "@/hooks/use-customers";
import { useBookings, type BookingRecord } from "@/hooks/use-bookings";
import { useDebounce } from "@/hooks/use-debounce";
import { StatusBadge } from "@/components/bookings/status";
import { formatCurrency, formatDate } from "@/lib/utils";

const createColumns = (): ColumnDef<BookingRecord>[] => [
  {
    accessorKey: "id",
    header: "Mã booking",
    cell: ({ row }) => row.original.id.slice(0, 8),
  },
  {
    accessorKey: "room_id",
    header: "Phòng",
    cell: ({ row }) => row.original.rooms?.name ?? "-",
  },
  {
    accessorKey: "check_in",
    header: "Check-in",
    cell: ({ row }) => formatDate(row.original.check_in),
  },
  {
    accessorKey: "check_out",
    header: "Check-out",
    cell: ({ row }) => formatDate(row.original.check_out),
  },
  {
    accessorKey: "number_of_nights",
    header: "Số đêm",
    cell: ({ row }) => `${row.original.number_of_nights} đêm`,
  },
  {
    accessorKey: "total_amount",
    header: "Tổng tiền",
    cell: ({ row }) => formatCurrency(row.original.total_amount),
  },
  {
    accessorKey: "advance_payment",
    header: "Tiền cọc",
    cell: ({ row }) => formatCurrency(row.original.advance_payment || 0),
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export default function CustomerBookingsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = params.id as string;

  const [customerName, setCustomerName] = useState<string>("Khách hàng");
  const [phone, setPhone] = useState<string>("");
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

  const { getCustomerById } = useCustomers();
  const { bookings, isLoading, pagination, fetchBookingsByCustomerId } =
    useBookings({
      page,
      limit,
      search,
    });

  // Fetch bookings when component mounts or params change
  useEffect(() => {
    if (customerId) {
      fetchBookingsByCustomerId(customerId, page, limit, search || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, page, limit, search]);

  // Fetch customer info
  useEffect(() => {
    const fetchCustomerInfo = async () => {
      if (!customerId) return;

      try {
        const customerData = await getCustomerById(customerId);
        if (customerData) {
          setCustomerName(customerData.full_name);
          setPhone(customerData.phone || "");
        }
      } catch (error) {
        console.error("Error fetching customer:", error);
      }
    };

    fetchCustomerInfo();
  }, [customerId, getCustomerById]);

  const columns = useMemo(() => createColumns(), []);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="h-10 w-10 cursor-pointer"
        >
          <IconArrowLeft className="size-4" />
          <span className="sr-only">Quay lại</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Booking của {customerName}</h1>
          {phone ? (
            <p className="text-muted-foreground text-sm">SĐT: {phone}</p>
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
          fetchData={() =>
            fetchBookingsByCustomerId(customerId, page, limit, search || null)
          }
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
