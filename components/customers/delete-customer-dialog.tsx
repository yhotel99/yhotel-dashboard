"use client";

import { useState } from "react";
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
import type { Customer } from "@/lib/types";

interface DeleteCustomerDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteCustomerDialog({
  customer,
  open,
  onOpenChange,
  onConfirm,
}: DeleteCustomerDialogProps) {
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const customerName = customer?.full_name || "";
  const isNameMatch = confirmName.trim() === customerName;

  const handleConfirm = async () => {
    if (!isNameMatch) return;
    setIsDeleting(true);
    try {
      await onConfirm();
      setConfirmName("");
      onOpenChange(false);
    } catch {
      // Error is handled in parent component
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmName("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận khóa khách hàng</DialogTitle>
          <DialogDescription>
            Hành động này sẽ khóa khách hàng. Khách hàng sẽ không thể sử dụng
            hệ thống nữa.
            <br />
            <br />
            Để xác nhận, vui lòng nhập tên khách hàng:{" "}
            <strong>{customerName}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-name">Tên khách hàng</Label>
            <Input
              id="confirm-name"
              placeholder="Nhập tên khách hàng để xác nhận"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isNameMatch && !isDeleting) {
                  handleConfirm();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isNameMatch || isDeleting}
          >
            {isDeleting ? "Đang khóa..." : "Khóa khách hàng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

