'use client';

import { Terminal } from 'lucide-react';

export default function Home() {
  return (
    <main className="relative min-h-screen bg-gray-950 text-white font-sans antialiased selection:bg-blue-500 selection:text-white flex flex-col items-center justify-center overflow-hidden">

      {/* 赛博朋克背景光晕 */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-900 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-900 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>

      {/* 核心内容区 */}
      <div className="z-10 text-center px-4 w-full max-w-4xl mx-auto mt-10">

        {/* Logo 与 顶部 Badge */}
        <div className="flex flex-col items-center justify-center space-y-6 mb-8">
          <div className="inline-flex items-center space-x-2 bg-gray-900 border border-gray-800 rounded-full px-4 py-1.5 text-sm text-gray-300">
            <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
            <span>Agentic Economy Infrastructure</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
              <Terminal size={18} className="text-white" />
            </div>
            <span className="text-3xl font-bold tracking-tighter">
              PayNode<span className="text-blue-500">.dev</span>
            </span>
          </div>
        </div>

        {/* 主标题 */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-500">
          The Payment Node <br /> for AI Agents.
        </h1>

        {/* 副标题 */}
        <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
          Accept USDC from any AI instantly. Non-custodial, 1% fee, zero friction. <br />
          Built for the Machine-to-Machine (M2M) economy.
        </p>

        {/* 核心卖点代码块 (逼格拉满) */}
        <div className="bg-[#0D1117] border border-gray-800 rounded-xl p-6 text-left mb-12 max-w-2xl mx-auto shadow-[0_0_40px_rgba(56,189,248,0.1)]">
          <div className="flex space-x-2 mb-4 border-b border-gray-800 pb-4">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-4 text-xs text-gray-500 font-mono">server.js</span>
          </div>
          <pre className="text-sm md:text-base font-mono text-gray-300 overflow-x-auto">
            <code><span className="text-purple-400">import</span> {'{ PayNode }'} <span className="text-purple-400">from</span> <span className="text-green-400">'@paynode/sdk'</span>;

              <span className="text-gray-500">// Initialize your payment node (non-custodial)</span>
              <span className="text-blue-400">const</span> node = <span className="text-purple-400">new</span> PayNode({'{'} wallet: <span className="text-green-400">'0xYourAddress...'</span> {'}'});

              <span className="text-gray-500">// AI pays 0.05 USDC to access your API</span>
              app.<span className="text-blue-300">use</span>(<span className="text-green-400">'/api/data'</span>, node.<span className="text-blue-300">x402_gate</span>({'{'}
              price: <span className="text-orange-400">0.05</span>,
              currency: <span className="text-green-400">'USDC'</span>
              {'}'}));</code>
          </pre>
        </div>

        {/* 开发中 / 敬请期待 (Coming Soon) 状态 */}
        <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-5 animate-fade-in">
          {/* 呼吸灯特效的 Coming Soon 按钮 */}
          <div className="relative group cursor-not-allowed">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <button disabled className="relative flex items-center justify-center space-x-3 w-full sm:w-auto px-8 py-3.5 bg-gray-950 border border-gray-800 text-gray-300 font-medium rounded-lg transition-all">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              <span>Development in Progress</span>
            </button>
          </div>

          <p className="text-sm text-gray-500 font-light">
            Smart Contracts dropping soon on Base L2.
            <br className="hidden sm:block" /> Stay tuned.
          </p>
        </div>
      </div>

      {/* 底部版权 */}
      <div className="absolute bottom-5 text-gray-600 text-sm">
        &copy; 2026 PayNodeLabs. All rights reserved.
      </div>
    </main>
  );
}
