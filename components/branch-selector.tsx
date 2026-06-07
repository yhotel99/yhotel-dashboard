"use client";

import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranch } from "@/contexts/branch-context";
import { cn } from "@/lib/utils";

type BranchSelectorProps = {
  className?: string;
};

export function BranchSelector({ className }: BranchSelectorProps) {
  const {
    branches,
    canSelectBranch,
    selectedBranchId,
    setSelectedBranchId,
  } = useBranch();

  if (!canSelectBranch || branches.length === 0) {
    return null;
  }

  return (
    <Select
      value={selectedBranchId ?? "__all__"}
      onValueChange={(v) =>
        setSelectedBranchId(v === "__all__" ? null : v)
      }
    >
      <SelectTrigger className={cn("w-[min(200px,40vw)] h-10 gap-2", className)}>
        <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="Tất cả chi nhánh" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="__all__">Tất cả chi nhánh</SelectItem>
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
