import { Badge } from "@/components/ui/badge";
import type { ComponentProps } from "react";
import type { Room } from "@/hooks/use-rooms";
import { ROOM_STATUS, roomStatusLabels } from "@/lib/constants";

// Status badge component
export function StatusBadge({ status }: { status: Room["status"] | string }) {
  const statusConfig: Record<
    Room["status"],
    {
      label: string;
      variant: ComponentProps<typeof Badge>["variant"];
      className?: string;
    }
  > = {
    [ROOM_STATUS.AVAILABLE]: {
      label: roomStatusLabels[ROOM_STATUS.AVAILABLE],
      variant: "default",
    },
    [ROOM_STATUS.MAINTENANCE]: {
      label: roomStatusLabels[ROOM_STATUS.MAINTENANCE],
      variant: "outline",
    },
    [ROOM_STATUS.NOT_CLEAN]: {
      label: roomStatusLabels[ROOM_STATUS.NOT_CLEAN],
      variant: "destructive",
    },
    [ROOM_STATUS.CLEAN]: {
      label: roomStatusLabels[ROOM_STATUS.CLEAN],
      variant: "outline",
      className:
        "border-emerald-500 text-emerald-600 dark:border-emerald-500/70 dark:text-emerald-300",
    },
  };

  // Default config for invalid/unknown status
  const defaultConfig = {
    label: "Không xác định",
    variant: "outline" as const,
    className:
      "border-muted-foreground/60 text-muted-foreground dark:border-muted-foreground/40",
  };

  const config = statusConfig[status as Room["status"]] || defaultConfig;

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

