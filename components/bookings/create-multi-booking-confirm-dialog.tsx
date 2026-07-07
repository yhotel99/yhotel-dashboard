"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { paymentMethodLabels } from "@/lib/constants";
import { formatCurrency, formatDisplayDate } from "@/lib/functions";
import type { PaymentMethod } from "@/lib/types";

export type MultiBookingConfirmRoomItem = {
  id: string;
  name: string;
  roomNumber: string | null;
  amount: number;
};

export type MultiBookingConfirmVoucher = {
  code: string;
  discount: number;
  finalAmount: number;
};

export type MultiBookingConfirmSummary = {
  branchLabel: string | null;
  customer: {
    fullName: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalGuests: string;
  paymentMethod: PaymentMethod;
  selectedRooms: MultiBookingConfirmRoomItem[];
  totalAmount: number;
  voucherState: MultiBookingConfirmVoucher | null;
  advanceAmount: number;
  resolvedFinalAmount: number;
  notes: string;
};

interface CreateMultiBookingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  isSubmitting?: boolean;
  summary: MultiBookingConfirmSummary;
}

export function CreateMultiBookingConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
  summary,
}: CreateMultiBookingConfirmDialogProps) {
  const {
    branchLabel,
    customer,
    checkInDate,
    checkOutDate,
    nights,
    totalGuests,
    paymentMethod,
    selectedRooms,
    totalAmount,
    voucherState,
    advanceAmount,
    resolvedFinalAmount,
    notes,
  } = summary;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Xác nhận thông tin đặt phòng</DialogTitle>
          <DialogDescription>
            Vui lòng kiểm tra lại thông tin trước khi tạo booking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="space-y-1">
            <p className="font-medium">Chi nhánh</p>
            <p className="text-muted-foreground">{branchLabel ?? "—"}</p>
          </div>

          <div className="space-y-1">
            <p className="font-medium">Khách hàng</p>
            <p className="text-muted-foreground">
              {customer?.fullName ?? "—"}
              {customer?.phone ? ` • ${customer.phone}` : ""}
              {customer?.email ? ` • ${customer.email}` : ""}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="font-medium">Check-in</p>
              <p className="text-muted-foreground">
                {formatDisplayDate(checkInDate) || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Check-out</p>
              <p className="text-muted-foreground">
                {formatDisplayDate(checkOutDate) || "—"}
                {nights > 0 ? ` (${nights} đêm)` : ""}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="font-medium">Số khách</p>
              <p className="text-muted-foreground">{totalGuests}</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Phương thức thanh toán</p>
              <p className="text-muted-foreground">
                {paymentMethodLabels[paymentMethod]}
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="font-medium">Phòng đã chọn ({selectedRooms.length})</p>
            <div className="space-y-1">
              {selectedRooms.map((room) => (
                <div key={room.id} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate text-muted-foreground">
                    {room.name}
                    {room.roomNumber ? ` (${room.roomNumber})` : ""}
                  </span>
                  <span className="shrink-0">{formatCurrency(room.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Tổng cộng</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            {voucherState ? (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Giảm voucher ({voucherState.code})</span>
                  <span>-{formatCurrency(voucherState.discount)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Thành tiền</span>
                  <span>{formatCurrency(voucherState.finalAmount)}</span>
                </div>
              </>
            ) : null}
            <div className="flex justify-between">
              <span>Tiền cọc</span>
              <span>{formatCurrency(advanceAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Thanh toán cuối cùng</span>
              <span>{formatCurrency(resolvedFinalAmount)}</span>
            </div>
          </div>

          {notes.trim() ? (
            <div className="space-y-1">
              <p className="font-medium">Ghi chú</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {notes.trim()}
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Quay lại chỉnh sửa
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Đang tạo..." : "Xác nhận đặt phòng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
