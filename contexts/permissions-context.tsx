"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useAuth } from "./auth-context";

interface PermissionsContextType {
  permissions: string[];
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasViewPermission: (resource: string) => boolean;
  refetch: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(
  undefined
);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();

  // SWR key - null khi không có profile để disable fetch
  const swrKey = profile ? "/api/permissions" : null;

  // Fetch permissions using SWR
  const { data, error, isLoading, mutate } = useSWR<{
    permissions: string[];
    role: string;
  }>(swrKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  });

  // Extract permissions from SWR data
  const permissions = useMemo(() => {
    if (!data) return [];
    return data.permissions || [];
  }, [data]);

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasViewPermission = (resource: string): boolean => {
    return hasPermission(`view:${resource}`);
  };

  // Refetch function using SWR mutate
  const refetch = async () => {
    await mutate();
  };

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        isLoading: isLoading || (!profile && !error), // Show loading if no profile yet
        hasPermission,
        hasViewPermission,
        refetch,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx)
    throw new Error("usePermissions must be used inside PermissionsProvider");
  return ctx;
}
