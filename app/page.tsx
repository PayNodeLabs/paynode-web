"use client";

import React, { useState } from "react";
import {
  Terminal,
  Zap,
  Code2,
  ExternalLink,
  ChevronRight,
  Database,
  Globe,
  Copy,
  Check
} from "lucide-react";

// --- Components ---

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for non-secure contexts or older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center justify-center gap-1.5 transition-all px-2 py-1 rounded-md text-[12px] font-mono border w-[72px] ${copied
        ? "border-[#00ff88]/50 text-[#00ff88] bg-[#00ff88]/5"
        : "border-white/10 text-gray-400 hover:border-white/30 hover:text-white bg-white/5"
        }`}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      <span>{copied ? "COPIED" : "COPY"}</span>
    </button>
  );
};

const Navbar = () => (
  <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-md px-6 py-4 flex items-center">
    <div className="flex-1 flex items-center gap-2">
      <svg width="200" height="36" viewBox="0 0 795 143" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M37.1 116.2C30.0067 116.2 23.66 114.94 18.06 112.42C12.46 109.9 8.02667 106.12 4.76 101.08C1.58667 95.9467 -1.16229e-06 89.5533 -1.16229e-06 81.9V78.96H11.62V81.9C11.62 90.02 14 96.0867 18.76 100.1C23.52 104.02 29.6333 105.98 37.1 105.98C44.7533 105.98 50.5867 104.253 54.6 100.8C58.6133 97.3467 60.62 93.0067 60.62 87.78C60.62 84.14 59.7333 81.2467 57.96 79.1C56.1867 76.9533 53.6667 75.2267 50.4 73.92C47.1333 72.52 43.3067 71.3067 38.92 70.28L31.5 68.46C25.8067 66.9667 20.7667 65.1467 16.38 63C11.9933 60.8533 8.54 58.0533 6.02 54.6C3.59333 51.0533 2.38 46.5267 2.38 41.02C2.38 35.5133 3.78 30.7533 6.58 26.74C9.38 22.7267 13.2533 19.6467 18.2 17.5C23.1467 15.3533 28.9333 14.28 35.56 14.28C42.1867 14.28 48.1133 15.4467 53.34 17.78C58.5667 20.02 62.72 23.38 65.8 27.86C68.88 32.2466 70.42 37.8 70.42 44.52V50.4H58.8V44.52C58.8 39.76 57.7733 35.9333 55.72 33.04C53.76 30.1467 51.0067 28 47.46 26.6C44.0067 25.2 40.04 24.5 35.56 24.5C29.12 24.5 23.94 25.9467 20.02 28.84C16.1 31.64 14.14 35.6533 14.14 40.88C14.14 44.3333 14.9333 47.1333 16.52 49.28C18.2 51.4267 20.58 53.2 23.66 54.6C26.74 55.9067 30.4267 57.0733 34.72 58.1L42.14 59.92C47.74 61.1333 52.8267 62.8133 57.4 64.96C61.9733 67.0133 65.5667 69.86 68.18 73.5C70.8867 77.0467 72.24 81.7133 72.24 87.5C72.24 93.2867 70.7933 98.3267 67.9 102.62C65.0067 106.913 60.9 110.273 55.58 112.7C50.3533 115.033 44.1933 116.2 37.1 116.2ZM31.78 130.48V-1.5974e-05H42.56V130.48H31.78ZM89.9194 131.32V121.1H155.159V131.32H89.9194Z" fill="#00FF88" />
        <path d="M213.533 142.24V45.78H224.313V57.12H226.273C228.046 53.6667 230.893 50.5867 234.813 47.88C238.826 45.1733 244.379 43.82 251.473 43.82C257.353 43.82 262.719 45.2667 267.573 48.16C272.519 50.96 276.439 54.9733 279.333 60.2C282.319 65.4267 283.813 71.7267 283.813 79.1V80.92C283.813 88.2 282.366 94.5 279.473 99.82C276.579 105.14 272.659 109.2 267.713 112C262.859 114.8 257.446 116.2 251.473 116.2C246.713 116.2 242.653 115.547 239.293 114.24C236.026 113.027 233.366 111.44 231.313 109.48C229.259 107.52 227.673 105.513 226.553 103.46H224.593V142.24H213.533ZM248.533 106.4C255.626 106.4 261.366 104.16 265.753 99.68C270.233 95.1067 272.473 88.76 272.473 80.64V79.38C272.473 71.26 270.233 64.96 265.753 60.48C261.366 55.9067 255.626 53.62 248.533 53.62C241.533 53.62 235.746 55.9067 231.173 60.48C226.693 64.96 224.453 71.26 224.453 79.38V80.64C224.453 88.76 226.693 95.1067 231.173 99.68C235.746 104.16 241.533 106.4 248.533 106.4ZM324.63 116.2C319.87 116.2 315.53 115.36 311.61 113.68C307.69 112 304.61 109.573 302.37 106.4C300.13 103.227 299.01 99.3533 299.01 94.78C299.01 90.1133 300.13 86.2867 302.37 83.3C304.61 80.22 307.69 77.9333 311.61 76.44C315.53 74.8533 319.917 74.06 324.77 74.06H347.87V69.02C347.87 64.1667 346.424 60.34 343.53 57.54C340.73 54.74 336.53 53.34 330.93 53.34C325.424 53.34 321.13 54.6933 318.05 57.4C314.97 60.0133 312.87 63.56 311.75 68.04L301.39 64.68C302.51 60.8533 304.284 57.4 306.71 54.32C309.137 51.1467 312.357 48.6267 316.37 46.76C320.477 44.8 325.377 43.82 331.07 43.82C339.844 43.82 346.657 46.1067 351.51 50.68C356.364 55.16 358.79 61.5067 358.79 69.72V100.66C358.79 103.46 360.097 104.86 362.71 104.86H369.01V114.24H359.35C356.27 114.24 353.797 113.4 351.93 111.72C350.064 109.947 349.13 107.613 349.13 104.72V104.02H347.45C346.424 105.793 345.024 107.66 343.25 109.62C341.57 111.487 339.237 113.027 336.25 114.24C333.264 115.547 329.39 116.2 324.63 116.2ZM325.89 106.68C332.424 106.68 337.697 104.767 341.71 100.94C345.817 97.02 347.87 91.56 347.87 84.56V83.02H325.19C320.804 83.02 317.164 84 314.27 85.96C311.47 87.8267 310.07 90.6733 310.07 94.5C310.07 98.3267 311.517 101.313 314.41 103.46C317.397 105.607 321.224 106.68 325.89 106.68ZM390.64 142.24V132.44H429.84C432.547 132.44 433.9 131.04 433.9 128.24V103.32H431.94C431.007 105.28 429.56 107.24 427.6 109.2C425.734 111.067 423.26 112.607 420.18 113.82C417.1 114.94 413.227 115.5 408.56 115.5C403.614 115.5 399.04 114.427 394.84 112.28C390.734 110.133 387.467 106.96 385.04 102.76C382.707 98.56 381.54 93.4267 381.54 87.36V45.78H392.6V86.52C392.6 93.24 394.28 98.14 397.64 101.22C401.094 104.3 405.714 105.84 411.5 105.84C418.034 105.84 423.4 103.693 427.6 99.4C431.8 95.1067 433.9 88.7133 433.9 80.22V45.78H444.96V130.2C444.96 133.933 443.887 136.873 441.74 139.02C439.687 141.167 436.654 142.24 432.64 142.24H390.64ZM468.103 114.24V45.78H478.883V57.4H480.843C482.336 54.1333 484.856 51.1933 488.403 48.58C492.043 45.8733 497.363 44.52 504.363 44.52C509.496 44.52 514.07 45.5933 518.083 47.74C522.19 49.8867 525.456 53.06 527.883 57.26C530.31 61.46 531.523 66.64 531.523 72.8V114.24H520.463V73.64C520.463 66.8267 518.736 61.88 515.283 58.8C511.923 55.72 507.35 54.18 501.563 54.18C494.936 54.18 489.523 56.3267 485.323 60.62C481.216 64.9133 479.163 71.3067 479.163 79.8V114.24H468.103ZM585.603 116.2C578.696 116.2 572.583 114.753 567.262 111.86C562.036 108.967 557.929 104.907 554.942 99.68C552.049 94.36 550.602 88.1067 550.602 80.92V79.1C550.602 72.0067 552.049 65.8 554.942 60.48C557.929 55.16 562.036 51.0533 567.262 48.16C572.583 45.2667 578.696 43.82 585.603 43.82C592.509 43.82 598.576 45.2667 603.803 48.16C609.123 51.0533 613.229 55.16 616.123 60.48C619.109 65.8 620.603 72.0067 620.603 79.1V80.92C620.603 88.1067 619.109 94.36 616.123 99.68C613.229 104.907 609.123 108.967 603.803 111.86C598.576 114.753 592.509 116.2 585.603 116.2ZM585.603 106.26C592.883 106.26 598.669 103.973 602.963 99.4C607.349 94.7333 609.543 88.48 609.543 80.64V79.38C609.543 71.54 607.349 65.3333 602.963 60.76C598.669 56.0933 592.883 53.76 585.603 53.76C578.416 53.76 572.629 56.0933 568.242 60.76C563.856 65.3333 561.663 71.54 561.663 79.38V80.64C561.663 88.48 563.856 94.7333 568.242 99.4C572.629 103.973 578.416 106.26 585.603 106.26ZM669.485 116.2C663.605 116.2 658.192 114.8 653.245 112C648.299 109.2 644.379 105.14 641.485 99.82C638.592 94.5 637.145 88.2 637.145 80.92V79.1C637.145 71.82 638.592 65.5667 641.485 60.34C644.379 55.02 648.252 50.96 653.105 48.16C658.052 45.2667 663.512 43.82 669.485 43.82C674.245 43.82 678.259 44.4733 681.525 45.78C684.885 46.9933 687.592 48.58 689.645 50.54C691.699 52.4067 693.285 54.4133 694.405 56.56H696.365V16.24H707.425V114.24H696.645V102.9H694.685C692.819 106.353 689.925 109.433 686.005 112.14C682.085 114.847 676.579 116.2 669.485 116.2ZM672.425 106.4C679.519 106.4 685.259 104.16 689.645 99.68C694.125 95.1067 696.365 88.76 696.365 80.64V79.38C696.365 71.26 694.125 64.96 689.645 60.48C685.259 55.9067 679.519 53.62 672.425 53.62C665.425 53.62 659.639 55.9067 655.065 60.48C650.585 64.96 648.345 71.26 648.345 79.38V80.64C648.345 88.76 650.585 95.1067 655.065 99.68C659.639 104.16 665.425 106.4 672.425 106.4ZM761.963 116.2C755.056 116.2 748.99 114.753 743.763 111.86C738.536 108.873 734.476 104.72 731.583 99.4C728.69 94.08 727.243 87.92 727.243 80.92V79.24C727.243 72.1467 728.69 65.94 731.583 60.62C734.476 55.3 738.49 51.1933 743.623 48.3C748.756 45.3133 754.636 43.82 761.263 43.82C767.703 43.82 773.396 45.22 778.343 48.02C783.29 50.7267 787.163 54.6467 789.963 59.78C792.763 64.9133 794.163 70.9333 794.163 77.84V82.88H738.303C738.583 90.2533 740.963 96.04 745.443 100.24C749.923 104.347 755.523 106.4 762.243 106.4C768.123 106.4 772.65 105.047 775.823 102.34C778.996 99.6333 781.423 96.4133 783.103 92.68L792.623 97.3C791.223 100.193 789.263 103.087 786.743 105.98C784.316 108.873 781.096 111.3 777.083 113.26C773.163 115.22 768.123 116.2 761.963 116.2ZM738.443 73.78H782.963C782.59 67.4333 780.396 62.4867 776.383 58.94C772.463 55.3933 767.423 53.62 761.263 53.62C755.01 53.62 749.876 55.3933 745.863 58.94C741.85 62.4867 739.376 67.4333 738.443 73.78Z" fill="white" />
      </svg>
    </div>
    <div className="hidden md:flex gap-8 text-sm text-gray-400 font-medium">
      <a href="#simulator" className="hover:text-[#00ff88] transition-colors">Simulator</a>
      <a href="#stats" className="hover:text-[#00ff88] transition-colors">Mainnet Stats</a>
      <a href="#sdk" className="hover:text-[#00ff88] transition-colors">SDK</a>
      <a href="https://docs.paynode.dev" className="hover:text-[#00ff88] transition-colors flex items-center gap-1">Docs <ExternalLink size={14} /></a>
    </div>
    <div className="flex-1 flex justify-end">
      <button className="text-xs bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:bg-white/10 transition-all font-mono">
        0x92e2...b200
      </button>
    </div>
  </nav>
);

const Hero = () => (
  <section className="relative pt-40 pb-20 px-6 flex flex-col items-center text-center overflow-hidden">
    <div className="absolute top-0 w-full h-full bg-grid -z-10" />
    <div className="absolute top-20 w-[600px] h-[600px] bg-[#00ff88]/10 blur-[120px] rounded-full -z-10 opacity-50" />

    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-xs font-mono mb-8 animate-pulse">
      <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
      AGENT-TO-MACHINE PROTOCOL LIVE ON BASE MAINNET
    </div>

    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl">
      The Payment Gateway <br />
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff88] to-[#00b2ff] text-glow">
        for AI Agents.
      </span>
    </h1>

    <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-12">
      Drop-in x402 middleware. Let your AI autonomously pay for APIs with USDC on Base L2.
      No KYC, No custodial risk, 100% Deterministic.
    </p>

    <div className="flex flex-col sm:flex-row gap-4">
      <button
        onClick={() => document.getElementById('simulator')?.scrollIntoView({ behavior: 'smooth' })}
        className="px-8 py-4 bg-[#00ff88] text-black font-bold rounded-xl btn-glow flex items-center gap-2 hover:scale-105"
      >
        <Zap size={18} fill="currentColor" /> Run Simulator
      </button>
      <a
        href="https://docs.paynode.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center"
      >
        Read the Docs
      </a>
    </div>
  </section>
);

const Simulator = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [agentName, setAgentName] = useState("Agent-1097");

  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setLogs([]);

    const steps = [
      "📡 Intercepting outgoing API request...",
      "HTTP/1.1 402 Payment Required",
      "🔍 Resolving PayNode-Router-Address: 0x92e2...b200",
      "🔐 Agent checking wallet allowance (USDC/Base)...",
      `💸 Initiating POM Tx for ${agentName}...`,
      "⏳ Mining on Base L2...",
      "✅ Proof-of-Management (POM) Generated.",
      "🚀 Resubmitting request with X-POM-V1 header.",
      "🎉 Access Granted: Welcome to the Matrix."
    ];

    steps.forEach((step, i) => {
      setTimeout(() => {
        setLogs(prev => [...prev, step]);
        if (i === steps.length - 1) setIsSimulating(false);
      }, i * 600);
    });
  };

  return (
    <section id="simulator" className="py-24 px-6 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <div className="flex items-center text-[#00ff88] font-mono">
              <span className="text-glow">$</span>
              <span className="animate-pulse">_</span>
            </div>
            Experience x402 in Seconds.
          </h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            AI agents don&apos;t have credit cards. PayNode turns standard HTTP 402 errors into deterministic USDC payments.
            Try the simulated payment flow without spending a cent.
          </p>
          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Enter Agent Name"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-[#00ff88]/50 transition-colors"
            />
            <button
              disabled={isSimulating}
              onClick={runSimulation}
              className="px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              {isSimulating ? "Simulating..." : "Execute 402 Payment"} <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="terminal-window rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <div className="bg-white/5 p-4 border-b border-white/5 flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
          </div>
          <div className="p-6 font-mono text-sm h-[300px] overflow-y-auto">
            {logs.length === 0 && (
              <div className="text-gray-600 animate-pulse">Waiting for execution...</div>
            )}
            {logs.map((log, i) => (
              <div key={i} className={`mb-2 ${log.startsWith('✅') || log.startsWith('🎉') ? 'text-[#00ff88]' : 'text-gray-300'}`}>
                <span className="text-[#00ff88]/50 mr-2">$</span> {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const StatsBoard = () => {
  return (
    <section id="stats" className="py-24 bg-white/[0.02] border-y border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
          <div className="max-w-xl">
            <div className="text-xs font-mono text-[#00ff88] mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              Protocol Status: Deployed on Base Mainnet
            </div>
            <h2 className="text-4xl font-bold mb-6">Protocol Status</h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              The PayNode protocol is deterministically deployed on Base Mainnet via CREATE2. Contract addresses are consistent across all EVM chains, ensuring deterministic addressing for Agent payments.
            </p>
          </div>
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <a
              href="/pom"
              className="px-8 py-4 bg-[#00ff88] text-black font-bold rounded-xl btn-glow flex items-center justify-center gap-2 hover:scale-105 transition-all"
            >
              Enter Explorer <ChevronRight size={20} />
            </a>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 font-mono text-[12px] text-gray-500 flex items-center justify-between gap-4">
              <span className="truncate">Router: 0x92e20164FC457a2aC35f53D06268168e6352b200</span>
              <CopyButton text="0x92e20164FC457a2aC35f53D06268168e6352b200" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-[#00ff88]/30 transition-all group">
            <div className="w-12 h-12 rounded-full bg-[#00ff88]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Globe className="text-[#00ff88]" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-4">Mainnet: 100% Production Ready</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Mainnet router is locked. Merchants can integrate the SDK to receive USDC payments immediately. The protocol executes an atomic 99% / 1% split without centralized custody.
            </p>
            <div className="flex items-center gap-2 text-[#00ff88] font-mono text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
              Base Mainnet Active
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-500/30 transition-all group">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Database className="text-orange-500" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-4">Sandbox: Simulate Instantly</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Switch to Sandbox mode in the Explorer to perform one-click simulations with our faucet wallet. Observe how Agents handle 402 errors and complete on-chain payments in real-time.
            </p>
            <div className="flex items-center gap-2 text-orange-500 font-mono text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              Base Sepolia Sandbox
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const SDKShowcase = () => (
  <section id="sdk" className="py-24 px-6 max-w-6xl mx-auto">
    <div className="text-center mb-16">
      <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
        <Code2 className="text-[#00ff88]" /> Two lines of code to integrate.
      </h2>
      <p className="text-gray-400">Whether you are a merchant selling an API or an agent buying one.</p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Merchant Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-xs font-mono text-[#00ff88] tracking-widest uppercase">
          <Database size={14} /> MERCHANT (MONETIZE)
        </div>

        <div className="terminal-window rounded-2xl overflow-hidden">
          <div className="bg-white/5 px-4 py-2 text-xs font-mono text-gray-500 border-b border-white/5 text-left">
            express-js (Node.js)
          </div>
          <pre className="p-6 text-[13px] text-gray-300 font-mono leading-relaxed overflow-x-auto text-left">
            {`const { paynode } = require('@paynode/sdk');

