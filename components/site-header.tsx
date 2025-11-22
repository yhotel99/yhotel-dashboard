"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SIDEBAR_URLS } from "@/lib/constants";

// Mapping từ URL sang title
const PAGE_TITLES: Record<string, string> = {
  [SIDEBAR_URLS.DASHBOARD]: "Dashboard",
  [SIDEBAR_URLS.ROOMS]: "Quản lý phòng",
  [SIDEBAR_URLS.BOOKINGS]: "Quản lý đặt phòng",
  [SIDEBAR_URLS.RESERVATION]: "Đặt phòng",
  [SIDEBAR_URLS.CUSTOMERS]: "Quản lý khách hàng",
  [SIDEBAR_URLS.PAYMENTS]: "Quản lý thanh toán",
  [SIDEBAR_URLS.GALLERY]: "Thư viện ảnh",
  [SIDEBAR_URLS.USERS]: "Quản lý người dùng",
};

// Sub-routes mapping
const getPageTitle = (pathname: string): string => {
  // Kiểm tra exact match trước
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }

  // Kiểm tra sub-routes
  if (pathname.startsWith(`${SIDEBAR_URLS.ROOMS}/`)) {
    if (pathname.includes("/create")) return "Tạo phòng mới";
    if (pathname.includes("/edit/")) return "Chỉnh sửa phòng";
    return "Quản lý phòng";
  }

  if (pathname.startsWith(`${SIDEBAR_URLS.BOOKINGS}/`)) {
    if (pathname.includes("/edit/")) return "Chỉnh sửa đặt phòng";
    return "Quản lý đặt phòng";
  }

  if (pathname.startsWith(`${SIDEBAR_URLS.CUSTOMERS}/`)) {
    if (pathname.includes("/bookings")) return "Đặt phòng của khách hàng";
    return "Quản lý khách hàng";
  }

  // Kiểm tra các routes khác
  for (const [url, title] of Object.entries(PAGE_TITLES)) {
    if (url !== SIDEBAR_URLS.DASHBOARD && pathname.startsWith(`${url}/`)) {
      return title;
    }
  }

  // Default
  return "Dashboard";
};

export function SiteHeader() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{pageTitle}</h1>
      </div>
    </header>
  );
}
