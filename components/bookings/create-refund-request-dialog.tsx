"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createRefundRequestAction, getRefundRequestsByBookingIdAction } from "@/actions/refund-requests";
import { getPaymentsByBookingIdAction } from "@/actions/payments";
import type { BookingRecord, PaymentWithBooking, RefundRequest } from "@/lib/types";
import { PAYMENT_STATUS, REFUND_REQUEST_STATUS } from "@/lib/constants";
import { formatVND } from "@/lib/functions";
import { toast } from "sonner";

const createRefundRequestSchema = (maxAmount: number) =>
  z.object({
    payment_id: z.string().nullable(),
    amount: z
      .number({
        message: "Vui lòng nhập số tiền",
      })
      .positive("Số tiền phải lớn hơn 0")
      .max(
        maxAmount,
        `Số tiền không được vượt quá ${formatVND(maxAmount)}`
      ),
    reason: z.string().optional(),
    note: z.string().optional(),
  });

interface CreateRefundRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingRecord;
  onSuccess?: () => void;
}

export function CreateRefundRequestDialog({
  open,
  onOpenChange,
  booking,
  onSuccess,
}: CreateRefundRequestDialogProps) {
  const [allPayments, setAllPayments] = React.useState<PaymentWithBooking[]>(
    []
  );
  const [refundRequests, setRefundRequests] = React.useState<RefundRequest[]>(
    []
  );
  const [isLoadingPayments, setIsLoadingPayments] = React.useState(false);
  const [paymentsError, setPaymentsError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasFetchedData, setHasFetchedData] = React.useState(false);

  // Fetch payments and refund requests when dialog opens
  React.useEffect(() => {
    if (open && booking.id && !hasFetchedData) {
      const fetchData = async () => {
        try {
          setIsLoadingPayments(true);
          setPaymentsError(null);
          const [payments, refunds] = await Promise.all([
            getPaymentsByBookingIdAction(booking.id),
            getRefundRequestsByBookingIdAction(booking.id),
          ]);
          setAllPayments(payments);
          setRefundRequests(refunds);
          setHasFetchedData(true);
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Không thể tải thông tin thanh toán";
          setPaymentsError(errorMessage);
          setAllPayments([]);
          setRefundRequests([]);
        } finally {
          setIsLoadingPayments(false);
        }
      };

      fetchData();
    } else if (!open) {
      // Reset when dialog closes
      setHasFetchedData(false);
      setAllPayments([]);
      setRefundRequests([]);
      setPaymentsError(null);
    }
  }, [open, booking.id, hasFetchedData]);

  // Filter eligible payments (only PAID, exclude REFUNDED)
  const paidPayments = React.useMemo(() => {
    const eligible = allPayments.filter((p) => {
      const status = p.payment_status;
      const isPaid = status === PAYMENT_STATUS.PAID;
      const isNotRefunded = status !== PAYMENT_STATUS.REFUNDED;
      const isNotCancelled = status !== PAYMENT_STATUS.CANCELLED;
      const isNotFailed = status !== PAYMENT_STATUS.FAILED;

      return isPaid && isNotRefunded && isNotCancelled && isNotFailed;
    });
    return eligible;
  }, [allPayments]);

  // Calculate total paid amount
  const totalPaidAmount = React.useMemo(() => {
    return paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [paidPayments]);

  // Calculate total refunded amount
  const totalRefundedAmount = React.useMemo(() => {
    return refundRequests
      .filter((r) => r.status === REFUND_REQUEST_STATUS.REFUNDED)
      .reduce((sum, refund) => sum + (refund.amount || 0), 0);
  }, [refundRequests]);

  // Calculate available refund amount
  const availableRefundAmount = React.useMemo(() => {
    return Math.max(0, totalPaidAmount - totalRefundedAmount);
  }, [totalPaidAmount, totalRefundedAmount]);

  // Create schema with max amount validation (using available refund amount)
  const refundRequestSchema = React.useMemo(
    () => createRefundRequestSchema(availableRefundAmount),
    [availableRefundAmount]
  );

  type RefundRequestFormValues = z.infer<typeof refundRequestSchema>;

  const form = useForm<RefundRequestFormValues>({
    resolver: zodResolver(refundRequestSchema),
    defaultValues: {
      payment_id: null,
      amount: 0,
      reason: "",
      note: "",
    },
  });

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (values: RefundRequestFormValues) => {
    try {
      setIsSubmitting(true);

      // Validate amount against available refund amount
      if (values.amount > availableRefundAmount) {
        form.setError("amount", {
          message: `Số tiền không được vượt quá ${formatVND(availableRefundAmount)}`,
        });
        return;
      }

      await createRefundRequestAction({
        booking_id: booking.id,
        payment_id: null, // No longer tied to a specific payment
        customer_id: booking.customer_id,
        amount: values.amount,
        reason: values.reason || null,
        note: values.note || null,
      });

      toast.success("Đã tạo yêu cầu hoàn tiền thành công");

      // Reset fetch flag so data will be refreshed when dialog opens again
      setHasFetchedData(false);

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Không thể tạo yêu cầu hoàn tiền";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yêu cầu hoàn tiền</DialogTitle>
          <DialogDescription>
            Tạo yêu cầu hoàn tiền cho booking này
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isLoadingPayments ? (
              <div className="text-sm text-muted-foreground">
                Đang tải thông tin thanh toán...
              </div>
            ) : paymentsError ? (
              <div className="text-sm text-destructive">
                Lỗi khi tải thông tin thanh toán: {paymentsError}
              </div>
            ) : allPayments.length === 0 ? (
              <div className="text-sm text-destructive">
                Không tìm thấy thanh toán nào cho booking này
              </div>
            ) : paidPayments.length === 0 ? (
              <div className="text-sm text-destructive">
                Không có thanh toán nào để hoàn tiền.
                {allPayments.length > 0 && (
                  <span className="block mt-1 text-xs">
                    (Tìm thấy {allPayments.length} thanh toán nhưng không có
                    thanh toán nào ở trạng thái &quot;Đã thanh toán&quot;)
                  </span>
                )}
              </div>
            ) : availableRefundAmount <= 0 ? (
              <div className="text-sm text-destructive">
                Không thể hoàn tiền. Tổng đã hoàn tiền đã đạt giới hạn.
                <div className="mt-2 text-xs space-y-1">
                  <div>
                    Tổng đã thanh toán: {formatVND(totalPaidAmount)}
                  </div>
                  <div>
                    Đã hoàn tiền: {formatVND(totalRefundedAmount)}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="text-sm space-y-1 p-3 bg-muted rounded-md">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Tổng đã thanh toán:
                    </span>
                    <span className="font-medium">
                      {formatVND(totalPaidAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Đã hoàn tiền:</span>
                    <span className="font-medium">
                      {formatVND(totalRefundedAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t">
                    <span className="text-muted-foreground">
                      Có thể hoàn lại:
                    </span>
                    <span className="font-semibold text-primary">
                      {formatVND(availableRefundAmount)}
                    </span>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Số tiền hoàn lại{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          (Tối đa: {formatVND(availableRefundAmount)})
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Nhập số tiền cần hoàn lại"
                          value={
                            field.value && field.value > 0
                              ? new Intl.NumberFormat("vi-VN", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(field.value)
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            // Remove all non-digit characters except decimal point
                            const numericValue = value.replace(/[^\d]/g, "");
                            if (numericValue === "") {
                              field.onChange(0);
                            } else {
                              const numValue = parseFloat(numericValue);
                              if (!isNaN(numValue)) {
                                field.onChange(numValue);
                              }
                            }
                          }}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lý do</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Nhập lý do hoàn tiền..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Nhập ghi chú..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  isLoadingPayments ||
                  paidPayments.length === 0 ||
                  availableRefundAmount <= 0
                }
              >
                {isSubmitting ? "Đang xử lý..." : "Tạo yêu cầu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
