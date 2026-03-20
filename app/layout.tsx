import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayNode | The Agent-to-Machine Payment Protocol",
  description: "Non-custodial, stateless HTTP 402 middleware for AI agents on Base L2.",
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
      </body>
    </html>
  );
}
