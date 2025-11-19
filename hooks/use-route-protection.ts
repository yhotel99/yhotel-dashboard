"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * Hook to protect routes based on user permissions
 * Redirects user if they don't have access to current route
 */
export function useRouteProtection() {
  const router = useRouter();
  const pathname = usePathname();
  const { canAccessRoute, isLoading } = usePermissions();

  useEffect(() => {
    if (isLoading) return;

    // Check if user can access current route
    if (!canAccessRoute(pathname)) {
      // Redirect to room layout (default for staff)
      router.replace("/dashboard/rooms/map");
    }
  }, [pathname, canAccessRoute, isLoading, router]);
}
