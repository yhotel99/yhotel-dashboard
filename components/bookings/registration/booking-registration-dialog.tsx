"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconDownload, IconLoader2, IconPrinter } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getBookingRegistrationFormAction } from "@/actions/bookings";
import type { RegistrationFormData } from "@/lib/booking-registration/types";
import { RegistrationFormPreview } from "./registration-form-preview";
import { toast } from "sonner";

interface BookingRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingCode: string;
}

export function BookingRegistrationDialog({
  open,
  onOpenChange,
  bookingId,
  bookingCode,
}: BookingRegistrationDialogProps) {
  const [data, setData] = useState<RegistrationFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !bookingId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setData(null);

    void getBookingRegistrationFormAction(bookingId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setData(result.data);
      } else {
        setError(result.message);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, bookingId]);

  const handleDownloadPdf = useCallback(async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(
        `/api/bookings/${bookingId}/registration-form`
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Không thể tải PDF");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `giay-dang-ky-${bookingCode}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải PDF thành công");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể tải PDF"
      );
    } finally {
      setIsDownloading(false);
    }
  }, [bookingId, bookingCode]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex max-h-[95vh] w-[98vw] max-w-[900px]! flex-col gap-0 overflow-hidden p-0 sm:max-w-[900px]!">
        <DialogHeader className="no-print shrink-0 border-b px-6 py-4">
          <DialogTitle>Giấy đăng ký đặt phòng</DialogTitle>
          <DialogDescription>
            Mã booking: {bookingCode}
          </DialogDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!data || isLoading}
            >
              <IconPrinter className="mr-2 size-4" />
              In
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={!data || isLoading || isDownloading}
            >
              {isDownloading ? (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <IconDownload className="mr-2 size-4" />
              )}
              Tải PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea
            type="always"
            className="h-[calc(95vh-11rem)] w-full [&>[data-slot=scroll-area-viewport]]:h-full"
          >
            <div ref={printRef} className="p-4 md:p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <IconLoader2 className="mr-2 size-5 animate-spin" />
                  Đang tải giấy đăng ký...
                </div>
              ) : error ? (
                <div className="py-16 text-center text-destructive">{error}</div>
              ) : data ? (
                <RegistrationFormPreview data={data} />
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
