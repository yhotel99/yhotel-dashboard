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
    title: "Tổng Quan",
    url: SIDEBAR_URLS.DASHBOARD,
    icon: IconDashboard,
    resource: "dashboard",
  },
  {
    title: "Quản lý Phòng Khách Sạn",
    url: SIDEBAR_URLS.ROOMS,
    icon: HotelIcon,
    resource: "rooms",
  },
  {
    title: "Quản Lý Đặt Chỗ",
    url: SIDEBAR_URLS.RESERVATION,
    icon: IconInnerShadowTop,
    resource: "reservations",
  },
  {
    title: "Quản Lý Đơn Đặt Phòng",
    url: SIDEBAR_URLS.BOOKINGS,
    icon: IconChartBar,
    resource: "bookings",
  },

  {
    title: "Quản Lý Khách Hàng",
    url: SIDEBAR_URLS.CUSTOMERS,
    icon: UserCircle,
    resource: "customers",
  },
  {
    title: "Quản Lý Thanh Toán",
    url: SIDEBAR_URLS.PAYMENTS,
    icon: IconCreditCard,
    resource: "payments",
  },
  {
    title: "Quản Lý Hoàn Tiền",
    url: SIDEBAR_URLS.REFUND_REQUESTS,
    icon: IconReceiptRefund,
    resource: "refund-requests",
  },
  {
    title: "Quản Lý Bộ Sưu Tập Ảnh",
    url: SIDEBAR_URLS.GALLERY,
    icon: Images,
    resource: "gallery",
  },
  {
    title: "Quản Lý Blog",
    url: "/dashboard/blogs",
    icon: IconNews,
    resource: "blogs",
  },
  {
    title: "Quản Lý Người Dùng",
    url: SIDEBAR_URLS.USERS,
    icon: User2,
    resource: "users",
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { currentUser, profile } = useAuth();

  // Filter nav items based on permissions
  const filteredNavItems = React.useMemo(() => {
    if (!currentUser || !profile) return [];

    return allNavItems.filter((item) =>
      hasViewPermission(profile.role, item.resource)
    );
  }, [currentUser, profile]);

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
