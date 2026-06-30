"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Branch, BranchScope } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { canViewAllBranches } from "@/lib/branch";
import { DEFAULT_BRANCH_ID } from "@/lib/constants";
import {
  BRANCH_STORAGE_KEY,
  readStoredBranchId,
} from "@/lib/branch-storage";

type BranchContextType = {
  branches: Branch[];
  scope: BranchScope;
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
  /** @deprecated Prefer filterBranchId for list/report API queries. */
  effectiveBranchId: string | null;
  /** Branch id for API filters; null when admin views all branches. */
  filterBranchId: string | null;
  canSelectBranch: boolean;
  setBranches: (branches: Branch[]) => void;
};

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({
  children,
  initialBranches = [],
}: {
  children: ReactNode;
  initialBranches?: Branch[];
}) {
  const { profile } = useAuth();
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(
    readStoredBranchId
  );

  const canSelectBranch = profile ? canViewAllBranches(profile.role) : false;

  const setSelectedBranchId = useCallback(
    (id: string | null) => {
      setSelectedBranchIdState(id);
      if (typeof window !== "undefined") {
        if (id) {
          window.localStorage.setItem(BRANCH_STORAGE_KEY, id);
        } else {
          window.localStorage.removeItem(BRANCH_STORAGE_KEY);
        }
      }
    },
    []
  );

  const activeSelectedBranchId = useMemo(() => {
    if (!canSelectBranch || !selectedBranchId) return selectedBranchId;
    if (branches.length === 0) return selectedBranchId;
    return branches.some((b) => b.id === selectedBranchId)
      ? selectedBranchId
      : null;
  }, [canSelectBranch, selectedBranchId, branches]);

  if (activeSelectedBranchId !== selectedBranchId) {
    setSelectedBranchId(activeSelectedBranchId);
  }

  const scope: BranchScope = useMemo(() => {
    if (!profile) return { mode: "all", branchId: null };
    if (canSelectBranch) {
      return activeSelectedBranchId
        ? { mode: "single", branchId: activeSelectedBranchId }
        : { mode: "all", branchId: null };
    }
    if (profile.branch_id) {
      return { mode: "single", branchId: profile.branch_id };
    }
    return { mode: "all", branchId: null };
  }, [profile, canSelectBranch, activeSelectedBranchId]);

  const filterBranchId = useMemo(() => {
    if (scope.mode === "single") return scope.branchId;
    return activeSelectedBranchId;
  }, [scope, activeSelectedBranchId]);

  const effectiveBranchId = useMemo(() => {
    if (scope.mode === "single") return scope.branchId;
    return activeSelectedBranchId ?? DEFAULT_BRANCH_ID;
  }, [scope, activeSelectedBranchId]);

  return (
    <BranchContext.Provider
      value={{
        branches,
        scope,
        selectedBranchId: activeSelectedBranchId,
        setSelectedBranchId,
        effectiveBranchId,
        filterBranchId,
        canSelectBranch,
        setBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error("useBranch must be used inside BranchProvider");
  }
  return ctx;
}
