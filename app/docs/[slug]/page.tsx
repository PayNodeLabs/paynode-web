import React from 'react';
import Link from 'next/link';

// Static Mapping of slugs to content (Simplified for now, can be expanded to dynamic FS reads)
const DOCS_CONTENT: Record<string, { title: string, content: string }> = {
  "protocol": {
    title: "x402 Protocol Standard",
    content: "The PayNode x402 protocol defines a stateless handshake for machine-to-machine payments. When an AI agent requests a resource without a valid receipt, the server responds with a 402 Payment Required status and PayNode-specific headers..."
  },
  "sdk-js": {
    title: "JavaScript SDK",
    content: "Install via npm: npm i @paynodelabs/sdk-js. The SDK provides a requestGate client that handles 402 handshakes automatically."
  },
  "sdk-python": {
    title: "Python SDK",
    content: "Install via pip: pip install paynode-sdk-python. Built on Web3.py, it automates USDC payments and ERC20 approvals for AI agents."
  },
  "contracts": {
    title: "Smart Contracts",
    content: "Base Mainnet Router: 0xA88B5eaD188De39c015AC51F45E1B41D3d95f2bb. Our contracts are stateless and do not store order information, ensuring maximum privacy and scalability."
  }
};

export default function DocDetailPage({ params }: { params: { slug: string } }) {
  const doc = DOCS_CONTENT[params.slug];

  if (!doc) {
    return (
      <div className="bg-black text-[#00FF41] min-h-screen p-20 font-mono">
        <h1 className="text-4xl mb-4 text-red-500">[ 404_DOC_NOT_FOUND ]</h1>
        <Link href="/docs" className="underline">Back to docs index</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#00FF41] font-mono p-8 selection:bg-[#00FF41] selection:text-black">
      <div className="max-w-4xl mx-auto border border-[#00FF41]/30 p-8 shadow-[0_0_20px_rgba(0,255,65,0.1)]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-12 border-b border-[#00FF41]/30 pb-4 text-xs opacity-60">
          <Link href="/docs" className="hover:underline">[ ← ALL_DOCS ]</Link>
          <div className="uppercase">Section: {params.slug}</div>
        </div>

        {/* Content */}
        <article>
          <h1 className="text-3xl font-bold mb-8 uppercase tracking-tighter">
            {doc.title}
          </h1>
          <div className="prose prose-invert prose-emerald leading-relaxed opacity-90 text-sm whitespace-pre-wrap border-l-2 border-[#00FF41]/20 pl-6 py-2">
            {doc.content}
            
            <div className="mt-20 border border-[#00FF41]/20 p-6 bg-[#00FF41]/5">
              <h3 className="font-bold mb-2 uppercase">[ MORE_DATA ]</h3>
              <p className="text-xs opacity-50 mb-4">The full technical documentation is being synchronized from the local agentpay-docs repository. </p>
              <Link href="https://github.com/PayNodeLabs" target="_blank" className="bg-[#00FF41] text-black px-4 py-1 text-xs font-bold hover:bg-white transition-colors">
                GITHUB_REPOSITORY
              </Link>
            </div>
          </div>
        </article>

        {/* Footer */}
        <div className="mt-20 text-center opacity-30 text-[10px]">
          END_OF_DOCUMENT
        </div>
      </div>
    </div>
  );
}
