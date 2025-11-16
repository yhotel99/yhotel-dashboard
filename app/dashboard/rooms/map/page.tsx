"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useRoomMap } from "@/hooks/use-room-map";
import { RoomCard } from "@/components/rooms/room-card";
import {
  IconSearch,
  IconLayoutGrid,
  IconList,
  IconRefresh,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  roomTypeLabels,
  type RoomMapStatus,
  ROOM_MAP_STATUS,
  roomMapStatusLabels,
  roomMapStatusColors,
} from "@/lib/constants";

const statusFilters: Array<{
  status: RoomMapStatus | "all";
  label: string;
  color: string;
  count?: number;
}> = [
  { status: "all", label: "Tất cả", color: "bg-gray-200" },
  {
    status: ROOM_MAP_STATUS.VACANT,
    label: roomMapStatusLabels[ROOM_MAP_STATUS.VACANT],
    color: roomMapStatusColors[ROOM_MAP_STATUS.VACANT],
  },
  {
    status: ROOM_MAP_STATUS.UPCOMING_CHECKIN,
    label: roomMapStatusLabels[ROOM_MAP_STATUS.UPCOMING_CHECKIN],
    color: roomMapStatusColors[ROOM_MAP_STATUS.UPCOMING_CHECKIN],
  },
  {
    status: ROOM_MAP_STATUS.OCCUPIED,
    label: roomMapStatusLabels[ROOM_MAP_STATUS.OCCUPIED],
    color: roomMapStatusColors[ROOM_MAP_STATUS.OCCUPIED],
  },
  {
    status: ROOM_MAP_STATUS.UPCOMING_CHECKOUT,
    label: roomMapStatusLabels[ROOM_MAP_STATUS.UPCOMING_CHECKOUT],
    color: roomMapStatusColors[ROOM_MAP_STATUS.UPCOMING_CHECKOUT],
  },
  {
    status: ROOM_MAP_STATUS.OVERDUE_CHECKOUT,
    label: roomMapStatusLabels[ROOM_MAP_STATUS.OVERDUE_CHECKOUT],
    color: roomMapStatusColors[ROOM_MAP_STATUS.OVERDUE_CHECKOUT],
  },
];

// Nhóm phòng theo tầng (giả sử tên phòng có format số tầng ở đầu, ví dụ: 101, 201, STD201)
function extractFloor(roomName: string): number {
  // Tìm số đầu tiên trong tên phòng
  const match = roomName.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    // Nếu số >= 100, lấy chữ số đầu tiên làm tầng (101 -> 1, 201 -> 2)
    if (num >= 100) {
      return Math.floor(num / 100);
    }
    return num;
  }
  return 0;
}

function groupRoomsByFloor(rooms: ReturnType<typeof useRoomMap>["rooms"]) {
  const grouped = new Map<number, typeof rooms>();

  rooms.forEach((room) => {
    const floor = extractFloor(room.name);
    if (!grouped.has(floor)) {
      grouped.set(floor, []);
    }
    grouped.get(floor)!.push(room);
  });

  // Sắp xếp theo tầng
  const sortedFloors = Array.from(grouped.entries()).sort(
    (a, b) => a[0] - b[0]
  );

  return sortedFloors.map(([floor, rooms]) => ({
    floor,
    rooms,
    label: `Tầng ${floor}`,
  }));
}

export default function RoomMapPage() {
  const { rooms, isLoading, error, refetch } = useRoomMap();
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<RoomMapStatus | "all">(
    "all"
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  console.log(rooms);

  // Filter rooms
  const filteredRooms = useMemo(() => {
    let filtered = rooms;

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((room) => room.mapStatus === selectedStatus);
    }

    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (room) =>
          room.name.toLowerCase().includes(searchLower) ||
          (roomTypeLabels[room.room_type] || "")
            .toLowerCase()
            .includes(searchLower)
      );
    }

    return filtered;
  }, [rooms, selectedStatus, search]);

  // Group by floor
  const groupedRooms = useMemo(() => {
    return groupRoomsByFloor(filteredRooms);
  }, [filteredRooms]);

  // Count by status
  const statusCounts = useMemo(() => {
    const counts: Record<RoomMapStatus, number> = {
      vacant: 0,
      upcoming_checkin: 0,
      occupied: 0,
      upcoming_checkout: 0,
      overdue_checkout: 0,
    };

    rooms.forEach((room) => {
      counts[room.mapStatus]++;
    });

    return counts;
  }, [rooms]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Sơ đồ phòng</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi trạng thái các phòng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <IconLayoutGrid className="size-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <IconList className="size-4" />
          </Button>
        </div>
      </div>

      {/* Search và Filters */}
      <div className="px-4 lg:px-6 space-y-4">
        {/* Search và Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm khách hàng, mã đặt phòng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            title="Làm mới dữ liệu"
          >
            <IconRefresh
              className={cn("size-4", isLoading && "animate-spin")}
            />
          </Button>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map((filter) => {
            const count =
              filter.status === "all"
                ? rooms.length
                : statusCounts[filter.status as RoomMapStatus];

            return (
              <button
                key={filter.status}
                onClick={() =>
                  setSelectedStatus(
                    filter.status === "all" ? "all" : filter.status
                  )
                }
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  selectedStatus === filter.status
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                <span className={cn("size-2 rounded-full", filter.color)} />
                {filter.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Room Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-96 gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Không tìm thấy phòng nào</p>
        </div>
      ) : (
        <div className="px-4 lg:px-6 space-y-6">
          {groupedRooms.map(({ floor, rooms: floorRooms, label }) => (
            <div key={floor} className="space-y-2">
              <h2 className="text-lg font-semibold">
                {label} ({floorRooms.length})
              </h2>
              <div
                className={cn(
                  "grid gap-4",
                  viewMode === "grid"
                    ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    : "grid-cols-1"
                )}
              >
                {floorRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onStatusChange={refetch}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
