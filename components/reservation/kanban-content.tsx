"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useShallowSearchParams } from "@/hooks/use-shallow-search-params";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconSearch, IconRefresh, IconCalendar, IconInnerShadowTop, IconEye } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { formatDateOnly, formatCurrency } from "@/lib/functions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  buildUpcomingCheckinsSwrKey,
  useUpcomingCheckins,
} from "@/hooks/use-upcoming-checkins";
import { useAvailableRooms } from "@/hooks/use-available-rooms";
import { useBranch } from "@/contexts/branch-context";
import type { BookingRecord, BookingsResponse } from "@/lib/types";
import { bookingStatusLabels } from "@/lib/constants";
import Link from "next/link";
import { BookingDetailDialog } from "@/components/bookings/booking-detail-dialog";
import { AvailableRoomsDialog } from "@/components/reservation/available-rooms-dialog";

// Lấy tầng của booking (single room: rooms.floor_number; multi-room: tầng nhỏ nhất)
function getBookingFloor(booking: BookingRecord): number {
  if (booking.rooms?.floor_number != null) return booking.rooms.floor_number;
  if (booking.booking_rooms?.length) {
    const floors = booking.booking_rooms
      .map((br) => br.rooms?.floor_number)
      .filter((f): f is number => f != null);
    if (floors.length) return Math.min(...floors);
  }
  return 999;
}

// Nhóm bookings theo tầng — layout giống dashboard/reservation (Tầng 1, Tầng 2, ... + grid thẻ)
function groupBookingsByFloor(bookings: BookingRecord[]): Array<{ floor: number; label: string; bookings: BookingRecord[] }> {
  const byFloor = new Map<number, BookingRecord[]>();
  for (const b of bookings) {
    const f = getBookingFloor(b);
    if (!byFloor.has(f)) byFloor.set(f, []);
    byFloor.get(f)!.push(b);
  }
  return Array.from(byFloor.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([floor, list]) => ({
      floor,
      label: floor === 999 ? "Khác" : `Tầng ${floor}`,
      bookings: list.sort((a, b) => a.check_in.localeCompare(b.check_in) || a.created_at.localeCompare(b.created_at)),
    }));
}

// Nhóm theo ngày, trong mỗi ngày lại nhóm theo tầng — Kanban + Theo tầng kết hợp
function groupBookingsByDateWithFloors(bookings: BookingRecord[]): Array<{
  date: string;
  label: string;
  floorGroups: Array<{ floor: number; label: string; bookings: BookingRecord[] }>;
  isToday: boolean;
  isTomorrow: boolean;
  isYesterday: boolean;
  isTwoDaysAgo: boolean;
}> {
  const byDate = new Map<string, BookingRecord[]>();
  for (const b of bookings) {
    const date = b.check_in.split("T")[0];
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(b);
  }
  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, list]) => {
      const dateObj = new Date(date + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isToday = dateObj.getTime() === today.getTime();
      const isTomorrow = dateObj.getTime() === today.getTime() + 24 * 60 * 60 * 1000;
      const isYesterday = dateObj.getTime() === today.getTime() - 24 * 60 * 60 * 1000;
      const isTwoDaysAgo = dateObj.getTime() === today.getTime() - 2 * 24 * 60 * 60 * 1000;
      let label = formatDateOnly(date);
      if (isTwoDaysAgo) label = `Hôm kia (${formatDateOnly(date)})`;
      else if (isYesterday) label = `Hôm qua (${formatDateOnly(date)})`;
      else if (isToday) label = `Hôm nay (${formatDateOnly(date)})`;
      else if (isTomorrow) label = `Ngày mai (${formatDateOnly(date)})`;
      const floorGroups = groupBookingsByFloor(list);
      return { date, label, floorGroups, isToday, isTomorrow, isYesterday, isTwoDaysAgo };
    });
}

interface BookingCardProps {
  booking: BookingRecord;
  onCardClick: (booking: BookingRecord) => void;
}

