"use client";

import { useEffect, useState } from "react";
import { checkRoutePermissionStatus } from "@/lib/server-actions";
import { usePathname } from "next/navigation";
import { PermissionDenied } from "@/components/permission-denied";
import { User } from "@supabase/supabase-js";
import { Profile } from "@/lib/types";

/**
 * Client component to check route permission using server action
 * This ensures users cannot access pages they don't have permission for
 * even if they try to access directly via URL
 */
export function PermissionGuard({
  children,
  user,
  profile,
}: {
  children: React.ReactNode;
  user: User | null;
  profile: Profile | null;
}) {
  const pathname = usePathname();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string>("/dashboard");

  useEffect(() => {
    async function checkPermission() {
      const result = await checkRoutePermissionStatus(pathname, user, profile);
      setHasPermission(result.hasPermission);
      setFallbackUrl(result.fallbackUrl);
    }

    checkPermission();
  }, [pathname, user?.id, profile?.role]);

  // Show loading state while checking permission
  if (hasPermission === null) {
    return null;
  }

  // Show permission denied if user doesn't have permission
  if (!hasPermission) {
    return <PermissionDenied fallbackUrl={fallbackUrl} />;
  }

  return <>{children}</>;
}
