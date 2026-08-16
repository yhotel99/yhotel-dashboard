"use client";

import * as React from "react";
import { FileSpreadsheet } from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/contexts/permissions-context";
import {
  allNavItems,
  DASHBOARD_URLS,
  SIDEBAR_URLS,
} from "@/lib/constants";
import { canViewAllBranches } from "@/lib/branch";
import Image from "next/image";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { currentUser, profile } = useAuth();
  const { hasViewPermission } = usePermissions();

  // Filter nav items based on permissions
  const filteredNavItems = React.useMemo(() => {
    if (!currentUser || !profile) return [];

    return allNavItems.filter((item) =>
      hasViewPermission(item.resource)
    );
  }, [currentUser, profile, hasViewPermission]);

  const navItems = React.useMemo(() => {
    const items = filteredNavItems.map(({ title, url, icon }) => ({
      title,
      url,
      icon,
    }));
    if (profile && canViewAllBranches(profile.role)) {
      items.push({
        title: "Đối soát Excel",
        url: DASHBOARD_URLS.INVOICE_RECONCILE,
        icon: FileSpreadsheet,
      });
    }
    return items;
  }, [filteredNavItems, profile]);

  // Get first allowed page for logo link (fallback to first item or dashboard)
  const logoLink = React.useMemo(() => {
    if (!profile) {
      return SIDEBAR_URLS.DASHBOARD;
    }
    const firstAllowedItem = filteredNavItems[0];
    return firstAllowedItem?.url || SIDEBAR_URLS.DASHBOARD;
  }, [filteredNavItems, profile]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href={logoLink}>
                <Image src="/favicon.ico" alt="YHotel" width={24} height={24} className="rounded-full border-2 border-primary" />
                <span className="text-base font-semibold">YHotel</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        {profile && <NavUser profile={profile} />}
      </SidebarFooter>
    </Sidebar>
  );
}
