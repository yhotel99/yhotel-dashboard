"use client";

import * as React from "react";
import {
  IconChartBar,
  IconCreditCard,
  IconDashboard,
  IconInnerShadowTop,
  IconReceiptRefund,
  IconNews,
} from "@tabler/icons-react";

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
import { HotelIcon, Images, User2, UserCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { SIDEBAR_URLS } from "@/lib/constants";
import { hasViewPermission } from "@/lib/permissions";

const allNavItems = [
  {
    title: "Dashboard",
    url: SIDEBAR_URLS.DASHBOARD,
    icon: IconDashboard,
    resource: "dashboard",
  },
  {
    title: "Rooms",
    url: SIDEBAR_URLS.ROOMS,
    icon: HotelIcon,
    resource: "rooms",
  },
  {
    title: "Reservation",
    url: SIDEBAR_URLS.RESERVATION,
    icon: IconInnerShadowTop,
    resource: "reservations",
  },
  {
    title: "Bookings",
    url: SIDEBAR_URLS.BOOKINGS,
    icon: IconChartBar,
    resource: "bookings",
  },

  {
    title: "Customers",
    url: SIDEBAR_URLS.CUSTOMERS,
    icon: UserCircle,
    resource: "customers",
  },
  {
    title: "Payments",
    url: SIDEBAR_URLS.PAYMENTS,
    icon: IconCreditCard,
    resource: "payments",
  },
  {
    title: "Refund Requests",
    url: SIDEBAR_URLS.REFUND_REQUESTS,
    icon: IconReceiptRefund,
    resource: "refund-requests",
  },
  {
    title: "Gallery",
    url: SIDEBAR_URLS.GALLERY,
    icon: Images,
    resource: "gallery",
  },
  {
    title: "Blogs",
    url: "/dashboard/blogs",
    icon: IconNews,
    resource: "blogs",
  },
  {
    title: "Users",
    url: SIDEBAR_URLS.USERS,
    icon: User2,
    resource: "users",
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { currentUser, profile, isLoading, isInitialized } = useAuth();

  console.log({
    currentUser,
    profile,
    isLoading,
    isInitialized,
  });
  // Filter nav items based on permissions
  const filteredNavItems = React.useMemo(() => {
    if (!isInitialized || !currentUser || !profile) return [];

    return allNavItems.filter((item) =>
      hasViewPermission(profile.role, item.resource)
    );
  }, [currentUser, profile, isInitialized]);

  // Get first allowed page for logo link (fallback to first item or dashboard)
  const logoLink = React.useMemo(() => {
    if (!profile || isLoading || !isInitialized) {
      return SIDEBAR_URLS.DASHBOARD;
    }
    const firstAllowedItem = filteredNavItems[0];
    return firstAllowedItem?.url || SIDEBAR_URLS.DASHBOARD;
  }, [filteredNavItems, profile, isLoading, isInitialized]);

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
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">YHotel</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={filteredNavItems.map(({ title, url, icon }) => ({
            title,
            url,
            icon,
          }))}
        />
      </SidebarContent>
      <SidebarFooter>
        {currentUser && <NavUser user={currentUser} />}
      </SidebarFooter>
    </Sidebar>
  );
}
