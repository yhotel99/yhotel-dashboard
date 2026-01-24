"use client";

import {
  IconMail,
  IconPhone,
  IconUser,
  IconShield,
  IconCalendar,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Profile } from "@/lib/types";
import { formatDateOnly, generateGradient, getInitials } from "@/lib/functions";
import { RoleBadge } from "./role-badge";
import { StatusBadge } from "./status-badge";
import { USER_ROLE } from "@/lib/constants";

interface AccountDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
}

export function AccountDetailDialog({
  open,
  onOpenChange,
  profile,
}: AccountDetailDialogProps) {
  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconUser className="size-5" />
            Thông tin tài khoản
          </DialogTitle>
          <DialogDescription>
            Thông tin chi tiết về tài khoản của bạn
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6">
            {/* Avatar and Basic Info */}
            <div className="flex items-center gap-4 pb-4 border-b">
              <Avatar className="h-20 w-20 rounded-lg">
                <AvatarFallback
                  className="rounded-lg text-white font-semibold text-xl"
                  style={{
                    backgroundImage: generateGradient(profile.id),
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">
                  {profile.full_name || "Người dùng"}
                </h3>
                <p className="text-muted-foreground">{profile.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <RoleBadge variant="outline" role={profile.role} />
                  <StatusBadge status={profile.status} />
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Thông tin cơ bản</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <IconUser className="size-4" />
                    Họ và tên
                  </label>
                  <p className="text-base font-medium">
                    {profile.full_name || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <IconMail className="size-4" />
                    Email
                  </label>
                  <p className="text-base">{profile.email || "-"}</p>
                </div>

                {profile.phone && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <IconPhone className="size-4" />
                      Số điện thoại
                    </label>
                    <p className="text-base">{profile.phone}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <IconShield className="size-4" />
                    Vai trò
                  </label>
                  <div>
                    <RoleBadge role={profile.role} />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* System Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Thông tin hệ thống</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <IconCalendar className="size-4" />
                    Ngày tạo tài khoản
                  </label>
                  <p className="text-base">
                    {formatDateOnly(profile.created_at)}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <IconCalendar className="size-4" />
                    Cập nhật lần cuối
                  </label>
                  <p className="text-base">
                    {formatDateOnly(profile.updated_at)}
                  </p>
                </div>

                {profile.role === USER_ROLE.ADMIN && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      User ID
                    </label>
                    <p className="text-base font-mono break-all">
                      {profile.id}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
