"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { Voucher, VoucherDiscountType, VoucherInput } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useBranch } from "@/contexts/branch-context";
import { useAuth } from "@/contexts/auth-context";
import { canViewAllBranches } from "@/lib/branch";

type VoucherFormState = {
  code: string;
  name: string;
  description: string;
  discount_type: VoucherDiscountType;
  discount_value: string;
  start_at: string;
  end_at: string;
  is_active: boolean;
  branch_id: string;
};

function toInput(state: VoucherFormState): VoucherInput {
  return {
    code: state.code.trim(),
    name: state.name.trim(),
    description: state.description.trim() ? state.description.trim() : null,
    discount_type: state.discount_type,
    discount_value: Number(state.discount_value),
    start_at: state.start_at ? new Date(state.start_at).toISOString() : null,
    end_at: state.end_at ? new Date(state.end_at).toISOString() : null,
    is_active: state.is_active,
    branch_id: state.branch_id === "__global__" ? null : state.branch_id,
  };
}

function fromVoucher(voucher?: Voucher | null): VoucherFormState {
  return {
    code: voucher?.code ?? "",
    name: voucher?.name ?? "",
    description: voucher?.description ?? "",
    discount_type: voucher?.discount_type ?? "percent",
    discount_value: voucher ? String(voucher.discount_value) : "",
    start_at: voucher?.start_at ? voucher.start_at.slice(0, 16) : "",
    end_at: voucher?.end_at ? voucher.end_at.slice(0, 16) : "",
    is_active: voucher?.is_active ?? true,
    branch_id: voucher?.branch_id ?? "__global__",
  };
}

export function VoucherFormDialog({
  open,
  onOpenChange,
  mode,
  initialVoucher,
  onSubmitVoucher,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialVoucher?: Voucher | null;
  onSubmitVoucher: (input: VoucherInput) => Promise<void>;
}) {
  const { profile } = useAuth();
  const { branches, filterBranchId } = useBranch();
  const showBranchScope =
    profile && canViewAllBranches(profile.role) && branches.length > 0;

  const [formValues, setFormValues] = useState<VoucherFormState>(() => {
    const base = fromVoucher(initialVoucher);
    if (mode === "create" && filterBranchId) {
      return { ...base, branch_id: filterBranchId };
    }
    return base;
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = mode === "create" ? "Tạo voucher" : "Chỉnh sửa voucher";
  const description =
    mode === "create"
      ? "Tạo voucher khuyến mãi mới."
      : "Cập nhật thông tin voucher.";

  const canSave = useMemo(() => {
    if (!formValues.code.trim() || !formValues.name.trim()) return false;
    const discount = Number(formValues.discount_value);
    if (!Number.isFinite(discount) || discount <= 0) return false;
    if (formValues.discount_type === "percent" && discount > 100) return false;
    return true;
  }, [formValues]);

  const resetForm = (voucher?: Voucher | null) => {
    setFormValues(fromVoucher(voucher));
    setError(null);
    setIsSubmitting(false);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm(initialVoucher);
    }
    onOpenChange(nextOpen);
  };

  const handleInputChange =
    (field: keyof VoucherFormState) =>
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { value } = event.target;
        setFormValues((prev) => ({ ...prev, [field]: value }));
      };

  const handleSelectChange =
    (field: "discount_type") => (value: string) => {
      setFormValues((prev) => ({ ...prev, [field]: value as VoucherDiscountType }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const code = formValues.code.trim();
    const name = formValues.name.trim();
    if (!code) return setError("Mã voucher không được để trống.");
    if (!name) return setError("Tên voucher không được để trống.");

    const discount = Number(formValues.discount_value);
    if (!Number.isFinite(discount) || discount <= 0) {
      return setError("Giá trị giảm phải là số > 0.");
    }
    if (formValues.discount_type === "percent" && discount > 100) {
      return setError("Voucher % không thể lớn hơn 100.");
    }

    if (formValues.start_at && formValues.end_at) {
      const start = new Date(formValues.start_at).getTime();
      const end = new Date(formValues.end_at).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && start > end) {
        return setError("Thời gian bắt đầu phải trước thời gian kết thúc.");
      }
    }

    try {
      setIsSubmitting(true);
      await onSubmitVoucher(toInput(formValues));
      resetForm(null);
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể lưu voucher";
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="min-w-2xl max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Mã voucher *</Label>
              <Input
                id="code"
                placeholder="VD: SUMMER2026"
                value={formValues.code}
                onChange={handleInputChange("code")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Tên voucher *</Label>
              <Input
                id="name"
                placeholder="VD: Giảm giá mùa hè"
                value={formValues.name}
                onChange={handleInputChange("name")}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              placeholder="Mô tả ngắn (tuỳ chọn)"
              value={formValues.description}
              onChange={handleInputChange("description")}
            />
          </div>

          {showBranchScope ? (
            <div className="space-y-2">
              <Label>Phạm vi chi nhánh</Label>
              <Select
                value={formValues.branch_id}
                onValueChange={(value) =>
                  setFormValues((prev) => ({ ...prev, branch_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phạm vi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global__">Toàn hệ thống</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Loại giảm *</Label>
              <Select
                value={formValues.discount_type}
                onValueChange={handleSelectChange("discount_type")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn loại giảm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Theo %</SelectItem>
                  <SelectItem value="fixed">Theo số tiền</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_value">Giá trị giảm *</Label>
              <Input
                id="discount_value"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder={formValues.discount_type === "percent" ? "VD: 10" : "VD: 50000"}
                value={formValues.discount_value}
                onChange={handleInputChange("discount_value")}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_at">Bắt đầu</Label>
              <Input
                id="start_at"
                type="datetime-local"
                value={formValues.start_at}
                onChange={handleInputChange("start_at")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_at">Kết thúc</Label>
              <Input
                id="end_at"
                type="datetime-local"
                value={formValues.end_at}
                onChange={handleInputChange("end_at")}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded border p-3">
            <div className="space-y-0.5">
              <div className="font-medium">Kích hoạt</div>
              <div className="text-sm text-muted-foreground">
                Voucher chỉ áp dụng khi đang bật
              </div>
            </div>
            <Switch
              checked={formValues.is_active}
              onCheckedChange={(checked) =>
                setFormValues((prev) => ({ ...prev, is_active: checked }))
              }
              aria-label="Bật/tắt voucher"
            />
          </div>

          {error ? (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={!canSave || isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

