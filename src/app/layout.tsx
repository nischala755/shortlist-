import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "EvidenceHire — Hiring decisions grounded in evidence",
    template: "%s · EvidenceHire",
  },
  description: "An evidence-driven applicant tracking system for structured, human-led hiring decisions.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
