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

const supabase = createClient();

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => Promise<{ error: Error | null }>;
  logout: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

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
      } else {
        // No user - clear user state (session expired, user signed out, etc.)
        console.log(`${event} - clearing user state`);
        setCurrentUser(null);
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
            console.log("Initial user found:", user.id);
            setCurrentUser(user);
          }
        } catch (error) {
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

  const login = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      if (data.user) {
        // Auth state change listener will update currentUser automatically
        return { error: null };
      }

      return { error: new Error("Đăng nhập thất bại") };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
      return { error: new Error(errorMessage) };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: new Error(error.message) };
      }

      // Auth state change listener will update currentUser automatically
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
      return { error: new Error(errorMessage) };
    }
  };

  const value = {
    currentUser,
    isLoading,
    isInitialized,
    login,
    logout,
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
