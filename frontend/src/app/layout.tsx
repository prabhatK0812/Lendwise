import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lendwise | Loan Management System",
  description: "Borrower and operations loan management workspace",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
