import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "./providers";
import ToastContainer from "../components/ToastContainer";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "CoolStaff Foreign Employment Agency",
  description: "CoolStaff Employment Agency - Connecting Ethiopian talent with Gulf country opportunities through reliable, professional recruitment services.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        <QueryProvider>
          {children}
          <ToastContainer />
        </QueryProvider>
      </body>
    </html>
  );
}
 