import React from 'react';
import Link from 'next/link';

const DOCS_SECTIONS = [
  {
    title: "Protocol (x402)",
    description: "Deep dive into the stateless HTTP 402 handshake and on-chain settlement logic.",
    link: "/docs/protocol",
    icon: "📜"
  },
  {
    title: "SDK - JavaScript",
    description: "Integrate PayNode into your Node.js or browser-based AI agents.",
    link: "/docs/sdk-js",
    icon: "📦"
  },
  {
    title: "SDK - Python",
    description: "The official Python SDK for autonomous agentic payments on Base.",
    link: "/docs/sdk-python",
    icon: "🐍"
  },
  {
    title: "Smart Contracts",
    description: "Router addresses, ABIs, and Base L2 deployment details.",
    link: "/docs/contracts",
    icon: "⛓️"
  }
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-[#00FF41] font-mono p-8 selection:bg-[#00FF41] selection:text-black">
      <div className="max-w-4xl mx-auto border border-[#00FF41]/30 p-8 shadow-[0_0_20px_rgba(0,255,65,0.1)]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-12 border-b border-[#00FF41]/30 pb-4">
          <h1 className="text-3xl font-bold tracking-tighter uppercase">
            <span className="bg-[#00FF41] text-black px-2 mr-2">PAYNODE</span> 
            DOCUMENTATION
          </h1>
          <Link href="/pom" className="text-xs hover:underline opacity-70">
            [ BACK TO EXPLORER ]
          </Link>
        </div>

        {/* Hero */}
        <div className="mb-16">
          <p className="text-xl leading-relaxed opacity-90 italic">
            "Enabling AI agents to pay and get paid, autonomously, securely, and statelessly."
          </p>
        </div>

        {/* Sections Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {DOCS_SECTIONS.map((section, idx) => (
            <Link 
              key={idx} 
              href={section.link}
              className="group border border-[#00FF41]/20 p-6 hover:bg-[#00FF41]/5 transition-all hover:border-[#00FF41]/50 cursor-pointer"
            >
              <div className="text-3xl mb-4">{section.icon}</div>
              <h2 className="text-xl font-bold mb-2 group-hover:text-white transition-colors uppercase tracking-widest">
                {section.title}
              </h2>
              <p className="text-sm opacity-60 leading-relaxed">
                {section.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-[#00FF41]/10 text-center opacity-40 text-xs">
          PAYNODE LABS © 2026 | BUILT FOR THE AGENTIC WEB3
        </div>
      </div>
    </div>
  );
}
