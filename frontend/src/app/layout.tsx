import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HEXNS Mediaworks — Billing & Quotation Software",
  description: "Enterprise billing, quotation, invoicing, and financial management system for HEXNS Mediaworks",
};

import { CrmProvider } from "../context/CrmContext";
import { AppShell } from "../components/layout/AppShell";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <CrmProvider>
          <AppShell>
            {children}
          </AppShell>
        </CrmProvider>
      </body>
    </html>
  );
}
