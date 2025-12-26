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
import { usePayments } from "@/hooks/use-payments";
import { createRefundRequestAction } from "@/actions/refund-requests";
import type { BookingRecord } from "@/lib/types";
import { PAYMENT_STATUS } from "@/lib/constants";
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
        `Số tiền không được vượt quá ${new Intl.NumberFormat("vi-VN").format(
          maxAmount
        )} VNĐ`
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
  const { payments: allPayments, isLoading: isLoadingPayments } = usePayments({
    bookingId: open ? booking.id : null,
    page: 1,
    limit: 100, // Get all payments for the booking
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Filter eligible payments (only PAID)
  const paidPayments = React.useMemo(() => {
    return allPayments.filter((p) => p.payment_status === PAYMENT_STATUS.PAID);
  }, [allPayments]);

  // Calculate total paid amount
  const totalPaidAmount = React.useMemo(() => {
    return paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [paidPayments]);

  // Create schema with max amount validation
  const refundRequestSchema = React.useMemo(
    () => createRefundRequestSchema(totalPaidAmount),
    [totalPaidAmount]
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

      // Validate amount against total paid amount
      if (values.amount > totalPaidAmount) {
        form.setError("amount", {
          message: `Số tiền không được vượt quá ${new Intl.NumberFormat(
            "vi-VN"
          ).format(totalPaidAmount)} VNĐ`,
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
            ) : paidPayments.length === 0 ? (
              <div className="text-sm text-destructive">
                Không có thanh toán nào để hoàn tiền
              </div>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Số tiền hoàn lại{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          (Tối đa:{" "}
                          {new Intl.NumberFormat("vi-VN").format(
                            totalPaidAmount
                          )}{" "}
                          VNĐ)
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
                  isSubmitting || isLoadingPayments || paidPayments.length === 0
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
