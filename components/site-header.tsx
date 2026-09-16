"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";

import { QrCode, Search } from "lucide-react";
import { HeaderToolbar } from "@/components/header-toolbar";
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
import { allNavItems, DASHBOARD_URLS, navGroupLabels, navGroupOrder } from "@/lib/constants";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/contexts/permissions-context";

export function SiteHeader() {
  const router = useRouter();
  const { profile } = useAuth();
  const { hasViewPermission } = usePermissions();
  const [open, setOpen] = useState(false);

  const navigationGroups = useMemo(() => {
    if (!profile) {
      return [];
    }

    const allowed = allNavItems.filter((item) =>
      hasViewPermission(item.resource)
    );

    return navGroupOrder
      .map((groupId) => ({
        id: groupId,
        label: navGroupLabels[groupId],
        items: allowed.filter((item) => item.group === groupId),
      }))
      .filter((group) => group.items.length > 0);
  }, [profile, hasViewPermission]);

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
          <div className="ml-auto flex items-center">
            <HeaderToolbar />
          </div>
        </div>
      </header>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Tìm kiếm trang hoặc lệnh..." />
        <CommandList>
          <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
          {navigationGroups.map((group) => (
            <CommandGroup key={group.id} heading={group.label}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.url}
                    value={`${group.label} ${item.title}`}
                    onSelect={() => handleSelect(item.url)}
                  >
                    <Icon className="size-4" />
                    <span>{item.title}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
          <CommandGroup heading="Công cụ">
            <CommandItem
              value="Tạo mã QR thanh toán"
              onSelect={() => handleSelect(DASHBOARD_URLS.PAYMENT_QR)}
            >
              <QrCode className="size-4" />
              <span>Tạo mã QR thanh toán</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
