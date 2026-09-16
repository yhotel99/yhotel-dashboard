"use client";

import { type Icon } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SIDEBAR_URLS } from "@/lib/constants";
import { useRealtimeContext } from "@/contexts/realtime-context";
import { Badge } from "@/components/ui/badge";

export type NavMainItem = {
  title: string;
  url: string;
  icon?: Icon | LucideIcon;
};

export type NavMainGroup = {
  id: string;
  label: string;
  items: NavMainItem[];
};

export function NavMain({ groups }: { groups: NavMainGroup[] }) {
  const pathname = usePathname();
  const { newBookingsCount } = useRealtimeContext();

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.id}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.url ||
                  (item.url !== SIDEBAR_URLS.DASHBOARD &&
                    item.url.length > 1 &&
                    pathname.startsWith(`${item.url}/`));

                const showBadge =
                  item.url === SIDEBAR_URLS.BOOKINGS && newBookingsCount > 0;

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive}
                    >
                      <Link href={item.url}>
                        {item.icon ? <item.icon /> : null}
                        <span>{item.title}</span>
                        {showBadge ? (
                          <Badge
                            variant="destructive"
                            className="ml-auto size-5 shrink-0 items-center justify-center rounded-full p-0 text-xs"
                          >
                            {newBookingsCount > 9 ? "9+" : newBookingsCount}
                          </Badge>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