function BookingCard({ booking, onCardClick }: BookingCardProps) {
  const customerName = booking.customers?.full_name || "Khách hàng";
  const phone = booking.customers?.phone;

  // Xử lý hiển thị số phòng cho cả single room và multi-room booking
  const getRoomDisplay = () => {
    // Single room booking (có room_id)
    if (booking.rooms?.room_number) {
      return {
        displayName: booking.rooms.room_number,
        isMultiRoom: false,
        roomCount: 1
      };
    }

    // Multi-room booking (room_id = null, dùng booking_rooms)
    if (booking.booking_rooms && booking.booking_rooms.length > 0) {
      const roomNumbers = booking.booking_rooms
        .map(br => br.rooms.room_number)
        .filter(Boolean)
        .sort();
      
      if (roomNumbers.length === 1) {
        return {
          displayName: roomNumbers[0] as string,
          isMultiRoom: false,
          roomCount: 1
        };
      } else if (roomNumbers.length > 1) {
        return {
          displayName: `${roomNumbers.length} phòng: ${roomNumbers.join(', ')}`,
          isMultiRoom: true,
          roomCount: roomNumbers.length
        };
      }
    }

    // Fallback
    return {
      displayName: "Chưa chọn phòng",
      isMultiRoom: false,
      roomCount: 0
    };
  };

  const roomInfo = getRoomDisplay();

  // Màu thẻ theo trạng thái (chỉ nền, không viền)
  const cardStatusStyles = {
    pending:
      "bg-amber-50/50 dark:bg-amber-950/25 hover:bg-amber-50/70 dark:hover:bg-amber-950/35",
    confirmed:
      "bg-emerald-50/50 dark:bg-emerald-950/25 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/35",
    checked_in:
      "bg-blue-50/50 dark:bg-blue-950/25 hover:bg-blue-50/70 dark:hover:bg-blue-950/35",
    checked_out:
      "bg-slate-50/50 dark:bg-slate-800/25 hover:bg-slate-50/70 dark:hover:bg-slate-800/35",
    cancelled:
      "bg-red-50/30 dark:bg-red-950/20 hover:bg-red-50/50 dark:hover:bg-red-950/30",
  };
  const statusKey = (booking.status || "pending") as keyof typeof cardStatusStyles;
  const statusStyle = cardStatusStyles[statusKey] ?? cardStatusStyles.pending;

  return (
    <Card 
      className={cn(
        "p-3 hover:shadow-md transition-all duration-200 cursor-pointer",
        statusStyle
      )}
      onClick={() => onCardClick(booking)}
    >
      <div className="space-y-2">
        {/* Header với mã booking và trạng thái */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">
            #{booking.booking_code}
          </span>
          <Badge 
            variant={booking.status === "confirmed" ? "default" : "secondary"}
            className="text-xs"
          >
            {bookingStatusLabels[booking.status as keyof typeof bookingStatusLabels]}
          </Badge>
        </div>

        {/* Tên khách hàng */}
        <div>
          <h4 className="font-medium text-sm">{customerName}</h4>
          {phone && (
            <p className="text-xs text-muted-foreground">{phone}</p>
          )}
        </div>

        {/* Thông tin phòng */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${roomInfo.roomCount === 0 ? 'text-amber-600' : ''}`}>
              {roomInfo.displayName}
            </span>
            {roomInfo.isMultiRoom && (
              <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                Nhiều phòng
              </Badge>
            )}
            {roomInfo.roomCount === 0 && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                Chưa chọn
              </Badge>
            )}
          </div>
        </div>

        {/* Thông tin booking */}
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Check-out:</span>
            <span>{formatDateOnly(booking.check_out)}</span>
          </div>
          <div className="flex justify-between">
            <span>Khách:</span>
            <span>{booking.total_guests} người</span>
          </div>
          <div className="flex justify-between">
            <span>Số đêm:</span>
            <span>{booking.number_of_nights} đêm</span>
          </div>
          <div className="flex justify-between font-medium text-foreground">
            <span>Tổng tiền:</span>
            <span>{formatCurrency(booking.final_amount ?? booking.total_amount)}</span>
          </div>
        </div>

        {/* Ghi chú nếu có */}
        {booking.notes && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            {booking.notes}
          </div>
        )}
      </div>
    </Card>
  );
}

interface KanbanContentProps {
  initialData: BookingsResponse;
}

export function KanbanContent({ initialData }: KanbanContentProps) {
  const { searchParams, pushSearchParams } = useShallowSearchParams();
  const initialSwrKeyRef = useRef<string | null>(null);
  const { filterBranchId } = useBranch();
  const search = useMemo(() => searchParams.get("search") || "", [searchParams]);
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  const updateSearch = useCallback(
    (newSearch: string) => {
      pushSearchParams((params) => {
        if (newSearch) {
          params.set("search", newSearch);
        } else {
          params.delete("search");
        }
      });
    },
    [pushSearchParams]
  );

  useEffect(() => {
    if (debouncedSearch !== search) {
      updateSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, updateSearch]);

  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isAvailableRoomsDialogOpen, setIsAvailableRoomsDialogOpen] = useState(false);

  if (initialSwrKeyRef.current === null) {
    initialSwrKeyRef.current = buildUpcomingCheckinsSwrKey({
      search,
      branchId: filterBranchId,
    });
  }

  const { bookings, isLoading, error, refetch } = useUpcomingCheckins({
    search,
    branchId: filterBranchId,
    fallbackData: initialData,
    initialSwrKey: initialSwrKeyRef.current,
  });

  const { availableRooms, isLoading: isAvailableRoomsLoading, refetch: refetchAvailableRooms } = useAvailableRooms(filterBranchId);

  // Kanban theo ngày + trong mỗi cột nhóm theo tầng
  const groupedByDateWithFloors = useMemo(
    () => groupBookingsByDateWithFloors(bookings),
    [bookings]
  );
  const hasData = groupedByDateWithFloors.length > 0;

  const handleCardClick = (booking: BookingRecord) => {
    setSelectedBooking(booking);
    setIsDetailDialogOpen(true);
  };

  const handleCloseDetailDialog = () => {
    setIsDetailDialogOpen(false);
    setSelectedBooking(null);
  };

  const handleRefresh = () => {
    refetch();
    refetchAvailableRooms();
  };

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
          <h1 className="text-2xl font-bold">Kanban - Phòng sắp nhận</h1>
          <p className="text-muted-foreground text-sm">
            Theo dõi các phòng (2 ngày trước đến 30 ngày tới) - {bookings.length} booking
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAvailableRoomsDialogOpen(true)}
            className="gap-2"
          >
            <IconEye className="size-4" />
            Xem phòng trống
          </Button>
          <Button
            variant="outline"
            asChild
            className="gap-2"
          >
            <Link href="/dashboard/reservation">
              <IconInnerShadowTop className="size-4" />
              Sơ đồ phòng
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading || isAvailableRoomsLoading}
            title="Làm mới dữ liệu"
          >
            <IconRefresh
              className={cn("size-4", (isLoading || isAvailableRoomsLoading) && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 lg:px-6">
        <div className="relative max-w-md">
          <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo mã booking, tên khách, phòng..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Kanban Board - Chỉ hiện full loading khi chưa có dữ liệu (lần đầu hoặc đổi search). Đang revalidate nền (mỗi 30s) vẫn giữ danh sách. */}
      {isLoading && bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center h-96 gap-3">
          <IconCalendar className="size-12 text-muted-foreground" />
          <div className="text-center">
            <p className="text-lg font-medium">Không có dữ liệu</p>
            <p className="text-muted-foreground">
              Không tìm thấy booking nào trong 30 ngày tới
            </p>
          </div>
        </div>
      ) : (
        <div className="px-4 lg:px-6">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {groupedByDateWithFloors.map(({ date, label, floorGroups, isToday, isTomorrow, isYesterday, isTwoDaysAgo }) => {
              const totalCards = floorGroups.reduce((s, g) => s + g.bookings.length, 0);
              return (
                <div key={date} className="flex-shrink-0 w-80">
                  <div className={cn(
                    "sticky top-0 z-10 bg-background border-b pb-3 mb-4",
                    isTwoDaysAgo && "bg-slate-50 dark:bg-slate-900/20",
                    isYesterday && "bg-slate-50 dark:bg-slate-900/20",
                    isToday && "bg-blue-50 dark:bg-blue-950/20",
                    isTomorrow && "bg-orange-50 dark:bg-orange-950/20"
                  )}>
                    <div className="flex items-center justify-between">
                      <h3 className={cn(
                        "font-semibold",
                        (isTwoDaysAgo || isYesterday) && "text-slate-600 dark:text-slate-400",
                        isToday && "text-blue-700 dark:text-blue-300",
                        isTomorrow && "text-orange-700 dark:text-orange-300"
                      )}>
                        {label}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {totalCards}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4 min-h-[200px]">
                    {floorGroups.map(({ floor, label: floorLabel, bookings: floorBookings }) => (
                      <div key={floor} className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground">
                          {floorLabel} ({floorBookings.length})
                        </h4>
                        <div className="space-y-2">
                          {floorBookings.map((booking) => (
                            <BookingCard
                              key={booking.id}
                              booking={booking}
                              onCardClick={handleCardClick}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Booking Detail Dialog */}
      <BookingDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={handleCloseDetailDialog}
        booking={selectedBooking}
      />

      {/* Available Rooms Dialog */}
      <AvailableRoomsDialog
        open={isAvailableRoomsDialogOpen}
        onOpenChange={setIsAvailableRoomsDialogOpen}
        availableRooms={availableRooms}
        isLoading={isAvailableRoomsLoading}
      />
    </div>
  );
}