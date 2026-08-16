"use client";

import { IconBuilding } from "@tabler/icons-react";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  canViewAllBranches,
  getDefaultFormBranchId,
  resolveBranchDisplay,
} from "@/lib/branch";
import { DEFAULT_BRANCH_ID } from "@/lib/constants";

type BranchFormFieldProps = {
  value: string;
  onChange: (branchId: string) => void;
  mode?: "select" | "readonly";
  label?: string;
  required?: boolean;
  className?: string;
  lockedBranchId?: string | null;
};

export function BranchFormField({
  value,
  onChange,
  mode,
  label = "Chi nhánh",
  required = true,
  className,
  lockedBranchId,
}: BranchFormFieldProps) {
  const { profile } = useAuth();
  const { branches, activeBranches, filterBranchId, effectiveBranchId } = useBranch();

  const effectiveId =
    lockedBranchId ??
    (value ||
      getDefaultFormBranchId({
        profile,
        filterBranchId,
        effectiveBranchId,
      }));

  const showSelect =
    mode === "select" ||
    (mode !== "readonly" &&
      profile &&
      canViewAllBranches(profile.role) &&
      !lockedBranchId);

  const display = resolveBranchDisplay(effectiveId, branches);

  if (!showSelect || activeBranches.length === 0) {
    return (
      <div className={className}>
        <Label className="text-sm font-medium">
          {label}
          {required ? " *" : ""}
        </Label>
        <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
          <IconBuilding className="size-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{display.name}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {display.code}
            </p>
          </div>
        </div>
        {lockedBranchId || mode === "readonly" ? (
          <p className="text-xs text-muted-foreground mt-1">
            Chi nhánh theo tài khoản của bạn — không thể đổi khi đặt phòng.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={className}>
      <Label className="text-sm font-medium">
        {label}
        {required ? " *" : ""}
      </Label>
      <Select
        value={value || effectiveId || DEFAULT_BRANCH_ID}
        onValueChange={onChange}
      >
        <SelectTrigger className="mt-2 w-full">
          <SelectValue placeholder="Chọn chi nhánh" />
        </SelectTrigger>
        <SelectContent>
          {activeBranches.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground mt-1">
        Chọn chi nhánh trước khi chọn phòng hoặc khách hàng.
      </p>
    </div>
  );
}

type BranchDetailSectionProps = {
  branchId: string | undefined | null;
  title?: string;
  className?: string;
  hint?: string;
};

export function BranchDetailSection({
  branchId,
  title = "Chi nhánh",
  className,
  hint,
}: BranchDetailSectionProps) {
  const { branches } = useBranch();
  const display = resolveBranchDisplay(branchId, branches);

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <IconBuilding className="size-5" />
        {title}
      </h3>
      {hint ? (
        <p className="text-sm text-muted-foreground mb-3">{hint}</p>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <span className="text-sm font-medium text-muted-foreground">
            Tên chi nhánh
          </span>
          <p className="text-base font-medium">{display.name}</p>
        </div>
        <div className="space-y-1">
          <span className="text-sm font-medium text-muted-foreground">
            Mã chi nhánh
          </span>
          <p className="text-base font-mono">{display.code}</p>
        </div>
      </div>
    </div>
  );
}

export function CurrentBranchBadge({ className }: { className?: string }) {
  const { profile } = useAuth();
  const { branches, selectedBranchId, canSelectBranch } = useBranch();

  if (!profile) return null;

  if (canSelectBranch) {
    if (selectedBranchId) {
      const display = resolveBranchDisplay(selectedBranchId, branches);
      return (
        <Badge variant="outline" className={className}>
          Đang xem: {display.name}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className={className}>
        Đang xem: Tất cả chi nhánh
      </Badge>
    );
  }

  if (profile.branch_id) {
    const display = resolveBranchDisplay(profile.branch_id, branches);
    return (
      <Badge variant="outline" className={className}>
        Chi nhánh: {display.name}
      </Badge>
    );
  }

  return null;
}
