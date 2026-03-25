import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenInnovate DAO — Governance Transparency",
  description:
    "AI-augmented direct democracy on Base L2. Every governance decision is evaluated against a constitutional corpus, scored for Maxim alignment, and recorded on-chain.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
