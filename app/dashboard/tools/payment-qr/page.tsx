import { QrCode } from "lucide-react";
import { PaymentQrGenerator } from "@/components/tools/payment-qr-generator";

export default function PaymentQrToolPage() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 max-w-5xl w-full mx-auto">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <QrCode className="size-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Tạo mã QR thanh toán
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Tạo mã chuyển khoản nhanh cho khách.
          </p>
        </div>
      </div>
      <PaymentQrGenerator />
    </div>
  );
}
