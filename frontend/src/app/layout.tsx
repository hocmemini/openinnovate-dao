import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenInnovate DAO LLC — A Live Governance Experiment",
  description:
    "A Wyoming-registered legal entity whose material operational decisions are evaluated by a constitutionally constrained AI against a 155-document corpus. Reasoning trees, alignment scores, and human overrides are published in real time and cryptographically anchored on Base L2. A research artifact, not a product.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
