"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export type CategoryRoomConfirmAction =
  | {
      type: "assign";
      roomLabels: string[];
      categoryLabel: string;
      categoryCode: string;
    }
  | {
      type: "unassign";
      roomLabel: string;
      categoryLabel: string;
      categoryCode: string;
    };

type CategoryRoomConfirmDialogProps = {
  action: CategoryRoomConfirmAction | null;
  open: boolean;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function CategoryRoomConfirmDialog({
  action,
  open,
  isSubmitting = false,
  onOpenChange,
  onConfirm,
}: CategoryRoomConfirmDialogProps) {
  if (!action) return null;

  const isAssign = action.type === "assign";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isAssign ? "Xác nhận gán phòng" : "Xác nhận bỏ gán hạng"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              {isAssign ? (
                <>
                  <p>
                    Gán{" "}
                    <strong className="text-foreground">
                      {action.roomLabels.length} phòng
                    </strong>{" "}
                    vào hạng{" "}
                    <strong className="text-foreground">
                      {action.categoryLabel}
                    </strong>{" "}
                    <span className="font-mono text-xs">
                      ({action.categoryCode})
                    </span>
                    ?
                  </p>
                  <ScrollArea className="max-h-40 rounded-md border">
                    <ul className="space-y-1 p-3 text-xs">
                      {action.roomLabels.map((label) => (
                        <li key={label} className="text-foreground">
                          · {label}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                  <p>
                    Các phòng này sẽ được gom chung trên website theo hạng đã
                    chọn.
                  </p>
                </>
              ) : (
                <p>
                  Bỏ gán <strong className="text-foreground">{action.roomLabel}</strong>{" "}
                  khỏi hạng{" "}
                  <strong className="text-foreground">{action.categoryLabel}</strong>?
                  <br />
                  <br />
                  Phòng sẽ không còn hiển thị trên website cho đến khi được gán
                  lại hạng khác.
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant={isAssign ? "default" : "destructive"}
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting
              ? "Đang xử lý..."
              : isAssign
                ? "Xác nhận gán"
                : "Xác nhận bỏ gán"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
