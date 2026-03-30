import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";


export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'),
  title: "PayNode | The Agent-to-Machine Payment Protocol",
  description: "Non-custodial, stateless HTTP 402 middleware for AI agents on Base L2.",
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "PayNode | The Agent-to-Machine Payment Protocol",
    description: "Non-custodial, stateless HTTP 402 middleware for AI agents on Base L2.",
    url: "https://paynode.io",
    siteName: "PayNode",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PayNode | POM Explorer",
    description: "Real-time Agent-to-Machine payment settlements on Base L2.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="bg-[#050505] text-white antialiased min-h-screen font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
