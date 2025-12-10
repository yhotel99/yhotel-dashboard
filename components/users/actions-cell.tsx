"use client";

import { useState } from "react";
import { IconDotsVertical, IconEdit, IconKey } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profile } from "@/lib/types";
import { ChangePasswordDialog } from "./change-password-dialog";

interface UserActionsCellProps {
  userName: string;
  profile: Profile;
  onEdit: (profile: Profile) => void;
}

export function UserActionsCell({
  userName,
  profile,
  onEdit,
}: UserActionsCellProps) {
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);

  return (
    <>
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
          <DropdownMenuItem onClick={() => onEdit(profile)}>
            <IconEdit className="mr-2 size-4" />
            Chỉnh sửa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenPasswordDialog(true)}>
            <IconKey className="mr-2 size-4" />
            Đổi mật khẩu
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {openPasswordDialog && (
        <ChangePasswordDialog
          userId={profile.id}
          userName={userName}
          open={openPasswordDialog}
          onOpenChange={setOpenPasswordDialog}
        />
      )}
    </>
  );
}
