"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconSearch, IconRefresh, IconCalendar, IconInnerShadowTop, IconEye } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { formatDateOnly, formatCurrency } from "@/lib/functions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useUpcomingCheckins } from "@/hooks/use-upcoming-checkins";
import { useAvailableRooms } from "@/hooks/use-available-rooms";
import type { BookingRecord, BookingsResponse } from "@/lib/types";
import { bookingStatusLabels } from "@/lib/constants";
import Link from "next/link";
import { BookingDetailDialog } from "@/components/bookings/booking-detail-dialog";
import { AvailableRoomsDialog } from "@/components/reservation/available-rooms-dialog";

// Nhóm bookings theo ngày check-in
function groupBookingsByDate(bookings: BookingRecord[]) {
  const grouped = new Map<string, BookingRecord[]>();
  
  bookings.forEach((booking) => {
    const checkInDate = booking.check_in.split('T')[0]; // Get YYYY-MM-DD format
    if (!grouped.has(checkInDate)) {
      grouped.set(checkInDate, []);
    }
    grouped.get(checkInDate)!.push(booking);
  });

  // Sắp xếp theo ngày và tạo array với thông tin ngày
  const sortedDates = Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, bookings]) => {
      const dateObj = new Date(date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const isToday = dateObj.getTime() === today.getTime();
      const isTomorrow = dateObj.getTime() === today.getTime() + 24 * 60 * 60 * 1000;
      
      let label = formatDateOnly(date);
      if (isToday) {
        label = `Hôm nay (${formatDateOnly(date)})`;
      } else if (isTomorrow) {
        label = `Ngày mai (${formatDateOnly(date)})`;
      }

      return {
        date,
        dateObj,
        label,
        bookings: bookings.sort((a, b) => a.created_at.localeCompare(b.created_at)),
        isToday,
        isTomorrow,
      };
    });

  return sortedDates;
}

interface BookingCardProps {
  booking: BookingRecord;
  onCardClick: (booking: BookingRecord) => void;
}

function BookingCard({ booking, onCardClick }: BookingCardProps) {
  const customerName = booking.customers?.full_name || "Khách hàng";
  const phone = booking.customers?.phone;

  // Xử lý hiển thị phòng cho cả single room và multi-room booking
  const getRoomDisplay = () => {
    // Single room booking (có room_id)
    if (booking.rooms?.name) {
      return {
        displayName: booking.rooms.name,
        isMultiRoom: false,
        roomCount: 1
      };
    }

    // Multi-room booking (room_id = null, dùng booking_rooms)
    if (booking.booking_rooms && booking.booking_rooms.length > 0) {
      const roomNames = booking.booking_rooms
        .map(br => br.rooms.name)
        .filter(Boolean)
        .sort();
      
      if (roomNames.length === 1) {
        return {
          displayName: roomNames[0],
          isMultiRoom: false,
          roomCount: 1
        };
      } else if (roomNames.length > 1) {
        return {
          displayName: `${roomNames.length} phòng: ${roomNames.join(', ')}`,
          isMultiRoom: true,
          roomCount: roomNames.length
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

  return (
    <Card 
      className="p-3 hover:shadow-md transition-shadow cursor-pointer"
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
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isAvailableRoomsDialogOpen, setIsAvailableRoomsDialogOpen] = useState(false);

  const { bookings, isLoading, error, refetch } = useUpcomingCheckins({
    search,
    fallbackData: initialData,
  });

  const { availableRooms, isLoading: isAvailableRoomsLoading, refetch: refetchAvailableRooms } = useAvailableRooms();

  // Group bookings by date
  const groupedBookings = useMemo(() => {
    return groupBookingsByDate(bookings);
  }, [bookings]);

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
            Theo dõi các phòng sắp nhận trong 30 ngày tới ({bookings.length} booking)
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-96 gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      ) : groupedBookings.length === 0 ? (
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
            {groupedBookings.map(({ date, label, bookings: dateBookings, isToday, isTomorrow }) => (
              <div key={date} className="flex-shrink-0 w-80">
                {/* Column Header */}
                <div className={cn(
                  "sticky top-0 z-10 bg-background border-b pb-3 mb-4",
                  isToday && "bg-blue-50 dark:bg-blue-950/20",
                  isTomorrow && "bg-orange-50 dark:bg-orange-950/20"
                )}>
                  <div className="flex items-center justify-between">
                    <h3 className={cn(
                      "font-semibold",
                      isToday && "text-blue-700 dark:text-blue-300",
                      isTomorrow && "text-orange-700 dark:text-orange-300"
                    )}>
                      {label}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {dateBookings.length}
                    </Badge>
                  </div>
                </div>

                {/* Booking Cards */}
                <div className="space-y-3 min-h-[200px]">
                  {dateBookings.map((booking) => (
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