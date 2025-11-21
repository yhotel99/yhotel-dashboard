"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconNotes, IconEdit } from "@tabler/icons-react";
import type { BookingRecord } from "@/lib/types";

interface NotesCardProps {
  booking: BookingRecord;
  onClick: () => void;
}

export function NotesCard({ booking, onClick }: NotesCardProps) {
  const hasNotes = booking.notes && booking.notes.trim().length > 0;

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <IconNotes className="size-4 text-muted-foreground" />
          <h3 className="text-sm sm:text-base font-semibold">Ghi chú</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className="h-7 text-xs"
        >
          <IconEdit className="size-3 mr-1" />
          {hasNotes ? "Sửa" : "Thêm"}
        </Button>
      </div>
      {hasNotes ? (
        <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">
          {booking.notes}
        </p>
      ) : (
        <p className="text-xs sm:text-sm text-muted-foreground italic">
          Chưa có ghi chú
        </p>
      )}
    </Card>
  );
}

