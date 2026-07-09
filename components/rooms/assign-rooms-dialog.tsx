"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/functions";
import type { CategoryRoomSummary } from "@/lib/room-web-display";

type AssignRoomsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryLabel: string;
  categoryCode: string;
  candidates: CategoryRoomSummary[];
  isSubmitting?: boolean;
  onConfirm: (roomIds: string[]) => void;
};

function getRoomLabel(room: CategoryRoomSummary): string {
  if (room.room_number) {
    return `P.${room.room_number} — ${room.name}`;
  }
  return room.name;
}

export function AssignRoomsDialog({
  open,
  onOpenChange,
  categoryLabel,
  categoryCode,
  candidates,
  isSubmitting = false,
  onConfirm,
}: AssignRoomsDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return candidates;
    return candidates.filter((room) =>
      getRoomLabel(room).toLowerCase().includes(query)
    );
  }, [candidates, search]);

  const toggleRoom = (roomId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, roomId] : prev.filter((id) => id !== roomId)
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearch("");
      setSelectedIds([]);
    }
    onOpenChange(nextOpen);
  };

  const handleProceed = () => {
    if (selectedIds.length === 0) return;
    onConfirm(selectedIds);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[min(85vh,640px)] w-[min(96vw,32rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle>Gán phòng vào hạng</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{categoryLabel}</span>
            <span className="ml-2 font-mono text-xs">({categoryCode})</span>
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-3 border-b px-6 py-4">
          <Input
            placeholder="Tìm số phòng, tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {selectedIds.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Đã chọn {selectedIds.length} phòng
            </p>
          ) : null}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div
            className="space-y-2 px-6 py-4"
            onWheel={(e) => e.stopPropagation()}
          >
            {filteredCandidates.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Không có phòng khả dụng để gán
              </p>
            ) : (
              filteredCandidates.map((room) => (
                <label
                  key={room.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/50"
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={selectedIds.includes(room.id)}
                    onCheckedChange={(checked) =>
                      toggleRoom(room.id, checked === true)
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{getRoomLabel(room)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatCurrency(room.price_per_night)}
                      {room.category_code
                        ? ` · đang ở ${room.category_code}`
                        : " · chưa gán hạng"}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="button"
            disabled={selectedIds.length === 0 || isSubmitting}
            onClick={handleProceed}
          >
            Tiếp tục ({selectedIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
