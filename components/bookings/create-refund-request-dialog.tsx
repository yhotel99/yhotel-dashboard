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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePaymentsByBookingIdQuery } from "@/hooks/use-payments-query";
import { createRefundRequest } from "@/services/refund-requests";
import type { BookingRecord } from "@/lib/types";
import { PAYMENT_STATUS, paymentTypeLabels } from "@/lib/constants";
import { toast } from "sonner";

const refundRequestSchema = z.object({
  payment_id: z.string().nullable(),
  amount: z
    .number({
      message: "Vui lòng nhập số tiền",
    })
    .positive("Số tiền phải lớn hơn 0"),
  reason: z.string().optional(),
  note: z.string().optional(),
});

type RefundRequestFormValues = z.infer<typeof refundRequestSchema>;

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
  const { payments: allPayments, isLoading: isLoadingPayments } =
    usePaymentsByBookingIdQuery(open ? booking.id : null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<RefundRequestFormValues>({
    resolver: zodResolver(refundRequestSchema),
    defaultValues: {
      payment_id: null,
      amount: 0,
      reason: "",
      note: "",
    },
  });

  const selectedPaymentId = form.watch("payment_id");

  // Filter eligible payments (only PAID or REFUNDED)
  const payments = React.useMemo(() => {
    return allPayments.filter(
      (p) =>
        p.payment_status === PAYMENT_STATUS.PAID ||
        p.payment_status === PAYMENT_STATUS.REFUNDED
    );
  }, [allPayments]);

  // Auto-select first payment when payments are loaded
  React.useEffect(() => {
    if (open && payments.length === 1 && !selectedPaymentId) {
      form.setValue("payment_id", payments[0].id);
      form.setValue("amount", payments[0].amount);
    }
  }, [open, payments, selectedPaymentId, form]);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  // Update amount when payment changes
  React.useEffect(() => {
    if (selectedPaymentId) {
      const payment = payments.find((p) => p.id === selectedPaymentId);
      if (payment) {
        form.setValue("amount", payment.amount);
      }
    }
  }, [selectedPaymentId, payments, form]);

  const onSubmit = async (values: RefundRequestFormValues) => {
    try {
      setIsSubmitting(true);

      // Validate amount against selected payment
      if (values.payment_id) {
        const selectedPayment = payments.find(
          (p) => p.id === values.payment_id
        );
        if (selectedPayment && values.amount > selectedPayment.amount) {
          form.setError("amount", {
            message: `Số tiền không được vượt quá ${new Intl.NumberFormat(
              "vi-VN"
            ).format(selectedPayment.amount)} VNĐ`,
          });
          return;
        }
      }

      await createRefundRequest({
        booking_id: booking.id,
        payment_id: values.payment_id,
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

  const selectedPayment = selectedPaymentId
    ? payments.find((p) => p.id === selectedPaymentId)
    : null;

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
            <FormField
              control={form.control}
              name="payment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thanh toán</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn thanh toán" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingPayments ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Đang tải...
                        </div>
                      ) : payments.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Không có thanh toán nào
                        </div>
                      ) : (
                        payments.map((payment) => (
                          <SelectItem key={payment.id} value={payment.id}>
                            {paymentTypeLabels[payment.payment_type]} -{" "}
                            {new Intl.NumberFormat("vi-VN").format(
                              payment.amount
                            )}{" "}
                            VNĐ
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Số tiền hoàn lại{" "}
                    {selectedPayment && (
                      <span className="text-muted-foreground text-xs">
                        (Tối đa:{" "}
                        {new Intl.NumberFormat("vi-VN").format(
                          selectedPayment.amount
                        )}{" "}
                        VNĐ)
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={isSubmitting || payments.length === 0}
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
