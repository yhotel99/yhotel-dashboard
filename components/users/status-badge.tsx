import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/lib/types";

export function StatusBadge({ status }: { status: Profile["status"] }) {
  const statusConfig = {
    active: { label: "Hoạt động", variant: "default" as const },
    inactive: { label: "Không hoạt động", variant: "secondary" as const },
    suspended: { label: "Đã khóa", variant: "outline" as const },
  };

  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

