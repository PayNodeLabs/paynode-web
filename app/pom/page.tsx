"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
import { motion } from "framer-motion";
import {
  Black_Ops_One,
  Orbitron,
  Monoton,
  Sedgwick_Ave_Display,
  Rampart_One
} from "next/font/google";
import { supabase } from "../api/pom/lib/supabase";

const blackOpsOne = Black_Ops_One({ weight: "400", subsets: ["latin"] });
const orbitron = Orbitron({ subsets: ["latin"] });
const monoton = Monoton({ weight: "400", subsets: ["latin"] });
const sedgwickAve = Sedgwick_Ave_Display({ weight: "400", subsets: ["latin"] });
const rampartOne = Rampart_One({ weight: "400", subsets: ["latin"] });

interface FeedItem {
  agent: string;
  txHash: string;
  time: string;
  isMainnet: boolean;
  orderId?: string;
}

function POMExplorerContent() {
  const searchParams = useSearchParams();
  const networkParam = searchParams.get('network');
  const agentParam = searchParams.get('agent_name');

  const [isMainnet, setIsMainnet] = useState(networkParam !== "testnet");
  const [agentName, setAgentName] = useState(agentParam || "");
  const [logs, setLogs] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"onchain" | "eip3009">("eip3009");
  const logEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [kingTrigger, setKingTrigger] = useState(0);

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
  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
        setData({
          feed: [],
          leaderboard: [],
          merchantRevenue: "0.0000",
          protocolFees: "0.000000",
          totalTransactions: 0
        });
      }
      const network = isMainnet ? "mainnet" : "testnet";
      const res = await fetch(`/api/pom?network=${network}`);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [isMainnet]);

  // 2. Setup Realtime Subscription
  useEffect(() => {
    fetchData(); // Initial load

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `network=eq.${isMainnet ? 'mainnet' : 'testnet'}`
        },
        (payload) => {
          console.log('Realtime change received!', payload);
          fetchData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isMainnet, fetchData]);

  const settleManual = async (orderId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/pom/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      const result = await res.json();
      if (res.ok) {
        alert(`Settlement successful! Tx: ${result.txHash}`);
        fetchData(true);
      } else {
        alert(`Settlement failed: ${result.error || result.message}`);
      }
    } catch (err) {
      alert('Connection error during settlement.');
    } finally {
      setIsLoading(false);
      fetchData(true);
    }
  };

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`]);

  const runDemo = async (method: "onchain" | "eip3009", retryCount = 0) => {
    if (!agentName || (isExecuting && retryCount === 0) || cooldown > 0) return;

    if (retryCount === 0) {
      setIsExecuting(true);
      setPaymentMethod(method);
      setLogs([]);
      addLog(`INITIATING_AUTONOMOUS_CALL: target=POST /api/pom`);
      addLog(`PAYMENT_METHOD: ${method === "eip3009" ? "EIP-3009 (Off-chain ~50ms)" : "On-chain (Router.pay ~2s)"}`);
    }

    try {
      if (retryCount === 0) {
        await new Promise(r => setTimeout(r, 800));
        addLog(`HTTP 402 PAYMENT_REQUIRED`);
        addLog(`PayNode_SDK: Parsing X-402-Required discovery payload...`);
      }

      await new Promise(r => setTimeout(r, 1200));
      
      if (method === "eip3009") {
        addLog(`Base_L2: Signing TransferWithAuthorization (EIP-3009)...`);
      } else {
        addLog(`Base_L2: Attempting On-Chain Settlement...`);
      }

      const endpoint = method === "eip3009" ? "/api/test/x402/demo" : "/api/pom/demo";
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_name: agentName })
      });

      const result = await res.json();

      if (res.ok && !result.error) {
        addLog(`TX_CONFIRMED: ${result.txHash.slice(0, 16)}...`);
        addLog(`PayNode_SDK: Submitting X-402-Payload...`);
        await new Promise(r => setTimeout(r, 800));
        addLog(`SUCCESS: Matrix access granted to ${agentName}.`);
        setAgentName("");
        setCooldown(30);
        fetchData(true);
      } else if (res.status === 429 && retryCount < 3) {
        addLog(`SYSTEM: Network congested. Retrying... (Nonce Collision avoidance)`);
        await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
        return runDemo(method, retryCount + 1);
      } else {
        addLog(`ERROR: ${result.error || "Execution failed"}`);
      }
    } catch {
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
            <span className="text-xs bg-[#00ff88]/10 text-[#00ff88] px-2 py-1 rounded border border-[#00ff88]/20 align-middle ml-2">v2.0</span>
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
        {/* FULL WIDTH GRAFFITI WALL - CONCRETE EDITION */}
        <div
          className="bg-[#3a3a3a] border border-white/10 relative overflow-hidden aspect-[2/1] [container-type:size] flex flex-col shadow-[inset_0_0_80px_rgba(0,0,0,0.6),0_20px_50px_rgba(0,0,0,0.4)] group/wall mb-12"
          style={{
            padding: '1.6cqw',
            borderRadius: '2cqw',
            transform: 'translateZ(0)',
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden'
          }}
        >

          {/* Layer 1: Concrete Grain */}
          <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundSize: '256px 256px'
            }}
          />

          {/* Layer 2: Wall Stains & Grunge */}
          <div className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(at 15% 15%, #2a2a2a 0%, transparent 40%),
                radial-gradient(at 85% 85%, #2a2a2a 0%, transparent 40%),
                radial-gradient(at 50% 50%, #333333 0%, transparent 60%)
              `
            }}
          />

          {/* Layer 3: Subtle Wall Cracks */}
          <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-multiply">
            <svg
              viewBox="0 0 1000 500"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              <defs>
                <filter id="crackShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" />
                </filter>
                <filter id="crackCoreBlur" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.2" />
                </filter>
              </defs>
              {/* 底层：深度阴影（重度模糊，模拟环境光遮蔽） */}
              <g filter="url(#crackShadow)" opacity="0.6">
                {/* 左侧裂缝 - 重塑为下坠蔓延感 */}
                <path d="M0,260 L35,270 Q60,250 95,280" stroke="black" strokeWidth="1.2cqw" fill="none" strokeLinecap="round" />
                <path d="M95,280 L130,270 Q170,310 220,290" stroke="black" strokeWidth="0.8cqw" fill="none" strokeLinecap="round" />
                <path d="M220,290 L270,305 Q320,280 400,300" stroke="black" strokeWidth="0.4cqw" fill="none" strokeLinecap="round" />
                <path d="M95,280 L80,305 Q65,315 45,340" stroke="black" strokeWidth="0.4cqw" fill="none" strokeLinecap="round" />

                {/* 右上裂缝 - 保持 */}
                <path d="M820,0 L810,35 Q845,75 805,125" stroke="black" strokeWidth="1.2cqw" fill="none" strokeLinecap="round" />
                <path d="M805,125 L830,190 Q790,230 800,280" stroke="black" strokeWidth="0.6cqw" fill="none" strokeLinecap="round" />
                <path d="M805,125 L775,135 Q750,150 720,145" stroke="black" strokeWidth="0.4cqw" fill="none" strokeLinecap="round" />

                {/* 右下裂缝 - 重塑为墙角应力型 */}
                <path d="M1000,420 L960,435 Q920,410 880,445" stroke="black" strokeWidth="1.2cqw" fill="none" strokeLinecap="round" />
                <path d="M880,445 L830,430 Q780,480 720,455" stroke="black" strokeWidth="0.8cqw" fill="none" strokeLinecap="round" />
                <path d="M720,455 L650,475 Q600,490 550,500" stroke="black" strokeWidth="0.4cqw" fill="none" strokeLinecap="round" />
                <path d="M880,445 L900,470 Q910,490 915,500" stroke="black" strokeWidth="0.4cqw" fill="none" strokeLinecap="round" />
              </g>

              {/* 上层：锐利核心（带微弱模糊，模拟裂缝深度） */}
              <g filter="url(#crackCoreBlur)">
                {/* 左侧裂缝核心 */}
                <path d="M0,260 L35,270 Q60,250 95,280" stroke="black" strokeWidth="0.2cqw" fill="none" strokeLinecap="round" />
                <path d="M95,280 L130,270 Q170,310 220,290" stroke="black" strokeWidth="0.1cqw" fill="none" strokeLinecap="round" />
                <path d="M220,290 L270,305 Q320,280 400,300" stroke="black" strokeWidth="0.05cqw" fill="none" strokeLinecap="round" />
                <path d="M95,280 L80,305 Q65,315 45,340" stroke="black" strokeWidth="0.04cqw" fill="none" strokeLinecap="round" />

                {/* 右上裂缝核心 */}
                <path d="M820,0 L810,35 Q845,75 805,125" stroke="black" strokeWidth="0.2cqw" fill="none" strokeLinecap="round" />
                <path d="M805,125 L830,190 Q790,230 800,280" stroke="black" strokeWidth="0.08cqw" fill="none" strokeLinecap="round" />
                <path d="M805,125 L775,135 Q750,150 720,145" stroke="black" strokeWidth="0.04cqw" fill="none" strokeLinecap="round" />

                {/* 右下裂缝核心 */}
                <path d="M1000,420 L960,435 Q920,410 880,445" stroke="black" strokeWidth="0.2cqw" fill="none" strokeLinecap="round" />
                <path d="M880,445 L830,430 Q780,480 720,455" stroke="black" strokeWidth="0.1cqw" fill="none" strokeLinecap="round" />
                <path d="M720,455 L650,475 Q600,490 550,500" stroke="black" strokeWidth="0.05cqw" fill="none" strokeLinecap="round" />
                <path d="M880,445 L900,470 Q910,490 915,500" stroke="black" strokeWidth="0.04cqw" fill="none" strokeLinecap="round" />
              </g>            </svg>
          </div>

          {/* Layer 4: Vignette Lighting */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/70 pointer-events-none" />

          <div
            className="flex items-center justify-between relative z-10 border-b border-white/10"
            style={{ marginBottom: '3cqw', paddingBottom: '1.6cqw' }}
          >
            <h3
              className="font-mono font-bold flex items-center uppercase tracking-[0.2em] text-white/80"
              style={{ fontSize: '1.4cqw', gap: '0.8cqw' }}
            >
              <span
                className="bg-[#00ff88] text-black rounded-none font-black"
                style={{
                  padding: '0.1cqw 1cqw',
                  fontSize: '0.8cqw',
                  boxShadow: '0.2cqw 0.2cqw 0px rgba(0,0,0,0.5)'
                }}
              >
                THE_DOODLE_WALL
              </span>
              <span className="flex items-center">
                VANDALISM_LEADERBOARD
                <span
                  className="bg-[#00ff88]/50 ml-2 animate-pulse"
                  style={{ width: '0.6cqw', height: '1.2cqw' }}
                />
              </span>
            </h3>
            <div
              className="hidden md:flex items-center font-mono tracking-[0.2em]"
              style={{ gap: '1.5cqw', fontSize: '0.8cqw' }}
            >
              <span className="text-white/20 hidden lg:block">VANDAL_MODE_V2.0</span>
              <span className="flex items-center gap-2 text-[#00ff88]/60">
                <div
                  className="rounded-full bg-[#00ff88] animate-ping"
                  style={{ width: '0.5cqw', height: '0.5cqw' }}
                />
                REALTIME_SYNC
              </span>
            </div>
          </div>

          <div className="flex-1 relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-50">
                <RefreshCw className="animate-spin text-[#00ff88]" size={48} />
              </div>
            )}

            {!isLoading && (
              <div className="relative w-full h-full">
                {Array.from({ length: 20 }).map((_, i) => {
                  const item = data.leaderboard[i];
                  const isPlaceholder = !item;
                  const name = item ? item[0] : (i === 0 ? "VACANT" : i < 10 ? `VOID_${i + 1}` : "NULL");
                  const count = item ? item[1] : 0;
                  const len = name.length || 1;

                  // Rank 1: THE KING (Absolute Center)
                  if (i === 0) {
                    const dynamicSize = Math.min(12, Math.max(5, 100 / len));
                    return (
                      <div key={i} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center" style={{ zIndex: 50 }}>
                        <motion.div
                          key={`${name}-${count}-${kingTrigger}`} // RE-ANIMATE ON TRIGGER OR COUNT CHANGE
                          initial={{ scale: 1, filter: 'brightness(1) blur(0px)', rotate: -3, skewX: 0, zIndex: 50 }}
                          animate={{
                            scale: [2, 2, 1, 1, 1, 1], // 巨量放大到 6 倍
                            filter: [
                              'brightness(1) blur(0px)',
                              'brightness(2) blur(3px)',
                              'brightness(0.4) blur(0px)',
                              'brightness(1.8) blur(0px)',
                              'brightness(0.9) blur(0px)',
                              'brightness(1) blur(0px)'
                            ],
                            rotate: [20, 20, -3, -3, -3, -3],
                          }}
                          transition={{
                            duration: 0.9, // 稍微拉长一点点总时长，让 6 倍放大的过程更可观测
                            times: [0, 0.2, 0.4, 0.65, 0.85, 1], // 稍微推迟峰值，增强蓄力感
                            ease: "easeOut"
                          }}
                          style={{ willChange: 'transform, filter, opacity' }}
                          className={`relative inline-block cursor-default group/king transition-all duration-700 ${isPlaceholder ? 'opacity-20 grayscale' : 'opacity-100'}`}
                        >
                          <span
                            className={`absolute left-1/2 -translate-x-1/2 -rotate-2 group-hover/king:rotate-3 transition-transform duration-500 whitespace-nowrap z-50 ${isPlaceholder ? 'text-gray-500' : 'text-[#00ff88]'} ${orbitron.className} font-bold tracking-tighter`}
                            style={{
                              top: '-5cqw',
                              fontSize: '1.8cqw',
                              padding: '0.2cqw 0.8cqw',
                              textShadow: isPlaceholder ? 'none' : '0 0 1cqw #00ff88'
                            }}
                          >
                            {isPlaceholder ? "VACANT_THRONE" : "THE_SUPREME_WRITER"}
                          </span>
                          <h2
                            className={`tracking-tighter -rotate-3 transition-all group-hover/king:scale-110 group-hover/king:rotate-3 duration-500 select-none leading-[0.8] ${isPlaceholder ? 'text-gray-800' : 'text-white'} ${blackOpsOne.className}`}
                            style={{
                              fontSize: `${dynamicSize}cqw`,
                              textShadow: isPlaceholder ? 'none' : '0 0 1.5cqw #00ff88, 0 0 3cqw #00ff88, 0 0 5cqw #00ff88'
                            }}
                          >
                            {name.toUpperCase()}
                          </h2>

                          {!isPlaceholder && (
                            <>
                              <div
                                className="absolute left-1/2 -translate-x-1/2 -rotate-2 font-mono text-white/80 bg-black/80 backdrop-blur-md border border-[#00ff88]/30 whitespace-nowrap shadow-[0.4cqw_0.4cqw_0px_#00ff88] transition-all duration-500 group-hover/king:scale-110 group-hover/king:rotate-3 cursor-default flex items-center gap-1.5"
                                style={{
                                  bottom: '-4cqw',
                                  fontSize: '1cqw',
                                  padding: '0.2cqw 0.8cqw'
                                }}
                              >
                                <span className="text-red-500 font-bold" style={{ fontSize: '1.2cqw' }}>{count}</span> SETTLEMENTS
                              </div>
                            </>
                          )}
                        </motion.div>
                      </div>
                    );
                  }

                  // Ranks 2-10: THE CREW (Asymmetric Vandalism Layout)
                  if (i < 10) {
                    const crewPositions: Record<number, { top: string, left: string, rotate: string, sizeMult: number }> = {
                      1: { top: '28%', left: '28%', rotate: '8deg', sizeMult: 55 }, // Top 2
                      2: { top: '70%', left: '18%', rotate: '22deg', sizeMult: 40 }, // Top 3
                      3: { top: '22%', left: '72%', rotate: '18deg', sizeMult: 40 }, // Top 4
                      4: { top: '82%', left: '30%', rotate: '-20deg', sizeMult: 40 }, // Top 5
                      5: { top: '45%', left: '5%', rotate: '-75deg', sizeMult: 35 }, // Top 6
                      6: { top: '70%', left: '78%', rotate: '-15deg', sizeMult: 35 }, // Top 7
                      7: { top: '8%', left: '40%', rotate: '-5deg', sizeMult: 35 }, // Top 8
                      8: { top: '85%', left: '55%', rotate: '8deg', sizeMult: 35 }, // Top 9
                      9: { top: '45%', left: '91%', rotate: '75deg', sizeMult: 35 }, // Top 10
                    };

                    const pos = crewPositions[i] || { top: '50%', left: '50%', rotate: '0deg', sizeMult: 40 };
                    const colors = ['text-pink-500', 'text-cyan-400', 'text-yellow-400', 'text-orange-500', 'text-purple-500', 'text-blue-400', 'text-red-500', 'text-lime-400', 'text-indigo-400'];
                    const dynamicSize = Math.min(6, Math.max(2, pos.sizeMult / len));

                    return (
                      <div key={i} className={`absolute transition-all ${!isPlaceholder ? 'hover:scale-110' : 'pointer-events-none opacity-[0.25]'}`}
                        style={{ left: pos.left, top: pos.top, transform: `translate(-50%, -50%) rotate(${pos.rotate})`, zIndex: 50 - i }}>
                        <motion.div
                          key={`${name}-${count}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: i * 0.04, type: "spring", stiffness: 200 }}
                          className="group cursor-default relative inline-block"
                        >
                          <h3
                            className={`${isPlaceholder ? 'text-gray-700/80 drop-shadow-none' : colors[(i - 1) % colors.length] + ' drop-shadow-[0.4cqw_0.4cqw_0px_rgba(0,0,0,0.9)]'} select-none leading-none ${sedgwickAve.className}`}
                            style={{ fontSize: `${dynamicSize * 1.2}cqw` }}
                          >
                            {name}
                          </h3>
                          {!isPlaceholder && (
                            <div
                              className={`absolute left-0 text-white/60 bg-black/40 px-1 ${monoton.className}`}
                              style={{ fontSize: '1.2cqw', top: '-2.4cqw' }}
                            >
                              #{i + 1}
                            </div>
                          )}
                        </motion.div>
                      </div>
                    );
                  }

                  // Ranks 11-20: THE CROWD (Edge Framing - Fixed Position)
                  if (i >= 10) {
                    const crowdPositions = [
                      { top: '12%', left: '8%', rotate: '-25deg' },
                      { top: '5%', left: '45%', rotate: '10deg' },
                      { top: '15%', left: '85%', rotate: '-15deg' },
                      { top: '35%', left: '1%', rotate: '35deg' },
                      { top: '68%', left: '72%', rotate: '50deg' },
                      { top: '88%', left: '12%', rotate: '15deg' },
                      { top: '92%', left: '40%', rotate: '-5deg' },
                      { top: '85%', left: '88%', rotate: '25deg' },
                      { top: '45%', left: '15%', rotate: '-18deg' },
                      { top: '15%', left: '65%', rotate: '-22deg' },
                    ];

                    const pos = crowdPositions[i - 10] || crowdPositions[0];
                    const dynamicSize = Math.min(3, Math.max(1.2, 20 / len));

                    return (
                      <div key={i} className={`absolute select-none transition-all ${isPlaceholder ? 'opacity-[0.15]' : 'opacity-[0.3] hover:opacity-80'}`}
                        style={{ left: pos.left, top: pos.top, transform: `rotate(${pos.rotate})`, zIndex: 20 - i }}>
                        <motion.span
                          key={`${name}-${count}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`leading-none block ${isPlaceholder ? 'text-gray-800' : 'text-gray-400 drop-shadow-[0.2cqw_0.2cqw_0px_rgba(0,0,0,0.5)]'} ${rampartOne.className}`}
                          style={{ fontSize: `${dynamicSize * 1.2}cqw` }}
                        >
                          {name}
                        </motion.span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </div>

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
            <span className="text-xs uppercase text-gray-500 block mb-2 font-mono text-purple-400">Total Txs</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

          {!isMainnet && (
            <div className="lg:col-span-2 space-y-8">
              <div className="p-8 rounded-[2rem] bg-orange-500/5 border border-orange-500/20 shadow-2xl relative overflow-hidden group/sim">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl -z-10 group-hover/sim:bg-orange-500/10 transition-colors" />

                <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                  <TerminalIcon size={24} className="text-orange-500" />
                  <span className="tracking-tighter uppercase italic">Autonomous_Sim</span>
                </h3>

                <p className="text-sm text-gray-400 mb-8 leading-relaxed font-medium">
                  Triggers the full <span className="text-orange-400/80 underline decoration-dotted">402/POM handshake</span> loop on the sandbox.
                  Experience the autonomous agent settlement flow in realtime.
                </p>

                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Assign Agent Identity..."
                      className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-base focus:border-orange-500/50 outline-none transition-all font-mono placeholder:text-gray-700 shadow-inner"
                      value={agentName}
                      onChange={(evt) => setAgentName(evt.target.value)}
                      disabled={isExecuting || cooldown > 0}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20"><Cpu size={20} /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => runDemo("eip3009")}
                      disabled={!agentName || isExecuting || cooldown > 0}
                      className={`py-4 rounded-2xl text-sm font-bold transition-all flex flex-col items-center gap-1 border ${
                        !agentName || isExecuting || cooldown > 0
                          ? 'bg-gray-900/50 text-gray-700 border-white/5'
                          : paymentMethod === "eip3009" && isExecuting
                            ? 'bg-[#00ff88] text-black border-[#00ff88]'
                            : 'bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/20'
                      }`}
                    >
                      <span>EIP-3009</span>
                      <span className="text-xs opacity-70">Off-chain • ~50ms</span>
                    </button>
                    <button
                      onClick={() => runDemo("onchain")}
                      disabled={!agentName || isExecuting || cooldown > 0}
                      className={`py-4 rounded-2xl text-sm font-bold transition-all flex flex-col items-center gap-1 border ${
                        !agentName || isExecuting || cooldown > 0
                          ? 'bg-gray-900/50 text-gray-700 border-white/5'
                          : paymentMethod === "onchain" && isExecuting
                            ? 'bg-blue-500 text-black border-blue-500'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                      }`}
                    >
                      <span>On-chain</span>
                      <span className="text-xs opacity-70">Router.pay() • ~2s</span>
                    </button>
                  </div>
                </div>

                <div className="mt-8 bg-[#0a0a0a] rounded-2xl border border-white/5 p-6 font-mono text-xs h-[240px] overflow-y-auto shadow-inner custom-scrollbar">
                  {logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-20">
                      <TerminalIcon size={40} className="mb-2" />
                      <span className="animate-pulse">_LISTENING_FOR_INPUT...</span>
                    </div>
                  )}
                  {logs.map((log, i) => (
                    <div key={i} className={`mb-2 flex gap-3 ${log.includes('ERROR') ? 'text-red-500' : log.includes('SUCCESS') ? 'text-green-500' : 'text-orange-400/90'}`}>
                      <span className="opacity-20 shrink-0">[{i}]</span>
                      <span className="break-all">{log}</span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>
            </div>
          )}

          <div className={`${isMainnet ? 'lg:col-span-5' : 'lg:col-span-3'}`}>
            <div className="bg-[#111] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl h-full flex flex-col">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="text-xl font-black flex items-center gap-3 italic uppercase tracking-tighter">
                  <Activity size={22} className="text-[#00ff88]" />
                  {isMainnet ? "Mainnet_Protocol_Settlements" : "Sandbox_Activity_Stream"}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-[#00ff88]/50 uppercase tracking-[0.3em] hidden sm:block animate-pulse">Live_Feed_Active</span>
                  <div className="w-3 h-3 rounded-full bg-[#00ff88] animate-ping" />
                </div>
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
                        <div className="flex items-center gap-2">
                          <a
                            href={tx.txHash.startsWith('auth:') ? '#' : `https://${tx.isMainnet ? '' : 'sepolia.'}basescan.org/tx/${tx.txHash}`}
                            target={tx.txHash.startsWith('auth:') ? '_self' : '_blank'}
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-gray-500 break-all hover:text-[#00ff88] transition-colors decoration-dotted hover:underline"
                          >
                            {tx.txHash.startsWith('auth:') ? `SIG_HASH: ${tx.txHash.slice(5, 25)}...` : `${tx.txHash.slice(0, 20)}...${tx.txHash.slice(-8)}`}
                          </a>
                          {tx.txHash.length === 66 && tx.txHash.startsWith('0x') && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                              SETTLED
                            </span>
                          )}
                          {tx.txHash.startsWith('auth:') && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono animate-pulse">
                              SETTLING...
                            </span>
                          )}
                        </div>
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
                    {(tx.txHash.startsWith('auth:') || tx.txHash.startsWith('eip3009:')) && tx.orderId && (
                      <button
                        onClick={() => settleManual(tx.orderId!)}
                        className="mt-4 w-full py-2 bg-[#00ff88] text-black text-[10px] font-black uppercase tracking-widest hover:bg-[#00ff88]/80 transition-all flex items-center justify-center gap-2"
                      >
                         Collect Money Now (Broadcast to Chain)
                      </button>
                    )}
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

export default function POMExplorer() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <RefreshCw className="animate-spin text-[#00ff88]" size={48} />
      </div>
    }>
      <POMExplorerContent />
    </Suspense>
  );
}
