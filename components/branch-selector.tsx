"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranch } from "@/contexts/branch-context";

export function BranchSelector() {
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
      <SelectTrigger className="w-[200px] h-8">
        <SelectValue placeholder="Tất cả chi nhánh" />
      </SelectTrigger>
      <SelectContent>
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
