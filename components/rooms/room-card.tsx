"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { RoomWithBooking, Room } from "@/lib/types";
import {
  roomTypeLabels,
  ROOM_MAP_STATUS,
  roomStatusLabels,
  roomMapStatusCardColors,
} from "@/lib/constants";
import { IconDotsVertical, IconSparkles, IconSun } from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrushCleaning } from "lucide-react";
import { UpdateRoomStatusDialog } from "@/components/rooms/update-room-status-dialog";
import { QuickBookingDialog } from "@/components/rooms/quick-booking-dialog";
import { CheckoutDialog } from "@/components/rooms/checkout-dialog";
import { toast } from "sonner";
import { useRooms } from "@/hooks/use-rooms";
import { useBookings } from "@/hooks/use-bookings";
import { StatusBadge as BookingStatusBadge } from "@/components/bookings/status";
import type { BookingStatus } from "@/lib/types";
import { translateBookingError } from "@/lib/functions";

// Kiểm tra booking có đang active không (trong khoảng check-in và check-out)
function isBookingActive(booking: RoomWithBooking["currentBooking"]): boolean {
  if (!booking) return false;

  const now = new Date();
  const checkIn = new Date(booking.check_in);
  const checkOut = new Date(booking.check_out);

  // Booking active nếu đã check-in và chưa check-out
  return checkIn <= now && now <= checkOut;
}

// Tính thời gian đã ở / thời gian đã đặt
function calculateStayDuration(booking: RoomWithBooking["currentBooking"]) {
  if (!booking) return null;

  const now = new Date();
  const checkIn = new Date(booking.check_in);
  const checkOut = new Date(booking.check_out);

  // Chỉ tính nếu booking đang active
  if (!isBookingActive(booking)) return null;

  const totalMs = now.getTime() - checkIn.getTime();
  const bookedMs = checkOut.getTime() - checkIn.getTime();

  const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
  const totalMinutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const bookedHours = Math.floor(bookedMs / (1000 * 60 * 60));

  const totalDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  if (totalDays > 0) {
    return `${totalDays} ngày ${remainingHours} giờ / ${Math.ceil(
      bookedMs / (1000 * 60 * 60 * 24)
    )} ngày`;
  }

  return `${totalHours} giờ ${totalMinutes} phút / ${bookedHours} giờ`;
}

interface RoomCardProps {
  room: RoomWithBooking;
  onStatusChange?: () => void;
}

