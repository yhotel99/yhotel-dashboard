"use client";

import { useState } from "react";
import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconQrcode,
  IconUserCircle,
} from "@tabler/icons-react";
import { logoutAction } from "@/actions/auth";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { generateGradient, getInitials } from "@/lib/functions";
import { useRouter } from "next/navigation";
import { DASHBOARD_URLS } from "@/lib/constants";
import { AccountDetailDialog } from "@/components/users/account-detail-dialog";
import { usePermissions } from "@/contexts/permissions-context";
import type { Profile } from "@/lib/types";
import { useBranch } from "@/contexts/branch-context";
import { getCurrentUserBranchLabel } from "@/lib/branch";

export function NavUser({ profile }: { profile: Profile }) {
  const { isMobile } = useSidebar();
  const { branches, canSelectBranch, selectedBranchId } = useBranch();
  const branchLabel = getCurrentUserBranchLabel({
    profile,
    branches,
    canSelectBranch,
    selectedBranchId,
  });
  const router = useRouter();
  const { hasViewPermission } = usePermissions();
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  const handleLogout = async () => {
    await logoutAction();
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarFallback
                  className="rounded-full text-white font-semibold"
                  style={{
                    backgroundImage: generateGradient(profile.id),
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {profile.full_name}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {profile.email}
                </span>
                {branchLabel ? (
                  <span className="text-muted-foreground truncate text-xs">
                    {branchLabel}
                  </span>
                ) : null}
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback
                    className="rounded-full text-white font-semibold"
                    style={{
                      backgroundImage: generateGradient(profile.id),
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {profile.full_name}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {profile.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setAccountDialogOpen(true)}>
                <IconUserCircle />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(DASHBOARD_URLS.PAYMENT_QR)}
              >
                <IconQrcode />
                Tạo mã QR thanh toán
              </DropdownMenuItem>
              {hasViewPermission("settings") && (
                <DropdownMenuItem
                  onClick={() => router.push(DASHBOARD_URLS.SETTINGS)}
                >
                  <IconCreditCard />
                  Settings
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <IconLogout />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      {accountDialogOpen && (
        <AccountDetailDialog
          open={accountDialogOpen}
          onOpenChange={setAccountDialogOpen}
          profile={profile}
        />
      )}
    </SidebarMenu>
  );
}
