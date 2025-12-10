"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

interface AuthContextType {
  currentUser: User | null;
  profile: Profile | null;
  setAuthData: (user: User | null, profile: Profile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const setAuthData = (user: User | null, profile: Profile | null) => {
    setCurrentUser(user);
    setProfile(profile);
  };

  return (
    <AuthContext.Provider value={{ currentUser, profile, setAuthData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
