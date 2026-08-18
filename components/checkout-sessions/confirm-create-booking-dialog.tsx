"use client";

import { IconLoader2 } from "@tabler/icons-react";
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
import {
  formatCheckoutSessionRoomsLabel,
  formatCurrency,
  formatDisplayDate,
} from "@/lib/functions";
import type { CheckoutSessionRecord } from "@/lib/types";
import { CheckoutSessionStatusBadge } from "./status";

export function ConfirmCreateBookingDialog({
  open,
  onOpenChange,
  session,
  roomNumberById,
  isSubmitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CheckoutSessionRecord;
  roomNumberById?: Readonly<Record<string, string>>;
  isSubmitting: boolean;
  onConfirm: () => void;
}) {
  const paymentLabel =
    paymentMethodLabels[
      session.payment_method as keyof typeof paymentMethodLabels
    ] ?? session.payment_method;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Xác nhận tạo booking</DialogTitle>
          <DialogDescription>
            Kiểm tra thông tin phiên {session.payment_code} trước khi tạo
            booking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-medium">Trạng thái phiên</p>
              <CheckoutSessionStatusBadge status={session.status} />
            </div>
            {session.branch_code ? (
              <div className="space-y-1 text-right">
                <p className="font-medium">Chi nhánh</p>
                <p className="text-muted-foreground">{session.branch_code}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-1">
            <p className="font-medium">Khách hàng</p>
            <p className="text-muted-foreground">
              {session.guest_name || "—"}
              {session.guest_phone ? ` • ${session.guest_phone}` : ""}
              {session.guest_email ? ` • ${session.guest_email}` : ""}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="font-medium">Check-in</p>
              <p className="text-muted-foreground">
                {formatDisplayDate(session.check_in) || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Check-out</p>
              <p className="text-muted-foreground">
                {formatDisplayDate(session.check_out) || "—"}
                {session.number_of_nights > 0
                  ? ` (${session.number_of_nights} đêm)`
                  : ""}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="font-medium">Số khách</p>
              <p className="text-muted-foreground">{session.total_guests}</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Phương thức thanh toán</p>
              <p className="text-muted-foreground">{paymentLabel}</p>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="font-medium">
              Phòng ({session.rooms.length})
            </p>
            <div className="space-y-1">
              {session.rooms.length > 0 ? (
                session.rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex justify-between gap-2"
                  >
                    <span className="min-w-0 truncate text-muted-foreground">
                      {formatCheckoutSessionRoomsLabel(
                        [room],
                        roomNumberById
                      )}
                    </span>
                    <span className="shrink-0">
                      {formatCurrency(room.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Chưa có phòng</p>
              )}
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Tổng cộng</span>
              <span>{formatCurrency(session.total_amount)}</span>
            </div>
            {session.final_amount !== session.total_amount ? (
              <div className="flex justify-between font-semibold">
                <span>Thành tiền</span>
                <span>{formatCurrency(session.final_amount)}</span>
              </div>
            ) : null}
          </div>

          {session.notes?.trim() ? (
            <div className="space-y-1">
              <p className="font-medium">Ghi chú</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {session.notes.trim()}
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
            Hủy
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : null}
            Tạo booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
