"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { IconDotsVertical, IconPlus } from "@tabler/icons-react";
import { useMemo, useEffect, useCallback, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/data-table";
import { useRooms, type Room } from "@/hooks/use-rooms";

// Room type labels
const roomTypeLabels: Record<Room["room_type"], string> = {
  standard: "Standard",
  deluxe: "Deluxe",
  superior: "Superior",
  family: "Family",
};

// Status badge component
const StatusBadge = ({ status }: { status: Room["status"] }) => {
  const statusConfig = {
    available: { label: "Có sẵn", variant: "default" as const },
    maintenance: { label: "Bảo trì", variant: "outline" as const },
    inactive: { label: "Không hoạt động", variant: "secondary" as const },
  };

  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Actions cell component
function ActionsCell({ roomId }: { roomId: string }) {
  const router = useRouter();

  return (
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
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem
          onClick={() => router.push(`/dashboard/rooms/edit/${roomId}`)}
        >
          Chỉnh sửa
        </DropdownMenuItem>
        <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Xóa</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Table columns
const columns: ColumnDef<Room>[] = [
  {
    accessorKey: "name",
    header: "Tên phòng",
  },
  {
    accessorKey: "room_type",
    header: "Loại phòng",
    cell: ({ row }) => roomTypeLabels[row.original.room_type],
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "price_per_night",
    header: "Giá mỗi đêm",
    cell: ({ row }) => {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(row.original.price_per_night);
    },
  },
  {
    accessorKey: "max_guests",
    header: "Số khách tối đa",
    cell: ({ row }) => `${row.original.max_guests} người`,
  },
  {
    accessorKey: "amenities",
    header: "Tiện ích",
    cell: ({ row }) => {
      const amenities = Array.isArray(row.original.amenities)
        ? row.original.amenities
        : [];
      if (amenities.length === 0) {
        return <span className="text-muted-foreground text-sm">-</span>;
      }
      return (
        <div className="flex gap-1 flex-wrap">
          {amenities.map((amenity, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {amenity}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell roomId={row.original.id} />,
  },
];

export default function RoomsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get page, limit, and search from URL search params
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

  // Update URL search params when pagination changes
  const updateSearchParams = useCallback(
    (newPage: number, newLimit: number, newSearch?: string) => {
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
      if (newSearch !== undefined) {
        if (newSearch.trim() !== "") {
          params.set("search", newSearch.trim());
        } else {
          params.delete("search");
        }
      }
      router.push(`/dashboard/rooms?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Local search state for immediate UI updates
  const [localSearch, setLocalSearch] = useState(search);

  // Debounce search value - update URL after user stops typing
  const debouncedSearch = useDebounce(localSearch, 500);

  // Sync local search with URL search param when it changes externally
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Update URL when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearchParams(1, limit, debouncedSearch);
    }
  }, [debouncedSearch, search, limit, updateSearchParams]);

  const { rooms, isLoading, pagination, fetchRooms } = useRooms(
    page,
    limit,
    search
  );

  // Handle empty page after deletion or invalid page number
  useEffect(() => {
    if (!isLoading && pagination.totalPages > 0) {
      // If current page is beyond total pages, navigate to last page
      if (page > pagination.totalPages) {
        updateSearchParams(pagination.totalPages, limit);
        return;
      }
      // If current page is empty (after deletion), navigate to previous page
      if (rooms.length === 0 && page > 1) {
        const targetPage = Math.min(page - 1, pagination.totalPages);
        updateSearchParams(targetPage, limit);
      }
    }
  }, [
    rooms.length,
    pagination.totalPages,
    page,
    limit,
    isLoading,
    updateSearchParams,
  ]);

  const handleCreateRoom = () => {
    router.push("/dashboard/rooms/create");
  };

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý phòng</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi thông tin các phòng trong khách sạn
          </p>
        </div>
        <Button onClick={handleCreateRoom} className="gap-2">
          <IconPlus className="size-4" />
          Tạo phòng mới
        </Button>
      </div>

      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={rooms}
          searchKey="name"
          searchPlaceholder="Tìm kiếm theo tên phòng, loại phòng..."
          emptyMessage="Không tìm thấy kết quả."
          entityName="phòng"
          getRowId={(row) => row.id}
          fetchData={() => fetchRooms(page, limit, search)}
          isLoading={isLoading}
          serverPagination={pagination}
          onPageChange={(newPage) => updateSearchParams(newPage, limit, search)}
          onLimitChange={(newLimit) => updateSearchParams(1, newLimit, search)}
          serverSearch={localSearch}
          onSearchChange={setLocalSearch}
        ></DataTable>
      </div>
    </div>
  );
}
