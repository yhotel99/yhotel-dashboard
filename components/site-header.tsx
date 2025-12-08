"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  IconChartBar,
  IconCreditCard,
  IconDashboard,
  IconInnerShadowTop,
  IconReceiptRefund,
  IconNews,
} from "@tabler/icons-react";
import { Search, HotelIcon, Images, User2, UserCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { SIDEBAR_URLS } from "@/lib/constants";
import { hasViewPermission } from "@/lib/permissions";
import { useAuth } from "@/contexts/auth-context";

const allNavigationItems = [
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

export function SiteHeader() {
  const router = useRouter();
  const { profile, isLoading } = useAuth();
  const [open, setOpen] = useState(false);

  // Filter navigation items based on permissions
  const navigationItems = useMemo(() => {
    if (!profile || isLoading) {
      return [];
    }

    // Filter all items including dashboard based on permissions
    return allNavigationItems.filter((item) =>
      hasViewPermission(profile.role, item.resource)
    );
  }, [profile, isLoading]);

  // Handle Command + K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (url: string) => {
    router.push(url);
    setOpen(false);
  };

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <button
            onClick={() => setOpen(true)}
            className={cn(
              "relative w-auto md:w-[320px]",
              "flex items-center justify-center md:justify-start gap-2",
              "h-9 px-2 md:px-3",
              "text-sm text-left",
              "bg-background border border-border rounded-md",
              "hover:bg-accent hover:text-accent-foreground",
              "transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            <Search className="size-4 text-muted-foreground shrink-0" />
            <span className="hidden md:inline flex-1 text-muted-foreground whitespace-nowrap">
              Search...
            </span>
            <kbd className="pointer-events-none hidden md:flex h-5 select-none items-center gap-0.5 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium opacity-70">
              <span className="text-[11px]">⌘</span>
              <span>K</span>
            </kbd>
          </button>
        </div>
      </header>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Tìm kiếm trang hoặc lệnh..." />
        <CommandList>
          <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
          <CommandGroup heading="Điều hướng">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.url}
                  value={item.title}
                  onSelect={() => handleSelect(item.url)}
                >
                  <Icon className="size-4" />
                  <span>{item.title}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
