"use client";

import { useState } from "react";
import { IconNotes } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NotesCellProps {
  notes: string | null;
}

export function NotesCell({ notes }: NotesCellProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Không hiển thị gì nếu không có notes
  if (!notes || notes.trim() === "") {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setIsOpen(true)}
      >
        <IconNotes className="size-4 text-muted-foreground hover:text-foreground" />
        <span className="sr-only">Xem ghi chú</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ghi chú</DialogTitle>
            <DialogDescription>Thông tin ghi chú của booking</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm whitespace-pre-wrap break-words">{notes}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

