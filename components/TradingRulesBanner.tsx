import React from 'react';
import { ShieldAlert, Clock, LayoutGrid, Zap, TrendingUp, AlertTriangle, ChevronRight, Target, ShieldCheck } from 'lucide-react';

export const TradingRulesBanner: React.FC = () => {
  return (
    <div className="mb-8 space-y-4 no-print">
      {/* 顶部强警示条 */}
      <div className="bg-rose-600 text-white px-6 py-2.5 rounded-xl flex items-center justify-between shadow-lg shadow-rose-200 animate-pulse">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-100" />
          <span className="text-sm font-black uppercase tracking-[0.2em]">最高执行优先级：防止利润回撤，严守 14:30 纪律</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[10px] font-bold opacity-80 uppercase tracking-widest">
          Risk Management Protocol Active
        </div>
      </div>

      {/* 核心律令看板 */}
      <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <ShieldCheck className="w-64 h-64 text-white" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          
          {/* 规则 1: 14:30 定夺法 */}
          <div className="p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-xl">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-black text-white">14:30 定夺法 <span className="text-[10px] text-amber-500/60 ml-2 uppercase tracking-tighter">防守核心</span></h3>
            </div>
            <div className="space-y-3">
              <p className="text-slate-400 text-xs font-medium leading-relaxed">
                原则：早盘无论涨跌，绝对不买入没有提前调研和计划的标的。
              </p>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group hover:bg-white/10 transition-all">
                <div className="text-[10px] font-black text-amber-500 uppercase mb-1">执行要点</div>
                <p className="text-sm text-slate-200 font-bold leading-relaxed">
                  14:30 后观察全天波动是否企稳。买入的是<span className="text-amber-500 underline decoration-2 underline-offset-4">“确定性”</span>而非价格。参考“金海通”1月20日 14:30 确认主升逻辑后介入。
                </p>
              </div>
            </div>
          </div>

          {/* 规则 2: 2+1 动态配比 */}
          <div className="p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-xl">
                <LayoutGrid className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-lg font-black text-white">“2+1” 动态配比 <span className="text-[10px] text-indigo-400/60 ml-2 uppercase tracking-tighter">持仓架构</span></h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
                <span className="text-[11px] font-black text-slate-300 w-20">长期/中线 (1只)</span>
                <span className="text-[10px] text-slate-500 font-bold flex-1">主升浪核心，如金海通，不惧高价滚动操作。</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                <span className="text-[11px] font-black text-slate-300 w-20">波段/自救 (1只)</span>
                <span className="text-[10px] text-slate-500 font-bold flex-1">如北方稀土，利用周期性摊薄成本或波段自救。</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                <span className="text-[11px] font-black text-slate-300 w-20">短线/机动 (至多1只)</span>
                <span className="text-[10px] text-slate-500 font-bold flex-1">仅行情明朗参与，严守 14:30 企稳原则。</span>
              </div>
            </div>
          </div>

          {/* 规则 3: 高股价心理脱敏 */}
          <div className="p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-black text-white">高价脱敏 & 止盈预警 <span className="text-[10px] text-rose-400/60 ml-2 uppercase tracking-tighter">进攻逻辑</span></h3>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <Target className="w-4 h-4 text-rose-500 shrink-0 mt-1" />
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  高价意味着门槛和机构筹码集中。只要处于<span className="text-white font-black">“阻力最小的方向”</span>（主升/新高），价格只是数字。
                </p>
              </div>
              <div className="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
                <div className="flex items-center gap-2 mb-2 text-rose-400 font-black text-[10px] uppercase">
                  <AlertTriangle className="w-3.5 h-3.5" /> 止盈触发信号
                </div>
                <ul className="text-[11px] text-rose-200/70 space-y-1 font-bold">
                  <li className="flex items-center gap-2 tracking-tight">● 股价严重偏离均线 (过快拉升)</li>
                  <li className="flex items-center gap-2 tracking-tight">● 人声鼎沸 (自媒体大规模讨论)</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
