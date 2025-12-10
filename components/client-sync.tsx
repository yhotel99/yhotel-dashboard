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
  const prevUserRef = useRef<User | null>(null);
  const prevProfileRef = useRef<Profile | null>(null);

  useEffect(() => {
    // Chỉ sync khi user hoặc profile thực sự thay đổi
    const userChanged = user?.id !== prevUserRef.current?.id;
    const profileChanged = profile?.id !== prevProfileRef.current?.id;

    if (userChanged || profileChanged) {
      setAuthData(user, profile);
      prevUserRef.current = user;
      prevProfileRef.current = profile;
    }
  }, [user, profile, setAuthData]);

  return null;
}
