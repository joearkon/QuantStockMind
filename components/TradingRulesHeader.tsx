import React from 'react';
import { ShieldCheck, Clock, LayoutGrid, Zap, AlertTriangle, TrendingUp, Info } from 'lucide-react';

export const TradingRulesHeader: React.FC = () => {
  return (
    <div className="mb-6 space-y-4 no-print">
      {/* 核心纪律标题条 */}
      <div className="bg-slate-900 border-l-4 border-amber-500 rounded-xl p-3 flex items-center justify-between shadow-lg shadow-slate-200">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-500" />
          <span className="text-white text-xs font-black tracking-widest uppercase italic">QuantMind 核心交易执行律令 · 执行优先级：高</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
          No Plan, No Trade. No Certainty, No Action.
        </div>
      </div>

      {/* 三大律令看板 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* 1. 14:30 定夺法 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-amber-400 transition-all group overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform">
            <Clock className="w-24 h-24 text-slate-900" />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-amber-50 rounded-lg"><Clock className="w-4 h-4 text-amber-600" /></div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">14:30 定夺法 (防守核心)</h3>
          </div>
          <div className="space-y-2 relative z-10">
            <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
              ● 原则：早盘无论涨跌，<span className="text-rose-600 font-black italic">绝不买入</span>无提前调研和计划的标的。
            </p>
            <div className="bg-amber-50/50 p-2 rounded-lg border border-amber-100">
              <p className="text-xs text-amber-900 font-black leading-relaxed italic">
                买的是“买入确定性”，而非买入价格。参考金海通(1.20)确认主升逻辑后介入。
              </p>
            </div>
          </div>
        </div>

        {/* 2. "2+1" 动态配比 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-400 transition-all group overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-[0.03]">
            <LayoutGrid className="w-24 h-24 text-slate-900" />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-indigo-50 rounded-lg"><LayoutGrid className="w-4 h-4 text-indigo-600" /></div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">“2+1” 持仓架构 (战术配比)</h3>
          </div>
          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
               <span className="w-10 text-indigo-500">中线 (1)</span>
               <span className="flex-1 border-b border-slate-100 pb-0.5">主升核心不惧高价 (如金海通)</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
               <span className="w-10 text-amber-600">波段 (1)</span>
               <span className="flex-1 border-b border-slate-100 pb-0.5">大体量/周期性摊薄成本 (如北稀)</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
               <span className="w-10 text-rose-500">短线 (≤1)</span>
               <span className="flex-1 border-b border-slate-100 pb-0.5 italic">严守 14:30 企稳原则防止被诱多</span>
            </div>
          </div>
        </div>

        {/* 3. 高股价心理脱敏 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-rose-400 transition-all group overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-[0.03]">
            <TrendingUp className="w-24 h-24 text-slate-900" />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-rose-50 rounded-lg"><Zap className="w-4 h-4 text-rose-600" /></div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">高价脱敏 & 止盈预警</h3>
          </div>
          <div className="space-y-2 relative z-10">
            <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
              价格只是数字，核心在于<span className="text-indigo-600 font-black">“阻力最小的方向”</span>。
            </p>
            <div className="bg-rose-50 border border-rose-100 p-2 rounded-lg flex items-start gap-2 animate-pulse">
               <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
               <div className="text-[10px] text-rose-800 font-black uppercase leading-tight">
                  止盈预警：偏离均线过远 / 人声鼎沸 (自媒体热议)
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
