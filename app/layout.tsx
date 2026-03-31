import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";


export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://paynode.dev'),
  title: "PayNode | The Agent-to-Machine Payment Protocol",
  description: "Non-custodial, stateless HTTP 402 middleware for AI agents on Base L2. Monetize APIs with the x402 Agentic Payment Protocol.",
  keywords: [
    "x402 protocol",
    "Agentic Payment Protocol",
    "AI Agent Payments",
    "HTTP 402 middleware",
    "Base L2 payments",
    "USDC payments",
    "autonomous payments",
    "machine-to-machine payments",
    "web3 payments for AI"
  ],
  alternates: {
    canonical: "https://paynode.dev",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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
    description: "The official middleware for the x402 protocol. Enabling autonomous API payments on Base L2.",
    url: "https://paynode.dev",
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "PayNode",
  "operatingSystem": "Web-based",
  "applicationCategory": "Payment Application",
  "description": "Non-custodial, stateless HTTP 402 middleware for AI agents on Base L2.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "url": "https://paynode.dev"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-043BKCFT35"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-043BKCFT35');
          `}
        </Script>
      </head>
      <body className="bg-[#050505] text-white antialiased min-h-screen font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
