import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel serverless không tự copy public/ vào function — phải khai báo rõ
  // để @react-pdf/renderer đọc được font và logo khi render PDF.
  outputFileTracingIncludes: {
    "/api/bookings/[id]/registration-form": [
      "./public/fonts/**/*",
      "./public/logn.png",
    ],
  },
  images: {
    // Ít breakpoint hơn mặc định → ít biến thể width được generate (tiết kiệm transformation).
    deviceSizes: [640, 828, 1080],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "rnuuftucapucuavqlgbx.supabase.co",
      },
      {
        protocol: "https",
        hostname: "wqadavcddtdocdqxnony.supabase.co"
      },
      {
        protocol: "https",
        hostname: "qr.sepay.vn",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  /* config options here */
};

export default nextConfig;
