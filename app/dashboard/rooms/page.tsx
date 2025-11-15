"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { IconPlus } from "@tabler/icons-react";
import { useMemo, useEffect, useCallback, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useRooms, type Room } from "@/hooks/use-rooms";
import { toast } from "sonner";
import { StatusBadge } from "@/components/rooms/status";
import { RoomActionsCell } from "@/components/rooms/actions-cell";
import { ThumbnailCell } from "@/components/rooms/thumbnail-cell";
import { AmenitiesCell } from "@/components/rooms/amenities-cell";
import { DeleteRoomDialog } from "@/components/rooms/delete-room-dialog";
import { UpdateRoomStatusDialog } from "@/components/rooms/update-room-status-dialog";
import { formatCurrency } from "@/lib/utils";
import { roomTypeLabels } from "@/lib/constants";

// Table columns factory
const createColumns = (
  onDelete: (room: Room) => void,
  onChangeStatus?: (room: Room) => void
): ColumnDef<Room>[] => [
  {
    accessorKey: "thumbnail",
    header: "Ảnh",
    cell: ({ row }) => (
      <ThumbnailCell thumbnailUrl={row.original.thumbnail?.url} />
    ),
  },
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
    cell: ({ row }) => formatCurrency(row.original.price_per_night),
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
      return <AmenitiesCell amenities={amenities} />;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <RoomActionsCell
        room={row.original}
        onDelete={onDelete}
        onChangeStatus={onChangeStatus}
      />
    ),
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

  const {
    rooms,
    isLoading,
    pagination,
    fetchRooms,
    deleteRoom,
    updateRoom,
    updateRoomStatus,
  } = useRooms(page, limit, search);

  // Delete room dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  // Update status dialog state
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [roomToUpdateStatus, setRoomToUpdateStatus] = useState<Room | null>(
    null
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

  const handleDeleteClick = useCallback((room: Room) => {
    setRoomToDelete(room);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleChangeStatusClick = useCallback((room: Room) => {
    setRoomToUpdateStatus(room);
    setIsStatusDialogOpen(true);
  }, []);

  const handleConfirmStatusUpdate = useCallback(
    async (roomId: string, newStatus: Room["status"]) => {
      try {
        await updateRoomStatus(roomId, newStatus);
        toast.success("Cập nhật trạng thái thành công!", {
          description: `Trạng thái phòng đã được cập nhật thành công.`,
        });
        setIsStatusDialogOpen(false);
        setRoomToUpdateStatus(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể cập nhật trạng thái";
        toast.error("Cập nhật trạng thái thất bại", {
          description: errorMessage,
        });
        throw err;
      }
    },
    [updateRoomStatus]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!roomToDelete) return;

    try {
      await deleteRoom(roomToDelete.id);
      toast.success("Xóa phòng thành công!", {
        description: `Phòng ${roomToDelete.name} đã được xóa thành công.`,
      });
      setIsDeleteDialogOpen(false);
      setRoomToDelete(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể xóa phòng";
      toast.error("Xóa phòng thất bại", {
        description: errorMessage,
      });
      throw err;
    }
  }, [roomToDelete, deleteRoom]);

  // Create columns with delete and change status handlers
  const columns = useMemo(
    () => createColumns(handleDeleteClick, handleChangeStatusClick),
    [handleDeleteClick, handleChangeStatusClick]
  );

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

      <DeleteRoomDialog
        room={roomToDelete}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
      />

      <UpdateRoomStatusDialog
        room={roomToUpdateStatus}
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
        onConfirm={handleConfirmStatusUpdate}
      />
    </div>
  );
}
