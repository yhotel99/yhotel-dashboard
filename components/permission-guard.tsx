"use client";

import { useEffect, useState, useTransition } from "react";
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
  initialPermission = true,
}: {
  children: React.ReactNode;
  user: User | null;
  profile: Profile | null;
  initialPermission?: boolean;
}) {
  const pathname = usePathname();
  const [hasPermission, setHasPermission] = useState<boolean | null>(initialPermission);
  const [fallbackUrl, setFallbackUrl] = useState<string>("/dashboard");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await checkRoutePermissionStatus(pathname, user, profile);
      setHasPermission(result.hasPermission);
      setFallbackUrl(result.fallbackUrl);
    });
  }, [pathname, user?.id, profile?.id, profile?.role]);

  // Show loading state while checking permission
  // Use a minimal loading to avoid flash
  if (hasPermission === null || isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Show permission denied if user doesn't have permission
  if (!hasPermission) {
    return <PermissionDenied fallbackUrl={fallbackUrl} />;
  }

  return <>{children}</>;
}
