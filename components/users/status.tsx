import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/lib/types";

// Role badge component
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

// Status badge component
export function StatusBadge({ status }: { status: Profile["status"] }) {
  const statusConfig = {
    active: { label: "Hoạt động", variant: "default" as const },
    inactive: { label: "Không hoạt động", variant: "secondary" as const },
    suspended: { label: "Đã khóa", variant: "outline" as const },
  };

  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

