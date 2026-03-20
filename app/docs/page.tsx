import React from 'react';
import Link from 'next/link';

const DOCS_SECTIONS = [
  {
    title: "The x402 Protocol",
    description: "Deep dive into the stateless HTTP 402 handshake and on-chain settlement logic.",
    link: "/docs/protocol",
    icon: "📜"
  },
  {
    title: "Architecture Guide",
    description: "Understand the high-level architecture: Router, Merchant, and AI Agents.",
    link: "/docs/architecture",
    icon: "🏗️"
  },
  {
    title: "Developer Setup",
    description: "Build your local environment and deploy your first PayNode node.",
    link: "/docs/setup",
    icon: "🛠️"
  },
  {
    title: "SDKs & Integration",
    description: "How to use our Python and JS SDKs to empower your AI agents.",
    link: "/docs/protocol", // Reusing protocol for now or create a specific one
    icon: "📦"
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
            DOCS_HUB
          </h1>
          <Link href="/pom" className="text-xs hover:underline opacity-70">
            [ EXIT_TO_EXPLORER ]
          </Link>
        </div>

        {/* Hero */}
        <div className="mb-16">
          <p className="text-xl leading-relaxed opacity-90 italic border-l-4 border-[#00FF41] pl-6 py-2">
            "The infrastructure for the agentic economy."
          </p>
        </div>

        {/* Sections Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {DOCS_SECTIONS.map((section, idx) => (
            <Link 
              key={idx} 
              href={section.link}
              className="group border border-[#00FF41]/20 p-6 hover:bg-[#00FF41]/5 transition-all hover:border-[#00FF41]/50 cursor-pointer relative overflow-hidden"
            >
              {/* Decorative Matrix Scan Line (CSS Animation) */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-[#00FF41]/30 -translate-y-full group-hover:translate-y-[200px] transition-all duration-1000"></div>
              
              <div className="text-3xl mb-4 grayscale group-hover:grayscale-0 transition-all">{section.icon}</div>
              <h2 className="text-xl font-bold mb-2 group-hover:text-white transition-colors uppercase tracking-widest">
                {section.title}
              </h2>
              <p className="text-[11px] opacity-60 leading-relaxed uppercase">
                {section.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Manual Footer */}
        <div className="mt-16 pt-8 border-t border-[#00FF41]/10 flex justify-between items-center opacity-40 text-[10px] uppercase tracking-widest">
          <div>© 2026 PAYNODE_LABS</div>
          <div className="flex gap-6">
            <Link href="https://github.com/PayNodeLabs" className="hover:text-[#00FF41]">GITHUB</Link>
            <Link href="https://x.com" className="hover:text-[#00FF41]">TWITTER</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
