"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { checkRoutePermission } from "@/lib/server-actions";

/**
 * Client component to check route permission using server action
 * This ensures users cannot access pages they don't have permission for
 * even if they try to access directly via URL
 */
export function PermissionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Check permission when pathname changes
    if (pathname.startsWith("/dashboard")) {
      checkRoutePermission(pathname);
    }
  }, [pathname]);

  return <>{children}</>;
}
