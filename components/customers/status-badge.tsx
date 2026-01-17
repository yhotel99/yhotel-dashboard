import { Badge } from "@/components/ui/badge";
import type { Customer } from "@/lib/types";

export function StatusBadge({
  customerType,
}: {
  customerType: Customer["customer_type"] | null | undefined;
}) {
  const typeConfig = {
    regular: {
      label: "Thường",
      variant: "outline" as const,
      className: "",
    },
    vip: {
      label: "VIP",
      variant: "default" as const,
      className: "bg-purple-500 hover:bg-purple-600 text-white border-0",
    },
    blacklist: {
      label: "Đen",
      variant: "destructive" as const,
      className: "",
    },
  };

  // Default to 'regular' if customerType is null, undefined, or invalid
  const safeCustomerType = customerType || "regular";
  const config = typeConfig[safeCustomerType] || typeConfig.regular;

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
