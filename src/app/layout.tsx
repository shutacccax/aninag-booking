import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import ChatAssistant from "@/components/ChatAssistant";
import { Analytics } from "@vercel/analytics/next";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aninag 2026 | Graduation Scheduler",
  description:
    "Official Yearbook Appointment Scheduler for UP Manila College of Arts and Sciences Batch 2026.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${inter.variable} font-sans antialiased bg-white text-gray-900`}
      >
        <AuthProvider>{children}</AuthProvider>
        <ChatAssistant />
        <Analytics />
      </body>
    </html>
  );
}
