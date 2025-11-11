import { Badge } from "@/components/ui/badge";
import type { ComponentProps } from "react";
import type { Room } from "@/hooks/use-rooms";

// Status badge component
export function StatusBadge({ status }: { status: Room["status"] }) {
  const statusConfig: Record<
    Room["status"],
    {
      label: string;
      variant: ComponentProps<typeof Badge>["variant"];
      className?: string;
    }
  > = {
    available: { label: "Có sẵn", variant: "default" },
    maintenance: { label: "Bảo trì", variant: "outline" },
    occupied: { label: "Đang sử dụng", variant: "secondary" },
    not_clean: { label: "Chưa dọn", variant: "destructive" },
    clean: {
      label: "Đã dọn",
      variant: "outline",
      className:
        "border-emerald-500 text-emerald-600 dark:border-emerald-500/70 dark:text-emerald-300",
    },
    blocked: {
      label: "Đang chặn",
      variant: "outline",
      className:
        "border-muted-foreground/60 text-muted-foreground dark:border-muted-foreground/40",
    },
  };

  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

