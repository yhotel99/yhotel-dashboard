"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useReservation } from "@/hooks/use-reservation";
import { useUpcomingCheckins } from "@/hooks/use-upcoming-checkins";
import { RoomCard } from "@/components/rooms/room-card";
import {
  IconSearch,
  IconLayoutGrid,
  IconList,
  IconRefresh,
  IconClock24,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import {
  roomTypeLabels,
  type RoomMapStatus,
  ROOM_MAP_STATUS,
  roomMapStatusLabels,
  roomMapStatusColors,
} from "@/lib/constants";
import type { RoomWithBooking } from "@/lib/types";

const statusFilters: Array<{
  status: RoomMapStatus | "all";
  label: string;
  color: string;
  title?: string;
  count?: number;
}> = [
  { status: "all", label: "Tất cả", color: "bg-gray-200" },
  // {
  //   status: ROOM_MAP_STATUS.VACANT,
  //   label: roomMapStatusLabels[ROOM_MAP_STATUS.VACANT],
  //   color: roomMapStatusColors[ROOM_MAP_STATUS.VACANT],
  // },
  {
    status: ROOM_MAP_STATUS.UPCOMING_CHECKIN,
    label: roomMapStatusLabels[ROOM_MAP_STATUS.UPCOMING_CHECKIN],
    color: roomMapStatusColors[ROOM_MAP_STATUS.UPCOMING_CHECKIN],
    title: "Phòng có khách sắp check-in: trong 2 tiếng tới hoặc các ngày khác",
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

// Nhóm phòng theo tầng dựa vào floor_number
function groupRoomsByFloor(rooms: RoomWithBooking[]) {
  const grouped = new Map<number, RoomWithBooking[]>();
  rooms.forEach((room) => {
    // Sử dụng floor_number từ database, nếu không có thì đặt vào tầng 0
    const floor = room.floor_number ?? 0;
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
    label: floor === 0 ? "Chưa xác định tầng" : `Tầng ${floor}`,
  }));
}

type UpcomingBooking = {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  rooms?: { id: string } | null;
  booking_rooms?: Array<{ rooms: { id: string } }> | null;
};

// Map roomId -> currentBooking từ danh sách sắp check-in (để thẻ hiển thị check-in/check-out/status)
function getRoomIdToUpcomingBooking(
  bookings: UpcomingBooking[]
): Map<string, { id: string; check_in: string; check_out: string; status: string }> {
  const map = new Map<string, { id: string; check_in: string; check_out: string; status: string }>();
  for (const b of bookings) {
    const info = { id: b.id, check_in: b.check_in, check_out: b.check_out, status: b.status };
    if (b.rooms?.id) map.set(b.rooms.id, info);
    if (b.booking_rooms) for (const br of b.booking_rooms) if (br.rooms?.id) map.set(br.rooms.id, info);
  }
  return map;
}

export default function ReservationPage() {
  const { rooms, isLoading, error, refetch } = useReservation();
  const { bookings: upcomingBookings } = useUpcomingCheckins({ search: "" });
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<RoomMapStatus | "all">(
    "all"
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Gộp "Sắp nhận" từ dữ liệu bookings: phòng vacant có booking sắp check-in → upcoming_checkin + currentBooking để thẻ hiện check-in/check-out/status
  const roomsWithUpcoming = useMemo(() => {
    const roomIdToBooking = getRoomIdToUpcomingBooking(upcomingBookings);
    if (roomIdToBooking.size === 0) return rooms;
    return rooms.map((room) => {
      if (room.mapStatus !== "vacant") return room;
      const booking = roomIdToBooking.get(room.id);
      if (!booking) return room;
      return {
        ...room,
        mapStatus: "upcoming_checkin" as const,
        currentBooking: {
          id: booking.id,
          check_in: booking.check_in,
          check_out: booking.check_out,
          status: booking.status,
        },
      };
    });
  }, [rooms, upcomingBookings]);

  // Filter rooms
  const filteredRooms = useMemo(() => {
    let filtered = roomsWithUpcoming;

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
  }, [roomsWithUpcoming, selectedStatus, search]);

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

    roomsWithUpcoming.forEach((room) => {
      counts[room.mapStatus]++;
    });

    return counts;
  }, [roomsWithUpcoming]);

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
          <h1 className="text-2xl font-bold">Đặt phòng</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi trạng thái các phòng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            asChild
            className="gap-2"
          >
            <Link href="/dashboard/reservation/kanban">
              <IconClock24 className="size-4" />
              Kanban
            </Link>
          </Button>
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
              placeholder="Tìm kiếm phòng..."
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
                title={filter.title}
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
        {selectedStatus === ROOM_MAP_STATUS.UPCOMING_CHECKIN && (
          <p className="text-xs text-muted-foreground">
            Đang hiển thị các phòng sắp nhận — <strong>trong 2 tiếng</strong> tới hoặc <strong>các ngày khác</strong> (theo lịch check-in).
          </p>
        )}
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
