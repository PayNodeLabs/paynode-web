"use client";

import React, { useState } from "react";
import { 
  Terminal, 
  Zap, 
  Code2, 
  ExternalLink,
  ChevronRight,
  Database,
  Globe
} from "lucide-react";

// --- Components ---

const Navbar = () => (
  <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-md px-6 py-4 flex justify-between items-center">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-[#00ff88] rounded flex items-center justify-center font-bold text-black">P</div>
      <span className="font-bold tracking-tight text-xl">PayNode</span>
    </div>
    <div className="hidden md:flex gap-8 text-sm text-gray-400 font-medium">
      <a href="#simulator" className="hover:text-[#00ff88] transition-colors">Simulator</a>
      <a href="#stats" className="hover:text-[#00ff88] transition-colors">Mainnet Stats</a>
      <a href="#sdk" className="hover:text-[#00ff88] transition-colors">SDK</a>
      <a href="https://docs.paynode.dev" className="hover:text-[#00ff88] transition-colors flex items-center gap-1">Docs <ExternalLink size={14} /></a>
    </div>
    <button className="text-xs bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:bg-white/10 transition-all font-mono">
      0xA88B...2bb
    </button>
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
  const [agentName, setAgentName] = useState("Agent-007");

  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setLogs([]);
    
    const steps = [
      "📡 Intercepting outgoing API request...",
      "HTTP/1.1 402 Payment Required",
      "🔍 Resolving PayNode-Router-Address: 0xA88B...2bb",
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
            <Terminal className="text-[#00ff88]" /> 
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
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 font-mono text-[10px] text-gray-500 text-center">
              Router: 0xA88B5eaD188De39c015AC51F45E1B41D3d95f2bb
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
        <Code2 className="text-[#00ff88]" /> Two lines of code to monetize.
      </h2>
      <p className="text-gray-400">Integrate PayNode into your existing Express or FastAPI backend.</p>
    </div>
    
    <div className="grid md:grid-cols-2 gap-8">
      <div className="terminal-window rounded-2xl overflow-hidden">
        <div className="bg-white/5 px-4 py-2 text-xs font-mono text-gray-500 border-b border-white/5">
          merchant-api.js (Node.js)
        </div>
        <pre className="p-6 text-sm text-gray-300 font-mono leading-relaxed overflow-x-auto">
{`const { paynode } = require('@paynode/sdk');

// Drop-in middleware
app.use(paynode({
  price: 5.00, // USDC
  merchantWallet: '0x123...'
}));

app.get('/api/data', (req, res) => {
  res.json({ secret: 'Agent-only data' });
});`}
        </pre>
      </div>
      
      <div className="terminal-window rounded-2xl overflow-hidden">
        <div className="bg-white/5 px-4 py-2 text-xs font-mono text-gray-500 border-b border-white/5">
          agent-client.py (Python)
        </div>
        <pre className="p-6 text-sm text-gray-300 font-mono leading-relaxed overflow-x-auto">
{`from paynode_sdk import Client

agent = Client(private_key="0x...")

# Automatically handles 402, 
# pays via PayNode Router, and retries.
response = agent.get("https://api.merchant.com/data")

print(response.json())`}
        </pre>
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
