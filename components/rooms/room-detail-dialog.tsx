"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Room } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  roomTypeLabels,
  roomStatusLabels,
  roomCategoryCodeLabels,
  AMENITIES_OPTIONS,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/functions";
import { IconHome, IconTag } from "@tabler/icons-react";
import Image from "next/image";

interface RoomDetailDialogProps {
  room: Room;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoomDetailDialog({
  room,
  open,
  onOpenChange,
}: RoomDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl!">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconHome className="size-5" />
            Chi tiết phòng
          </DialogTitle>
          <DialogDescription>
            Thông tin chi tiết về phòng{" "}
            <span className="font-semibold">{room.name}</span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] scrollbar-hide pb-2">
          <div className="space-y-6">
            {/* Room Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Tên phòng
                </p>
                <p className="text-sm font-semibold">{room.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Loại phòng
                </p>
                <p className="text-sm">
                  {roomTypeLabels[room.room_type] || "Chưa phân loại"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Phân loại
                </p>
                <p className="text-sm">
                  {room.category_code
                    ? roomCategoryCodeLabels[
                        room.category_code as keyof typeof roomCategoryCodeLabels
                      ] || room.category_code
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Số phòng
                </p>
                <p className="text-sm">{room.room_number || "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Số tầng
                </p>
                <p className="text-sm">
                  {room.floor_number !== null && room.floor_number !== undefined
                    ? `Tầng ${room.floor_number}`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Sức chứa
                </p>
                <p className="text-sm">{room.max_guests} người</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Giá mỗi đêm
                </p>
                <p className="text-sm font-semibold text-green-600">
                  {formatCurrency(room.price_per_night)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Trạng thái
                </p>
                <div className="text-sm mt-1">
                  <Badge variant="outline">
                    {roomStatusLabels[room.status]}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Amenities */}
            {room.amenities && room.amenities.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                  <IconTag className="size-4" />
                  Tiện nghi
                </p>
                <div className="flex flex-wrap gap-2">
                  {room.amenities.map((amenity, index) => {
                    const option = AMENITIES_OPTIONS.find(
                      (opt) => opt.value === amenity
                    );
                    const Icon = option?.icon;
                    return (
                      <Badge key={index} variant="outline" className="text-xs flex items-center gap-1">
                        {Icon && <Icon className="size-3" />}
                        {option?.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Thumbnail */}
            {room.thumbnail && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Hình ảnh
                </p>
                <div className="aspect-video bg-muted rounded-md overflow-hidden">
                  <Image
                    src={
                      typeof room.thumbnail === "string"
                        ? room.thumbnail
                        : room.thumbnail.url
                    }
                    alt={`Room ${room.name}`}
                    width={800}
                    height={400}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* System Info */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <p>ID: {room.id}</p>
                </div>
                <div>
                  <p>
                    Ngày tạo:{" "}
                    {new Date(room.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
