"use client";

import * as React from "react";
import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { NavMain, type NavMainGroup } from "@/components/nav-main";
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
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/contexts/permissions-context";
import {
  allNavItems,
  DASHBOARD_URLS,
  NAV_GROUP,
  navGroupLabels,
  navGroupOrder,
  SIDEBAR_URLS,
} from "@/lib/constants";
import { canViewAllBranches } from "@/lib/branch";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { currentUser, profile } = useAuth();
  const { hasViewPermission } = usePermissions();

  const filteredNavItems = React.useMemo(() => {
    if (!currentUser || !profile) return [];

    return allNavItems.filter((item) => hasViewPermission(item.resource));
  }, [currentUser, profile, hasViewPermission]);

  const navGroups = React.useMemo((): NavMainGroup[] => {
    const groups = navGroupOrder
      .map((groupId) => {
        const items = filteredNavItems
          .filter((item) => item.group === groupId)
          .map(({ title, url, icon }) => ({ title, url, icon }));

        if (
          groupId === NAV_GROUP.FINANCE &&
          profile &&
          canViewAllBranches(profile.role)
        ) {
          items.push({
            title: "Đối soát Excel",
            url: DASHBOARD_URLS.INVOICE_RECONCILE,
            icon: FileSpreadsheet,
          });
        }

        return {
          id: groupId,
          label: navGroupLabels[groupId],
          items,
        };
      })
      .filter((group) => group.items.length > 0);

    return groups;
  }, [filteredNavItems, profile]);

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
                <Image
                  src="/favicon.ico"
                  alt="YHotel"
                  width={24}
                  height={24}
                  className="rounded-full border-2 border-primary"
                />
                <span className="text-base font-semibold">YHotel</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={navGroups} />
      </SidebarContent>
      <SidebarFooter>
        {profile && <NavUser profile={profile} />}
      </SidebarFooter>
    </Sidebar>
  );
}
