
import React from 'react';
import { Clock, LayoutGrid, Brain, ShieldCheck, Flame, ArrowRightCircle } from 'lucide-react';

export const TradingDiscipline: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 no-print">
      {/* 14:30 定夺法 */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border-b-4 border-indigo-500 relative overflow-hidden group hover:scale-[1.02] transition-all">
        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Clock className="w-16 h-16" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-300">14:30 定夺法</h3>
          </div>
          <p className="text-[13px] font-bold leading-relaxed">
            早盘不轻动，午后定乾坤。绝对不买入无计划标的。聚焦<span className="text-indigo-400">“买入确定性”</span>而非价格，观察全天波动企稳后再行决断。
          </p>
        </div>
      </div>

      {/* 2+1 动态配比 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm border-b-4 border-emerald-500 group hover:scale-[1.02] transition-all">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
            <LayoutGrid className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">“2+1” 动态配比</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-black text-slate-400">
            <span>主升中线 x1</span>
            <span>波段蓝筹 x1</span>
            <span>机动仓位 x1</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full flex overflow-hidden">
            <div className="h-full bg-indigo-600" style={{ width: '40%' }}></div>
            <div className="h-full bg-emerald-500" style={{ width: '40%' }}></div>
            <div className="h-full bg-amber-400" style={{ width: '20%' }}></div>
          </div>
          <p className="text-[12px] text-slate-600 font-medium leading-relaxed">
            确保核心仓位锁定<span className="font-black text-slate-800">主升浪</span>，辅以蓝筹波段对冲，严控短线诱多风险。
          </p>
        </div>
      </div>

      {/* 高股价心理脱敏 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm border-b-4 border-rose-500 group hover:scale-[1.02] transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-50 rounded-lg border border-rose-100">
              <Brain className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">高股价脱敏</h3>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100 uppercase animate-pulse">
            机构属性
          </span>
        </div>
        <p className="text-[12px] text-slate-600 font-medium leading-relaxed mb-3">
          聚焦“阻力最小的方向”。高价代表门槛与确定性。
        </p>
        <div className="flex items-center gap-2 text-[10px] font-black text-rose-500 bg-rose-50/50 p-2 rounded-lg border border-rose-100">
          <Flame className="w-3.5 h-3.5 shrink-0" />
          <span>人声鼎沸、偏离过远时，必须分批止盈！</span>
        </div>
      </div>
    </div>
  );
};
