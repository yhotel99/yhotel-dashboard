"use client";

import { IconDotsVertical } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Customer } from "@/lib/types";

export function ActionsCell({
  customer,
  onEdit,
  onViewDetail,
  onViewBookings,
}: {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onViewDetail?: (customer: Customer) => void;
  onViewBookings?: (customer: Customer) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
          size="icon"
        >
          <IconDotsVertical />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {onViewDetail && (
          <DropdownMenuItem onClick={() => onViewDetail(customer)}>
            Xem chi tiết
          </DropdownMenuItem>
        )}
        {onViewBookings && (
          <DropdownMenuItem onClick={() => onViewBookings(customer)}>
            Xem đặt phòng
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onEdit(customer)}>
          Chỉnh sửa
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          Khóa khách hàng
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
