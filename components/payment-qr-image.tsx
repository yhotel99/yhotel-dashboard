import Image from "next/image";

type PaymentQrImageProps = {
  src: string;
  alt?: string;
  width: number;
  height: number;
  className?: string;
};

/**
 * SePay QR URLs are dynamic third-party images; bypass Next.js optimizer
 * (/_next/image proxy often fails for qr.sepay.vn).
 */
export function PaymentQrImage({
  src,
  alt = "QR Code thanh toán",
  width,
  height,
  className,
}: PaymentQrImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized
    />
  );
}