// Drop-in middleware
app.use(paynode({
  price: 5.00, // USDC
  merchantWallet: '0x123...'
}));`}
          </pre>
        </div>

        <div className="terminal-window rounded-2xl overflow-hidden">
          <div className="bg-white/5 px-4 py-2 text-xs font-mono text-gray-500 border-b border-white/5 text-left">
            fastapi.py (Python)
          </div>
          <pre className="p-6 text-[13px] text-gray-300 font-mono leading-relaxed overflow-x-auto text-left">
            {`from paynode_sdk import PayNode

pn = PayNode(merchant_wallet="0x123...")

@app.middleware("http")
async def paynode_mw(request, call_next):
    return await pn.intercept(request, call_next, price=5.0)`}
          </pre>
        </div>
      </div>

      {/* Agent Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-xs font-mono text-blue-400 tracking-widest uppercase">
          <Zap size={14} /> AGENT (USER / PAY)
        </div>

        <div className="terminal-window rounded-2xl overflow-hidden">
          <div className="bg-white/5 px-4 py-2 text-xs font-mono text-gray-500 border-b border-white/5 text-left">
            agent-sdk.py (Python)
          </div>
          <pre className="p-6 text-[13px] text-gray-300 font-mono leading-relaxed overflow-x-auto text-left">
            {`from paynode_sdk import Client

agent = Client(private_key="0x...")

# Handles 402, resolves Router, and pays
response = agent.get("https://api.merchant.com/data")`}
          </pre>
        </div>

        <div className="terminal-window rounded-2xl overflow-hidden">
          <div className="bg-white/5 px-4 py-2 text-xs font-mono text-gray-500 border-b border-white/5 text-left">
            agent-sdk.js (JavaScript)
          </div>
          <pre className="p-6 text-[13px] text-gray-300 font-mono leading-relaxed overflow-x-auto text-left">
            {`import { PayNodeAgent } from "@paynode/sdk";

const agent = new PayNodeAgent({ privateKey: "0x..." });

// Automatically handles POM signing & payment
const res = await agent.fetch("https://api.merchant.com/data");`}
          </pre>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="py-12 border-t border-white/5 text-center text-gray-600 text-sm">
    <p>© 2026 PayNode Protocol. Built for the Sovereign AI Future.</p>
  </footer>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <Navbar />
      <Hero />
      <Simulator />
      <StatsBoard />
      <SDKShowcase />
      <Footer />
    </div>
  );
}
