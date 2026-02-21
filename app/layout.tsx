import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SWRProvider } from "@/contexts/swr-context";
import { RealtimeProvider } from "@/components/realtime-provider";
import { getSettingsAction } from "@/actions/settings";

// Force dynamic rendering since we use cookies (Supabase auth)
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSettingsAction();
    return {
      title: settings?.site_title || "Dashboard Yhotel",
      description: settings?.site_description || "Dashboard for Yhotel",
    };
  } catch {
    // Silently fail during static generation
    return {
      title: "Dashboard Yhotel",
      description: "Dashboard for Yhotel",
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RealtimeProvider>
          <SWRProvider>{children}</SWRProvider>
        </RealtimeProvider>
        <Toaster />
      </body>
    </html>
  );
}
