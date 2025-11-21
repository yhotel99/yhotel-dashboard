"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAvailableRooms } from "@/services/rooms";
import type { Room } from "@/lib/types";
import { formatCurrency, formatDate, getDateISO } from "@/lib/utils";
import { roomTypeLabels } from "@/lib/constants";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CheckAvailableRoomsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckAvailableRoomsDialog({
  open,
  onOpenChange,
}: CheckAvailableRoomsDialogProps) {
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!checkInDate || !checkOutDate) {
      toast.error("Vui lòng nhập đầy đủ ngày check-in và check-out");
      return;
    }

    const checkInISO = getDateISO(checkInDate, false);
    const checkOutISO = getDateISO(checkOutDate, true);

    if (!checkInISO || !checkOutISO) {
      toast.error("Ngày không hợp lệ");
      return;
    }

    if (new Date(checkOutISO) <= new Date(checkInISO)) {
      toast.error("Ngày check-out phải sau ngày check-in");
      return;
    }

    try {
      setIsLoading(true);
      setHasSearched(true);
      const rooms = await getAvailableRooms(checkInISO, checkOutISO);
      setAvailableRooms(rooms);
      if (rooms.length === 0) {
        toast.info("Không có phòng trống trong khoảng thời gian này");
      } else {
        toast.success(`Tìm thấy ${rooms.length} phòng trống`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể tìm phòng trống";
      toast.error(errorMessage);
      setAvailableRooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setCheckInDate("");
      setCheckOutDate("");
      setAvailableRooms([]);
      setHasSearched(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl sm:max-w-6xl max-h-[60vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Kiểm tra phòng trống</DialogTitle>
          <DialogDescription>
            Nhập ngày check-in và check-out để xem danh sách phòng có thể đặt
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 flex flex-col min-h-0">
          {/* Date inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_in_date">Ngày check-in *</Label>
              <Input
                id="check_in_date"
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check_out_date">Ngày check-out *</Label>
              <Input
                id="check_out_date"
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Search button */}
          <Button
            onClick={handleSearch}
            disabled={isLoading || !checkInDate || !checkOutDate}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Đang tìm kiếm...
              </>
            ) : (
              "Tìm kiếm"
            )}
          </Button>

          {/* Results */}
          {hasSearched && (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="flex items-center justify-between shrink-0">
                <h3 className="text-lg font-semibold">
                  Kết quả tìm kiếm ({availableRooms.length} phòng)
                </h3>
                {checkInDate && checkOutDate && (
                  <p className="text-sm text-muted-foreground">
                    {formatDate(checkInDate)} - {formatDate(checkOutDate)}
                  </p>
                )}
              </div>

              {availableRooms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground shrink-0">
                  Không có phòng trống trong khoảng thời gian này
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="space-y-2 pr-2">
                    {[...availableRooms].map((room) => (
                      <Card key={room.id} className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                            <div>
                              <h4 className="font-semibold">{room.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {roomTypeLabels[room.room_type] ||
                                  room.room_type}
                              </p>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">
                                Giá:
                              </span>{" "}
                              <span className="font-semibold">
                                {formatCurrency(room.price_per_night)}/đêm
                              </span>
                            </div>
                            <div className="flex justify-end">
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200"
                              >
                                Trống
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
