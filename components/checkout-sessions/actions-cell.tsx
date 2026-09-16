"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CHECKOUT_SESSION_STATUS, SIDEBAR_URLS } from "@/lib/constants";
import { finalizeCheckoutSessionAction } from "@/actions/checkout-sessions";
import type { CheckoutSessionRecord } from "@/lib/types";
import { ConfirmCreateBookingDialog } from "./confirm-create-booking-dialog";

export function canCreateBookingFromSession(
  session: Pick<CheckoutSessionRecord, "status" | "booking_id">
): boolean {
  return (
    (session.status === CHECKOUT_SESSION_STATUS.PENDING ||
      session.status === CHECKOUT_SESSION_STATUS.EXPIRED) &&
    !session.booking_id
  );
}

export function CheckoutSessionActionsCell({
  session,
  roomNumberById,
  onCreated,
}: {
  session: CheckoutSessionRecord;
  roomNumberById?: Readonly<Record<string, string>>;
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!canCreateBookingFromSession(session)) {
    return <span className="text-muted-foreground">-</span>;
  }

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      const result = await finalizeCheckoutSessionAction(session.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      const bookingCode = result.data.payment_code;
      toast.success(
        result.data.duplicate
          ? `Booking ${bookingCode} đã tồn tại`
          : `Đã tạo booking ${bookingCode}`,
        {
          action: {
            label: "Mở đơn",
            onClick: () => {
              window.location.href = `${SIDEBAR_URLS.BOOKINGS}?search=${encodeURIComponent(bookingCode)}`;
            },
          },
        }
      );
      setOpen(false);
      onCreated?.();
    } catch {
      toast.error("Không thể tạo booking từ phiên thanh toán");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        Tạo booking
      </Button>
      <ConfirmCreateBookingDialog
        open={open}
        onOpenChange={setOpen}
        session={session}
        roomNumberById={roomNumberById}
        isSubmitting={isLoading}
        onConfirm={() => {
          void handleConfirm();
        }}
      />
    </>
  );
}
