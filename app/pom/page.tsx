"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Activity, 
  ShieldCheck, 
  Zap, 
  ArrowLeft, 
  RefreshCw, 
  Database, 
  Globe,
  Terminal as TerminalIcon,
  TrendingUp,
  Cpu
} from "lucide-react";
import { supabase } from "../api/pom/lib/supabase";

interface FeedItem {
  agent: string;
  txHash: string;
  time: string;
  isMainnet: boolean;
}

export default function POMExplorer() {
  const [isMainnet, setIsMainnet] = useState(true);
  const [agentName, setAgentName] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<{
    feed: FeedItem[];
    leaderboard: [string, number][];
    merchantRevenue: string;
    protocolFees: string;
    totalTransactions: number;
  }>({
    feed: [],
    leaderboard: [],
    merchantRevenue: "0.0000",
    protocolFees: "0.000000",
    totalTransactions: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // 1. Initial Data Fetch
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setData({
        feed: [],
        leaderboard: [],
        merchantRevenue: "0.0000",
        protocolFees: "0.000000",
        totalTransactions: 0
      });
      const network = isMainnet ? "mainnet" : "testnet";
      const res = await fetch(`/api/pom?network=${network}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Setup Realtime Subscription
  useEffect(() => {
    fetchData(); // Initial load

    // Subscribe to INSERT events on 'transactions' table
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `network=eq.${isMainnet ? 'mainnet' : 'testnet'}`
        },
        (payload) => {
          console.log('Realtime change received!', payload);
          // 🛡️ FIX: Prepend the new event instead of performing a heavy full database query
          setData((prev) => {
            const newTx = payload.new;
            const newFeedItem: FeedItem = {
              agent: newTx.agent_name,
              txHash: newTx.tx_hash,
              time: new Date(newTx.created_at).toLocaleTimeString(),
              isMainnet: newTx.network === 'mainnet'
            };
            return {
              ...prev,
              feed: [newFeedItem, ...prev.feed].slice(0, 50),
              totalTransactions: prev.totalTransactions + 1
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMainnet]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`]);

  const runDemo = async (retryCount = 0) => {
    if (!agentName || (isExecuting && retryCount === 0) || cooldown > 0) return;
    
    if (retryCount === 0) {
      setIsExecuting(true);
      setLogs([]);
      addLog(`INITIATING_AUTONOMOUS_CALL: target=POST /api/pom`);
    }
    
    try {
      if (retryCount === 0) {
        await new Promise(r => setTimeout(r, 800));
        addLog(`HTTP 402 PAYMENT_REQUIRED`);
        addLog(`PayNode_SDK: Parsing protocol headers...`);
      }
      
      await new Promise(r => setTimeout(r, 1200));
      addLog(`Base_L2: Attempting On-Chain Settlement...`);
      
      const res = await fetch(`/api/pom/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_name: agentName })
      });

      const result = await res.json();

      if (res.ok) {
        addLog(`TX_CONFIRMED: ${result.txHash.slice(0, 16)}...`);
        addLog(`PayNode_SDK: Retrying with receipt...`);
        await new Promise(r => setTimeout(r, 800));
        addLog(`SUCCESS: Matrix access granted to ${agentName}.`);
        setAgentName("");
        setCooldown(30);
      } else if (res.status === 429 && retryCount < 3) {
        addLog(`SYSTEM: Network congested. Retrying... (Nonce Collision avoidance)`);
        await new Promise(r => setTimeout(r, 2000 * (retryCount + 1))); 
        return runDemo(retryCount + 1);
      } else {
        addLog(`ERROR: ${result.error || "Execution failed"}`);
      }
    } catch (e) {
      addLog(`ERROR: Connection failed.`);
    } finally {
      if (retryCount === 0 || !isExecuting) setIsExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] font-sans p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-0 w-full h-full bg-grid -z-10 opacity-30" />
      
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#00ff88] transition-colors mb-4 text-sm group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold tracking-tight uppercase flex items-center gap-3">
            <TrendingUp className="text-[#00ff88]" /> PayNode_Explorer
            <span className="text-xs bg-[#00ff88]/10 text-[#00ff88] px-2 py-1 rounded border border-[#00ff88]/20 align-middle ml-2">v1.0-LIVE</span>
          </h1>
        </div>

        <div className="flex items-center gap-4 bg-white/5 p-1 rounded-full border border-white/10 shadow-2xl backdrop-blur-md">
          <button 
            onClick={() => setIsMainnet(true)} 
            className={`px-6 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${isMainnet ? 'bg-[#00ff88] text-black shadow-[0_0_20px_rgba(0,255,136,0.3)]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Globe size={14} /> MAINNET
          </button>
          <button 
            onClick={() => setIsMainnet(false)} 
            className={`px-6 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${!isMainnet ? 'bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Database size={14} /> SANDBOX
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-[#00ff88]/20 transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap size={48} className="text-[#00ff88]" />
             </div>
             <span className="text-xs uppercase text-gray-500 block mb-2 font-mono">Net Volume (99%)</span>
             <span className="text-4xl font-bold tracking-tighter text-white">
                {isLoading ? <span className="animate-pulse">---</span> : `$${data.merchantRevenue}`}
             </span>
          </div>

          <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/20 transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShieldCheck size={48} className="text-blue-500" />
             </div>
             <span className="text-xs uppercase text-gray-500 block mb-2 font-mono text-blue-400">Protocol Fees (1%)</span>
             <span className="text-4xl font-bold tracking-tighter text-white">
                {isLoading ? <span className="animate-pulse">---</span> : `$${data.protocolFees}`}
             </span>
          </div>

          <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/20 transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity size={48} className="text-purple-500" />
             </div>
             <span className="text-xs uppercase text-gray-500 block mb-2 font-mono">Total Txs</span>
             <span className="text-4xl font-bold tracking-tighter text-white">
                {isLoading ? <span className="animate-pulse">---</span> : data.totalTransactions}
             </span>
          </div>

          <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-[#00ff88]/20 transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Cpu size={48} className="text-[#00ff88]" />
             </div>
             <span className="text-xs uppercase text-gray-500 block mb-2 font-mono">Status</span>
             <div className={`flex items-center gap-2 font-bold ${isLoading ? 'text-orange-500' : 'text-[#00ff88]'}`}>
                <RefreshCw size={14} className="animate-spin" /> {isLoading ? "SWITCHING_NETWORK..." : "LIVE_SYNC"}
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          <div className="lg:col-span-1 space-y-8">
            {!isMainnet && (
              <div className="p-8 rounded-2xl bg-orange-500/5 border border-orange-500/20 shadow-2xl">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TerminalIcon size={18} className="text-orange-500" /> One-Click Simulation
                </h3>
                <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                  Execute an autonomous on-chain payment flow. This triggers the full 402/POM handshake loop on the sandbox.
                </p>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Enter Agent Identity"
                    className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-sm focus:border-orange-500/50 outline-none transition-all"
                    value={agentName}
                    onChange={(evt) => setAgentName(evt.target.value)}
                    disabled={isExecuting || cooldown > 0}
                  />
                  <button 
                    onClick={() => runDemo(0)}
                    disabled={!agentName || isExecuting || cooldown > 0}
                    className={`w-full py-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${!agentName || isExecuting || cooldown > 0 ? 'bg-gray-800 text-gray-600' : 'bg-orange-500 text-black hover:scale-105 shadow-[0_0_30px_rgba(249,115,22,0.2)]'}`}
                  >
                    {isExecuting ? <RefreshCw size={16} className="animate-spin" /> : cooldown > 0 ? `COOLING (${cooldown}S)` : "EXECUTE CALL"}
                  </button>
                </div>
                
                <div className="mt-6 bg-black/80 rounded-xl border border-white/5 p-4 font-mono text-[11px] h-[160px] overflow-y-auto">
                  {logs.length === 0 && <span className="text-gray-700 animate-pulse">_Ready for input...</span>}
                  {logs.map((log, i) => (
                    <div key={i} className={`mb-1 ${log.includes('ERROR') ? 'text-red-500' : log.includes('SUCCESS') ? 'text-green-500' : 'text-orange-400/80'}`}>
                      <span className="opacity-30 mr-2">$</span> {log}
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}

            <div className="p-8 rounded-2xl bg-white/5 border border-white/5">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Zap size={18} className="text-[#00ff88]" /> Top Agents
              </h3>
              <div className="space-y-4">
                {isLoading && (
                  <div className="flex justify-center p-4">
                    <RefreshCw className="animate-spin text-[#00ff88]" size={16} />
                  </div>
                )}
                {!isLoading && data.leaderboard.length === 0 && <div className="text-gray-600 italic text-sm">No agent activity yet.</div>}
                {!isLoading && data.leaderboard.map(([name, count], i) => (
                  <div key={name} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-600 font-mono">0{i+1}</span>
                      <span className="text-sm font-bold">{name}</span>
                    </div>
                    <span className="text-[10px] font-mono bg-[#00ff88]/10 text-[#00ff88] px-2 py-1 rounded">
                      {count} TXS
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
             <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                   <h3 className="font-bold flex items-center gap-2">
                      <Activity size={18} className="text-[#00ff88]" /> {isMainnet ? "Mainnet Settlement Stream" : "Sandbox Activity Log"}
                   </h3>
                   <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-ping" />
                </div>
                
                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                   {isLoading && (
                      <div className="p-12 text-center text-[#00ff88] italic flex justify-center items-center gap-2">
                        <RefreshCw className="animate-spin" size={16} /> Connecting to {isMainnet ? 'Mainnet' : 'Sandbox'} nodes...
                      </div>
                   )}
                   {!isLoading && data.feed.length === 0 && <div className="p-12 text-center text-gray-600 italic">Scanning chain for events...</div>}
                   {!isLoading && data.feed.map((tx, i) => (
                      <div key={tx.txHash + i} className="p-6 hover:bg-white/[0.02] transition-colors group">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="text-xs text-[#00ff88] font-bold mb-1">{tx.agent}</div>
                            <div className="text-[10px] font-mono text-gray-500 break-all">{tx.txHash}</div>
                          </div>
                          <div className="text-[10px] text-gray-600 font-mono">{tx.time}</div>
                        </div>
                        <div className="flex gap-4">
                           <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-gray-400 group-hover:border-[#00ff88]/30 transition-colors">
                              99% → MERCHANT
                           </div>
                           <div className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/10 text-[9px] font-bold uppercase tracking-widest text-blue-400 group-hover:border-blue-500/30 transition-colors">
                              1% → PROTOCOL
                           </div>
                        </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>

        </div>
      </div>

      <footer className="max-w-7xl mx-auto mt-24 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-gray-600 font-mono tracking-widest">
         <div>© 2026 PAYNODE_PROTOCOL // BASE_CHAIN_GENESIS</div>
         <div className="flex gap-8">
            <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-[#00ff88]" /> LIVE_SYNC</span>
            <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-[#00ff88]" /> SECURED_BY_BASE</span>
         </div>
      </footer>
    </div>
  );
}
