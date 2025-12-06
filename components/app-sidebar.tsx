"use client";

import * as React from "react";
import {
  IconCamera,
  IconChartBar,
  IconCreditCard,
  IconDashboard,
  IconFileAi,
  IconFileDescription,
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

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: SIDEBAR_URLS.DASHBOARD,
      icon: IconDashboard,
    },
    {
      title: "Rooms",
      url: SIDEBAR_URLS.ROOMS,
      icon: HotelIcon,
    },
    {
      title: "Bookings",
      url: SIDEBAR_URLS.BOOKINGS,
      icon: IconChartBar,
    },
    {
      title: "Reservation",
      url: SIDEBAR_URLS.RESERVATION,
      icon: IconInnerShadowTop,
    },
    {
      title: "Customers",
      url: SIDEBAR_URLS.CUSTOMERS,
      icon: UserCircle,
    },
    {
      title: "Payments",
      url: SIDEBAR_URLS.PAYMENTS,
      icon: IconCreditCard,
    },
    {
      title: "Refund Requests",
      url: SIDEBAR_URLS.REFUND_REQUESTS,
      icon: IconReceiptRefund,
    },
    {
      title: "Gallery",
      url: SIDEBAR_URLS.GALLERY,
      icon: Images,
    },
    {
      title: "Blogs",
      url: "/dashboard/blogs",
      icon: IconNews,
    },
    {
      title: "Users",
      url: SIDEBAR_URLS.USERS,
      icon: User2,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { currentUser } = useAuth();
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href={SIDEBAR_URLS.DASHBOARD}>
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">YHotel</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        {currentUser && <NavUser user={currentUser} />}
      </SidebarFooter>
    </Sidebar>
  );
}
