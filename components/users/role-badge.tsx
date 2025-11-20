import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/lib/types";

export function RoleBadge({ role }: { role: Profile["role"] }) {
  const roleConfig = {
    admin: {
      label: "Quản trị viên",
      variant: "default" as const,
      className: "",
    },
    manager: {
      label: "Quản lý",
      variant: "default" as const,
      className: "bg-blue-500 hover:bg-blue-600 text-white border-0",
    },
    staff: {
      label: "Nhân viên",
      variant: "default" as const,
      className: "bg-green-500 hover:bg-green-600 text-white border-0",
    },
  };

  const config = roleConfig[role];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