export function RoomCard({ room, onStatusChange }: RoomCardProps) {
  const stayDuration = calculateStayDuration(room.currentBooking);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { updateRoomStatus } = useRooms();
  const { createBooking } = useBookings();

  const handleConfirmStatusChange = async (
    roomId: string,
    status: Room["status"]
  ) => {
    try {
      await updateRoomStatus(roomId, status);

      toast.success("Cập nhật trạng thái thành công", {
        description: `Phòng ${room.name} đã được chuyển thành ${
          roomStatusLabels[status as keyof typeof roomStatusLabels] || status
        }.`,
      });
      setIsDialogOpen(false);
      onStatusChange?.();
    } catch (error) {
      toast.error("Cập nhật trạng thái thất bại", {
        description:
          error instanceof Error
            ? error.message
            : "Không thể cập nhật trạng thái phòng",
      });
      throw error;
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Không mở dialog nếu click vào dropdown menu, button, hoặc phần header
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("[role='menuitem']") ||
      target.closest("[role='menu']") ||
      target.closest("[data-radix-popper-content-wrapper]") ||
      target.closest("[data-radix-portal]")
    ) {
      return;
    }

    // Mở dialog phù hợp dựa trên trạng thái phòng
    if (room.mapStatus === ROOM_MAP_STATUS.VACANT) {
      setIsQuickBookingOpen(true);
    } else if (
      room.mapStatus === ROOM_MAP_STATUS.OCCUPIED ||
      room.mapStatus === ROOM_MAP_STATUS.UPCOMING_CHECKOUT ||
      room.mapStatus === ROOM_MAP_STATUS.OVERDUE_CHECKOUT
    ) {
      setIsCheckoutOpen(true);
    }
  };

  const handleCreateBooking = async (
    input: Parameters<typeof createBooking>[0]
  ) => {
    try {
      await createBooking(input);
      toast.success("Đặt phòng thành công", {
        description: `Phòng ${room.name} đã được đặt thành công.`,
      });
      setIsQuickBookingOpen(false);
      onStatusChange?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể tạo booking";

      // Translate error messages
      const translatedMessage = translateBookingError(errorMessage);

      toast.error("Đặt phòng thất bại", {
        description: translatedMessage,
      });
      throw error;
    }
  };

  const handleCheckout = () => {
    onStatusChange?.();
  };

  return (
    <>
      <Card
        onClick={handleCardClick}
        className={cn(
          "relative p-4 cursor-pointer hover:shadow-lg transition-all duration-200 grid grid-rows-[auto_auto_auto_1fr_auto] gap-3",
          roomMapStatusCardColors[room.mapStatus]
        )}
      >
        {/* Header với badge "Sạch" và menu */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="grid grid-cols-[1fr_auto] items-start gap-2"
        >
          <Badge
            variant="secondary"
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium gap-1.5 w-fit",
              room.isClean
                ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            {room.isClean ? (
              <IconSparkles className="size-3" />
            ) : (
              <BrushCleaning className="size-3" />
            )}
            {room.isClean ? "Sạch" : "Chưa dọn"}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <IconDotsVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {room.isClean ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDialogOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <BrushCleaning className="size-4 mr-2" />
                  Chưa dọn
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDialogOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <IconSparkles className="size-4 mr-2" />
                  Làm sạch
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Room number - lớn và đậm */}
        <div className="grid">
          <h3 className="text-2xl font-bold tracking-tight">{room.name}</h3>
        </div>

        {/* Room type */}
        <div className="grid">
          <p className="text-sm text-muted-foreground">
            {roomTypeLabels[room.room_type] || room.room_type}
          </p>
        </div>

        {/* Giá với icon */}
        <div className="gap-2">
          {/* Giá theo đêm */}
          <div className="grid grid-cols-[auto_1fr] items-center gap-2 text-sm">
            <IconSun className="size-4 text-muted-foreground" />
            <span className="font-medium">
              {formatCurrency(room.price_per_night)}
            </span>
          </div>
        </div>

        {/* Thông tin booking cho các trạng thái: sắp nhận, đang sử dụng, sắp trả, quá giờ trả */}
        {room.currentBooking &&
          (room.mapStatus === ROOM_MAP_STATUS.UPCOMING_CHECKIN ||
            room.mapStatus === ROOM_MAP_STATUS.OCCUPIED ||
            room.mapStatus === ROOM_MAP_STATUS.UPCOMING_CHECKOUT ||
            room.mapStatus === ROOM_MAP_STATUS.OVERDUE_CHECKOUT) && (
            <div className="grid gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
              {/* Hiển thị check-in và check-out */}
              <div className="grid gap-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Check-in:</span>
                  <span className="font-medium">
                    {formatDate(room.currentBooking.check_in)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Check-out:</span>
                  <span className="font-medium">
                    {formatDate(room.currentBooking.check_out)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Booking Status:</span>
                  <BookingStatusBadge
                    status={room.currentBooking.status as BookingStatus}
                  />
                </div>
              </div>

              {/* Hiển thị thời gian đã ở (chỉ khi đang sử dụng) */}
              {stayDuration && (
                <Badge variant="outline" className="text-xs font-normal w-fit">
                  {stayDuration}
                </Badge>
              )}
            </div>
          )}
      </Card>

      <UpdateRoomStatusDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        room={room}
        onConfirm={handleConfirmStatusChange}
      />
      {/* Quick Booking Dialog */}
      {room.mapStatus === ROOM_MAP_STATUS.VACANT && (
        <QuickBookingDialog
          open={isQuickBookingOpen}
          onOpenChange={setIsQuickBookingOpen}
          room={room}
          onCreate={handleCreateBooking}
        />
      )}

      {/* Checkout Dialog */}
      {(room.mapStatus === ROOM_MAP_STATUS.OCCUPIED ||
        room.mapStatus === ROOM_MAP_STATUS.UPCOMING_CHECKOUT ||
        room.mapStatus === ROOM_MAP_STATUS.OVERDUE_CHECKOUT) && (
        <CheckoutDialog
          open={isCheckoutOpen}
          onOpenChange={setIsCheckoutOpen}
          room={room}
          onCheckout={handleCheckout}
        />
      )}
    </>
  );
}
