"use client";

import { type Icon } from "@tabler/icons-react";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { SIDEBAR_URLS } from "@/lib/constants";
import { useRealtimeContext } from "@/contexts/realtime-context";
import { Badge } from "@/components/ui/badge";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: Icon | LucideIcon;
  }[];
}) {
  const pathname = usePathname();
  const { newBookingsCount } = useRealtimeContext();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            // Check if current pathname matches the item URL
            // For exact match or if pathname starts with item.url followed by a slash
            // Special case: /dashboard only matches exactly, not sub-routes
            const isActive =
              pathname === item.url ||
              (item.url !== SIDEBAR_URLS.DASHBOARD &&
                item.url.length > 1 &&
                pathname.startsWith(`${item.url}/`));
            
            // Show badge for bookings page
            const showBadge = item.url === SIDEBAR_URLS.BOOKINGS && newBookingsCount > 0;

            return (
              <Link href={item.url} key={item.title}>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className="py-6"
                    isActive={isActive}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    {showBadge && (
                      <Badge 
                        variant="destructive" 
                        className="ml-auto size-5 shrink-0 items-center justify-center rounded-full p-0 text-xs"
                      >
                        {newBookingsCount > 9 ? "9+" : newBookingsCount}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Link>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
