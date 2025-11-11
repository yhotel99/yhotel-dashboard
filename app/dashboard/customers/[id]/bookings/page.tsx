"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useCustomers } from "@/hooks/use-customers";
import { useBookings, type BookingRecord } from "@/hooks/use-bookings";
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
    accessorKey: "check_in_date",
    header: "Check-in",
    cell: ({ row }) => formatDate(row.original.check_in_date),
  },
  {
    accessorKey: "check_out_date",
    header: "Check-out",
    cell: ({ row }) => formatDate(row.original.check_out_date),
  },
  {
    accessorKey: "number_of_nights",
    header: "Số đêm",
    cell: ({ row }) => `${row.original.number_of_nights} đêm`,
  },
  {
    accessorKey: "total_guests",
    header: "Số khách",
    cell: ({ row }) => `${row.original.total_guests} người`,
  },
  {
    accessorKey: "total_amount",
    header: "Tổng tiền",
    cell: ({ row }) => formatCurrency(row.original.total_amount),
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "advance_payment",
    header: "Đặt cọc",
    cell: ({ row }) => formatCurrency(row.original.advance_payment),
  },
];

export default function CustomerBookingsPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customerName, setCustomerName] = useState<string>("Khách hàng");
  const [phone, setPhone] = useState<string>("");
  const { getCustomerById } = useCustomers();
  const { getBookingsByCustomerId } = useBookings();

  useEffect(() => {
    const fetchData = async () => {
      if (!customerId) return;

      setIsLoading(true);
      try {
        const [customerData, bookingsData] = await Promise.all([
          getCustomerById(customerId),
          getBookingsByCustomerId(customerId),
        ]);

        if (customerData) {
          setCustomerName(customerData.full_name);
          setPhone(customerData.phone || "");
        }

        setBookings(bookingsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        setBookings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [customerId, getCustomerById, getBookingsByCustomerId]);

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
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
