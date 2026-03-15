"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateOnly, formatCurrency } from "@/lib/functions";
import { roomTypeLabels } from "@/lib/constants";
import { IconHome, IconCalendar, IconCurrencyDong } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AvailableRoomData } from "@/hooks/use-available-rooms";

const CARD_TINT_CLASSES = [
  "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/50",
  "bg-sky-50/80 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/50",
  "bg-violet-50/80 dark:bg-violet-950/30 border-violet-200/60 dark:border-violet-800/50",
] as const;

interface AvailableRoomsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableRooms: AvailableRoomData[];
  isLoading: boolean;
}

export function AvailableRoomsDialog({
  open,
  onOpenChange,
  availableRooms,
  isLoading,
}: AvailableRoomsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-none sm:max-w-6xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconHome className="size-5" />
            Phòng trống trong 30 ngày tới
            <Badge variant="secondary" className="ml-2">
              {isLoading ? "..." : availableRooms.length} phòng
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Danh sách các phòng có sẵn với khoảng thời gian trống chi tiết
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-primary" />
              <span className="ml-2">Đang tải dữ liệu...</span>
            </div>
          ) : availableRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IconHome className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Không có phòng trống</h3>
              <p className="text-muted-foreground">
                Tất cả phòng đều đã được đặt trong 30 ngày tới
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {availableRooms.map((roomData, index) => {
                const { room, availablePeriods } = roomData;
                const totalDays = availablePeriods.reduce((sum, period) => sum + period.days, 0);
                const tintClass = CARD_TINT_CLASSES[index % CARD_TINT_CLASSES.length];

                return (
                  <Card key={room.id} className={cn("p-3 border", tintClass)}>
                    <div className="space-y-2">
                      {/* Room Header - compact */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">
                            {room.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            <span>{roomTypeLabels[room.room_type] || room.room_type}</span>
                            {room.room_number && <span>P.{room.room_number}</span>}
                            {room.floor_number && <span>T{room.floor_number}</span>}
                            <span>{room.max_guests} khách</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-0.5">
                            <IconCurrencyDong className="size-3.5 text-muted-foreground" />
                            <span className="font-semibold text-sm">
                              {formatCurrency(room.price_per_night)}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">/ đêm</p>
                        </div>
                      </div>

                      {/* Summary + periods inline */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <IconCalendar className="size-3.5 shrink-0" />
                        <span>
                          <strong className="text-foreground">{totalDays}</strong> ngày trống
                          {availablePeriods.length > 0 && (
                            <> · {availablePeriods.length} khoảng</>
                          )}
                        </span>
                      </div>

                      {/* Periods - compact chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {availablePeriods.map((period, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-[10px] font-medium text-green-800 dark:bg-green-900/40 dark:text-green-200 dark:border dark:border-green-800"
                          >
                            {formatDateOnly(period.from)}→{formatDateOnly(period.to)} ({period.days}d)
                          </span>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}