import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alizane Labs — Restoration Outreach CRM & Conversion Desk Engine",
  description: "Collaborative multi-channel outreach engine with real-time Neon Postgres sync",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}

