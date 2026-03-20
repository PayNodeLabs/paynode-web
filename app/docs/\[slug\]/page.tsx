import React from 'react';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

/**
 * 🛠️ PAYNODE NATIVE DOCS RENDERER
 * -------------------------------
 * This page reads markdown files from the filesystem (apps/merchant-dashboard/content/docs/)
 * and renders them in the Geek-Matrix theme.
 */

export default async function DocDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  
  // 1. Resolve File Path
  const docsDir = path.join(process.cwd(), 'content', 'docs');
  const filePath = path.join(docsDir, `${slug}.md`);

  let content = "";
  let title = slug.toUpperCase().replace('-', ' ');

  try {
    // 2. Read Local Markdown
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf8');
      
      // Basic Title Extraction from # Header
      const match = content.match(/^#\s+(.*)/m);
      if (match) title = match[1];
    } else {
      throw new Error("File not found");
    }
  } catch (error) {
    return (
      <div className="bg-black text-red-500 min-h-screen p-20 font-mono border border-red-500">
        <h1 className="text-3xl mb-4 uppercase">[ DOC_NOT_FOUND: {slug} ]</h1>
        <p className="mb-8 opacity-60">The requested resource could not be resolved in /content/docs/.</p>
        <Link href="/docs" className="underline text-[#00FF41]">BACK_TO_INDEX</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#00FF41] font-mono p-8 selection:bg-[#00FF41] selection:text-black">
      <div className="max-w-4xl mx-auto border border-[#00FF41]/30 p-8 shadow-[0_0_20px_rgba(0,255,65,0.1)]">
        
        {/* Header Navigation */}
        <div className="flex justify-between items-center mb-12 border-b border-[#00FF41]/30 pb-4 text-[10px] opacity-40 uppercase tracking-widest">
          <Link href="/docs" className="hover:text-white transition-colors">[ ← BACK_TO_DOCS ]</Link>
          <div className="flex gap-4">
            <span>VER: 1.0.1</span>
            <span>STATUS: VERIFIED</span>
          </div>
        </div>

        {/* The Document Body */}
        <article className="relative">
          {/* Subtle Decorative Background Lines */}
          <div className="absolute -left-4 top-0 bottom-0 w-[1px] bg-[#00FF41]/10"></div>
          
          <h1 className="text-4xl font-bold mb-10 uppercase tracking-tighter leading-none">
            {title}
          </h1>

          {/* Render Markdown Content as Pre-formatted (Maintains raw MD beauty in Geek style) */}
          <div className="prose-custom whitespace-pre-wrap leading-relaxed opacity-80 text-sm pl-4">
            {content}
          </div>

          {/* CTA / Footer of the Doc */}
          <div className="mt-20 pt-10 border-t border-[#00FF41]/10">
            <div className="bg-[#00FF41]/5 p-6 border border-[#00FF41]/20">
              <h4 className="text-xs font-bold mb-2 uppercase tracking-widest">[ BUILD_WITH_PAYNODE ]</h4>
              <p className="text-[10px] opacity-50 mb-4 uppercase">
                Ready to deploy your agent? Use our SDKs to integrate x402 handshakes.
              </p>
              <div className="flex gap-4">
                <Link href="/docs/setup" className="bg-[#00FF41] text-black px-4 py-1 text-[10px] font-bold hover:bg-white transition-colors">GET_STARTED</Link>
                <Link href="https://github.com/PayNodeLabs" target="_blank" className="border border-[#00FF41] px-4 py-1 text-[10px] hover:bg-[#00FF41]/10 transition-colors">GITHUB_REPOS</Link>
              </div>
            </div>
          </div>
        </article>

        <div className="mt-12 text-center opacity-20 text-[8px] uppercase tracking-[0.5em]">
          End of Transmission // PayNode Intelligence Layer
        </div>
      </div>
    </div>
  );
}
