"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

// Mapping pathname to page title
const pageTitles: Record<string, string> = {
  "/dashboard": "Trang chủ",
  "/dashboard/bookings": "Đặt phòng",
  "/dashboard/customers": "Khách hàng",
  "/dashboard/rooms": "Phòng",
  "/dashboard/rooms/create": "Tạo phòng",
  "/dashboard/rooms/map": "Bản đồ phòng",
  "/dashboard/users": "Người dùng",
  "/dashboard/gallery": "Thư viện ảnh",
};

// Helper function to get page title from pathname
function getPageTitle(pathname: string): string {
  // Check exact match first
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  // Check for dynamic routes (e.g., /dashboard/rooms/edit/[id])
  if (pathname.startsWith("/dashboard/rooms/edit/")) {
    return "Sửa phòng";
  }
  if (
    pathname.startsWith("/dashboard/customers/") &&
    pathname.includes("/bookings")
  ) {
    return "Đặt phòng của khách hàng";
  }

  // Default fallback
  return "Dashboard";
}

export function SiteHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
      </div>
    </header>
  );
}
