"use client";

import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { IconEdit } from "@tabler/icons-react";
import type { BookingRecord } from "@/lib/types";

interface NotesCardProps {
  booking: BookingRecord;
  onClick: () => void;
}

export function NotesCard({ booking, onClick }: NotesCardProps) {
  return (
    <Card
      className="p-2.5 sm:p-3 border cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
        <FileText className="size-3.5 sm:size-4 text-primary shrink-0" />
        <h3 className="font-semibold text-xs sm:text-sm">Ghi chú</h3>
      </div>
      <div className="flex items-start gap-1.5 sm:gap-2">
        <IconEdit className="size-3 sm:size-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[10px] sm:text-xs text-muted-foreground flex-1 break-words">
          {booking.notes || "Chưa có ghi chú"}
        </p>
      </div>
    </Card>
  );
}

