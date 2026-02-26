"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

export function ClientSync({
  user,
  profile,
}: {
  user: User | null;
  profile: Profile | null;
}) {
  const { setAuthData } = useAuth();
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Always sync on mount and when data changes
    // Use JSON.stringify to detect deep changes in profile data
    setAuthData(user, profile);
    
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [user?.id, profile?.id, profile?.role, profile?.status, setAuthData]);

  return null;
}
