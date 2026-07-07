"use client";

import {
  createContext,
  use,
  useState,
  useMemo,
  ReactNode,
  useCallback,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { canViewAllBranches as checkCanViewAllBranches } from "@/lib/branch";

interface AuthContextType {
  currentUser: User | null;
  profile: Profile | null;
  isLoading: boolean;
  branchId: string | null;
  canViewAllBranches: boolean;
  setAuthData: (user: User | null, profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ 
  children,
  initialUser = null,
  initialProfile = null,
}: { 
  children: ReactNode;
  initialUser?: User | null;
  initialProfile?: Profile | null;
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const setAuthData = useCallback((user: User | null, profile: Profile | null) => {
    setCurrentUser(user);
    setProfile(profile);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const branchId = profile?.branch_id ?? null;
  const canViewAllBranches = profile
    ? checkCanViewAllBranches(profile.role)
    : false;

  const contextValue = useMemo(
    () => ({
      currentUser,
      profile,
      isLoading,
      branchId,
      canViewAllBranches,
      setAuthData,
      setLoading,
    }),
    [
      currentUser,
      profile,
      isLoading,
      branchId,
      canViewAllBranches,
      setAuthData,
      setLoading,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
