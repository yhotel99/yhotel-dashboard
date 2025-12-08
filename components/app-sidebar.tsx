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
import { hasViewPermission } from "@/lib/permissions";
import { getProfileById } from "@/services/profiles";
import type { Profile } from "@/lib/types";

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
    title: "Bookings",
    url: SIDEBAR_URLS.BOOKINGS,
    icon: IconChartBar,
    resource: "bookings",
  },
  {
    title: "Reservation",
    url: SIDEBAR_URLS.RESERVATION,
    icon: IconInnerShadowTop,
    resource: "reservations",
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

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
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
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(true);

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (currentUser?.id) {
        try {
          const userProfile = await getProfileById(currentUser.id);
          setProfile(userProfile);
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setIsLoadingProfile(false);
        }
      } else {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [currentUser?.id]);

  // Filter nav items based on permissions
  const filteredNavItems = React.useMemo(() => {
    if (!profile || isLoadingProfile) {
      return [];
    }

    // Filter all items including dashboard based on permissions
    return allNavItems.filter((item) =>
      hasViewPermission(profile.role, item.resource)
    );
  }, [profile, isLoadingProfile]);

  // Get first allowed page for logo link (fallback to first item or dashboard)
  const logoLink = React.useMemo(() => {
    if (!profile || isLoadingProfile) {
      return SIDEBAR_URLS.DASHBOARD;
    }
    const firstAllowedItem = filteredNavItems[0];
    return firstAllowedItem?.url || SIDEBAR_URLS.DASHBOARD;
  }, [filteredNavItems, profile, isLoadingProfile]);

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
          items={filteredNavItems.map(({ resource, ...item }) => item)}
        />
      </SidebarContent>
      <SidebarFooter>
        {currentUser && <NavUser user={currentUser} />}
      </SidebarFooter>
    </Sidebar>
  );
}
