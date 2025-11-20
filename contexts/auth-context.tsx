"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

const supabase = createClient();

interface AuthContextType {
  currentUser: User | null;
  profile: Profile | null;
  handleSetProfile: (profile: Profile) => void;
  isLoading: boolean;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch profile when user changes - directly from Supabase
  const fetchProfile = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .is("deleted_at", null)
        .single();

      if (error || !data) {
        setProfile(null);
        return;
      }

      setProfile(data as Profile);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setProfile(null);
    }
  };

  const handleSetProfile = (profile: Profile) => {
    setProfile(profile);
  };

  useEffect(() => {
    // Set up auth state change listener (outside initializeAuth for better performance)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      // Handle all auth events with unified logic
      if (session?.user) {
        // User exists - update user state
        console.log(`${event} for user:`, session.user.id);
        setCurrentUser(session.user);
        // Fetch profile
        await fetchProfile(session.user.id);
      } else {
        // No user - clear user state (session expired, user signed out, etc.)
        console.log(`${event} - clearing user state`);
        setCurrentUser(null);
        setProfile(null);
      }
    });

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        // Check initial user without triggering errors
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            console.log("Initial user found:", user);
            setCurrentUser(user);
            // Fetch profile
            await fetchProfile(user.id);
          }
        } catch {
          // Silently ignore auth errors during initialization
          console.log("No valid session found during initialization");
        }

        setIsInitialized(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing auth:", error);
        setIsInitialized(true);
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Cleanup subscription
    return () => subscription.unsubscribe();
  }, []);

  const value = {
    currentUser,
    profile,
    handleSetProfile,
    isLoading,
    isInitialized,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
