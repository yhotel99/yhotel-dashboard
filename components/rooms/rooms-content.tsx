"use client";

import { useRouter } from "next/navigation";
import { useShallowSearchParams } from "@/hooks/use-shallow-search-params";
import { IconPlus } from "@tabler/icons-react";
import { useMemo, useEffect, useCallback, useState, useRef } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { buildRoomsSwrKey, useRooms } from "@/hooks/use-rooms";
import {
  updateRoomStatus as updateRoomStatusAction,
  deleteRoom as deleteRoomAction,
} from "@/actions/rooms";
import { toast } from "sonner";
import { createColumns, ROOMS_COLUMNS } from "@/components/rooms/columns";
import { DeleteRoomDialog } from "@/components/rooms/delete-room-dialog";
import { RoomDetailDialog } from "@/components/rooms/room-detail-dialog";
import type { Room, RoomsResponse } from "@/lib/types";
import { useBranch } from "@/contexts/branch-context";

export function RoomsContent({ initialData }: { initialData: RoomsResponse }) {
  const router = useRouter();
  const { searchParams, pushSearchParams } = useShallowSearchParams();
  const initialSwrKeyRef = useRef<string | null>(null);
  const { filterBranchId, branches } = useBranch();
  const branchNameById = useMemo(
    () => Object.fromEntries(branches.map((b) => [b.id, b.name])),
    [branches]
  );

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
      pushSearchParams((params) => {
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
      });
    },
    [pushSearchParams]
  );

  // Local search state for immediate UI updates
  const [localSearch, setLocalSearch] = useState(search);

  // Debounce search value - update URL after user stops typing
  const debouncedSearch = useDebounce(localSearch, 300);


  // Update URL when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearchParams(1, limit, debouncedSearch);
    }
  }, [debouncedSearch, search, limit, updateSearchParams]);

  if (initialSwrKeyRef.current === null) {
    initialSwrKeyRef.current = buildRoomsSwrKey({
      search,
      page,
      limit,
      branchId: filterBranchId,
    });
  }

  const { rooms, isLoading, pagination, mutate } = useRooms({
    search,
    page,
    limit,
    branchId: filterBranchId,
    fallbackData: initialData,
    initialSwrKey: initialSwrKeyRef.current,
  });

  // Delete room dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Đóng chi tiết khi đổi chi nhánh để không giữ phòng của CN cũ
  useEffect(() => {
    setIsDetailDialogOpen(false);
    setSelectedRoom(null);
  }, [filterBranchId]);

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

  const handleConfirmDelete = useCallback(async () => {
    if (!roomToDelete) return;

    try {
      await deleteRoomAction(roomToDelete.id);
      toast.success("Xóa phòng thành công!", {
        description: `Phòng ${roomToDelete.name} đã được xóa thành công.`,
      });
      setIsDeleteDialogOpen(false);
      setRoomToDelete(null);
      // Refresh SWR cache
      await mutate();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể xóa phòng";
      toast.error("Xóa phòng thất bại", {
        description: errorMessage,
      });
      throw err;
    }
  }, [roomToDelete, mutate]);

  const handleInlineStatusChange = useCallback(
    async (roomId: string, newStatus: Room["status"]) => {
      try {
        await updateRoomStatusAction(roomId, newStatus);
        toast.success("Cập nhật trạng thái thành công!", {
          description: `Trạng thái phòng đã được cập nhật thành công.`,
        });
        // Refresh SWR cache
        await mutate();
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể cập nhật trạng thái phòng";
        toast.error("Cập nhật trạng thái thất bại", {
          description: errorMessage,
        });
        throw err;
      }
    },
    [mutate]
  );

  const handleViewDetail = useCallback((room: Room) => {
    setSelectedRoom(room);
    setIsDetailDialogOpen(true);
  }, []);

  // Create columns with delete and change status handlers
  const columns = useMemo(
    () =>
      createColumns(
        handleDeleteClick,
        handleInlineStatusChange,
        handleViewDetail,
        { branchNameById }
      ),
    [handleDeleteClick, handleInlineStatusChange, handleViewDetail, branchNameById]
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
          searchPlaceholder="Tìm kiếm theo tên phòng, số phòng..."
          emptyMessage="Không tìm thấy kết quả."
          entityName="phòng"
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
          initialColumnVisibility={{
            [ROOMS_COLUMNS.AMENITIES.accessorKey]: false,
            [ROOMS_COLUMNS.BRANCH.accessorKey]: false,
          }}
        ></DataTable>
      </div>

      {isDeleteDialogOpen && (
        <DeleteRoomDialog
          room={roomToDelete}
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
        />
      )}

      {selectedRoom && (
        <RoomDetailDialog
          key={selectedRoom.id}
          room={selectedRoom}
          open={isDetailDialogOpen}
          onOpenChange={(open) => {
            setIsDetailDialogOpen(open);
            if (!open) {
              setSelectedRoom(null);
            }
          }}
        />
      )}
    </div>
  );
}
