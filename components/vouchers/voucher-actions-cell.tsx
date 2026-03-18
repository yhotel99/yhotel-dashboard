"use client";

import { useState } from "react";
import type { Voucher } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDotsVertical, IconEdit, IconTrash } from "@tabler/icons-react";

export function VoucherActionsCell({
  voucher,
  onEdit,
  onDelete,
}: {
  voucher: Voucher;
  onEdit: (voucher: Voucher) => void;
  onDelete: (voucher: Voucher) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <IconDotsVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            setOpen(false);
            onEdit(voucher);
          }}
        >
          <IconEdit className="mr-2 size-4" />
          Sửa
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={() => {
            setOpen(false);
            onDelete(voucher);
          }}
        >
          <IconTrash className="mr-2 size-4" />
          Xóa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

