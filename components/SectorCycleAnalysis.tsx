
import React, { useState } from 'react';
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { fetchSectorLadderAnalysis } from '../services/geminiService';
import { Layers, Loader2, Search, Zap, AlertTriangle, ShieldCheck, TrendingUp, Info, Activity, Flame, Target, ShieldAlert, CheckCircle2, BookOpen, Triangle, Gauge, Skull } from 'lucide-react';

export const SectorCycleAnalysis: React.FC<{
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: any;
  onOpenSettings: () => void;
}> = ({ currentModel, currentMarket, settings, onOpenSettings }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const handleAnalyze = async () => {
    if (!query) return;
    if (!settings.geminiKey) {
      onOpenSettings();
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchSectorLadderAnalysis(query, currentMarket, settings.geminiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "分析失败");
    } finally {
      setLoading(false);
    }
  };

  const data = result?.ladderData;

  const getRiskTheme = (score: number, stage: string) => {
    if (stage === 'Receding') return {
      bg: 'bg-gradient-to-br from-slate-800 to-black',
      text: 'text-slate-400',
      label: '死寂退潮',
      action: '冰封区',
      border: 'border-slate-500/30',
      circle: 'stroke-slate-600'
    };
    if (score <= 30) return { 
      bg: 'bg-gradient-to-br from-emerald-600 to-teal-900', 
      text: 'text-emerald-500', 
      label: '极低风险', 
      action: '机会区',
      border: 'border-emerald-500/30',
      circle: 'stroke-emerald-400'
    };
    if (score <= 60) return { 
      bg: 'bg-gradient-to-br from-blue-700 to-indigo-950', 
      text: 'text-blue-500', 
      label: '中等风险', 
      action: '持股区',
      border: 'border-blue-500/30',
      circle: 'stroke-blue-400'
    };
    if (score <= 80) return { 
      bg: 'bg-gradient-to-br from-amber-600 to-orange-900', 
      text: 'text-amber-500', 
      label: '高度预警', 
      action: '风险区',
      border: 'border-amber-500/30',
      circle: 'stroke-amber-400'
    };
    return { 
      bg: 'bg-gradient-to-br from-rose-700 to-red-950', 
      text: 'text-rose-500', 
      label: '极端高危', 
      action: '逃命区',
      border: 'border-rose-500/30',
      circle: 'stroke-rose-400'
    };
  };

  const theme = data ? getRiskTheme(data.risk_score, data.cycle_stage) : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Search Header */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 md:p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100">
                <Layers className="w-8 h-8" />
              </div>
              板块梯队效能大师
            </h2>
            <button 
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition-all hover:scale-105 shadow-md"
            >
              <BookOpen className="w-4 h-4" />
              {showGuide ? '隐藏判定标准' : '查看生命周期准则'}
            </button>
          </div>
          
          <p className="text-slate-500 text-base max-w-2xl font-medium mb-10">
            拒绝由于基本面破位导致的“误报底部”，引入主力出逃金额、量能萎缩比率硬性筛查。
          </p>

          <div className="max-w-2xl flex gap-3 p-2 bg-slate-100 rounded-[2rem] border border-slate-200">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="输入板块 (如: 房地产, 半导体, 商业航天)..."
                className="w-full h-14 pl-12 pr-4 bg-white rounded-[1.5rem] border border-slate-200 focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-lg transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
            </div>
            <button 
              onClick={handleAnalyze}
              disabled={loading || !query}
              className="px-10 h-14 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              开始研判
            </button>
          </div>
        </div>

        {/* --- RECONSTRUCTED GUIDE MODULE --- */}
        {showGuide && (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-slate-50 rounded-[3rem] border-2 border-slate-200 animate-slide-down relative z-10 shadow-2xl">
             <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2 border-b-2 border-indigo-100 pb-2 w-fit">
                   <Activity className="w-5 h-5 text-indigo-500" /> ① 周期判定逻辑 (硬性准则)
                </h4>
                <div className="space-y-4">
                   {[
                     { label: '启动期', desc: '刚从底部放量，核心逻辑重构，资金呈净流入状态。', color: 'bg-emerald-500' },
                     { label: '成长期', desc: '中军联动走强，出现二、三梯队成型，共识主升。', color: 'bg-blue-500' },
                     { label: '高潮期', desc: '情绪疯狂，缩量加速，补涨票满天飞，此时最危险。', color: 'bg-rose-500' },
                     { label: '末期分歧', desc: '核心龙头破位，资金日流出超10亿，典型“诱多”阶段。', color: 'bg-amber-600' },
                     { label: '退潮冰封', desc: '跌破60日/年线，成交量缩至峰值50%下，逻辑彻底终结。', color: 'bg-slate-900' },
                   ].map(s => (
                     <div key={s.label} className="flex gap-4 items-start p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className={`w-3.5 h-3.5 rounded-full mt-1.5 shrink-0 shadow-sm ${s.color}`}></div>
                        <div>
                           <div className="text-xs font-black text-slate-800">{s.label}</div>
                           <div className="text-[10px] text-slate-500 font-medium leading-relaxed">{s.desc}</div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2 border-b-2 border-rose-100 pb-2 w-fit">
                   <Target className="w-5 h-5 text-rose-500" /> ② 风险指数深度含义
                </h4>
                <div className="space-y-4">
                   <div className="p-4 bg-white rounded-2xl border-2 border-emerald-50 shadow-sm">
                      <span className="text-xs font-black text-emerald-600">0-30 布局期</span>
                      <p className="text-[9px] text-slate-400 mt-1">资金刚开始关注，筹码稳定，即使不涨也安全。</p>
                   </div>
                   <div className="p-4 bg-white rounded-2xl border-2 border-blue-50 shadow-sm">
                      <span className="text-xs font-black text-blue-600">31-60 主升期</span>
                      <p className="text-[9px] text-slate-400 mt-1">波动加大但重心上移，适合在回踩时择机加仓。</p>
                   </div>
                   <div className="p-4 bg-white rounded-2xl border-2 border-amber-50 shadow-sm">
                      <span className="text-xs font-black text-amber-600">61-80 派发期</span>
                      <p className="text-[9px] text-slate-400 mt-1">资金高位换手，警惕主力“边打边撤”，只卖不买。</p>
                   </div>
                   <div className="p-4 bg-white rounded-2xl border-2 border-rose-50 shadow-sm">
                      <span className="text-xs font-black text-rose-600">81-100 冰封期 (Dead Zone)</span>
                      <p className="text-[9px] text-slate-400 mt-1">趋势毁灭，逻辑崩塌，千万不要抱有“抢反弹”幻想。</p>
                   </div>
                </div>
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700 text-[10px] text-slate-300 font-bold leading-relaxed shadow-xl">
                   🚨 <b>注意</b>：房地产、旧能源等处于“逻辑切换”的板块，即使横盘也被视为“退潮期”，因为成交量已完全萎缩，不具备反转条件。
                </div>
             </div>
          </div>
        )}
      </div>

      {data && theme && (
        <div className="space-y-8 animate-slide-up">
          <div className={`p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-10 ${theme.bg}`}>
             <div className="relative z-10 flex-1">
                <div className="flex items-center gap-3 mb-4">
                   <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-white/20 backdrop-blur-md border border-white/20`}>{data.stage_label}</span>
                   <span className="text-sm font-bold opacity-70">| 行情凋零特征监测中</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-black mb-6 drop-shadow-sm">{data.sector_name} · 结构效能研判</h3>
                <div className="bg-black/20 backdrop-blur-lg p-8 rounded-[2.5rem] border border-white/10 shadow-inner">
                   <p className="text-lg md:text-xl font-black italic leading-relaxed text-white/95">"{data.action_advice}"</p>
                </div>
             </div>
             
             <div className="text-center relative z-10 bg-white/10 backdrop-blur-md p-10 rounded-full border-8 border-white/10 w-64 h-64 flex flex-col justify-center items-center group shadow-2xl transition-transform hover:scale-105">
                {data.cycle_stage === 'Receding' ? (
                   <Skull className="w-16 h-16 text-slate-400 mb-2 animate-pulse" />
                ) : (
                   <div className="text-7xl font-black mb-1 tracking-tighter drop-shadow-lg">{Math.round(data.risk_score)}</div>
                )}
                <div className="text-[11px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">风险系数 (Risk Index)</div>
                <div className={`text-[12px] font-black px-4 py-1.5 bg-white rounded-full ${theme.text} shadow-lg uppercase tracking-widest border-b-2 border-slate-200`}>
                   状态：{theme.label}
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             <div className="lg:col-span-8 space-y-6">
                <div className="flex justify-between items-center px-4">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">三梯队凋零诊断 (Death Matrix)</h4>
                </div>
                <div className="space-y-6">
                   {data.ladder.map((tier, idx) => (
                      <div key={idx} className={`bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl transition-all ${data.cycle_stage === 'Receding' ? 'opacity-70 grayscale' : ''}`}>
                         <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                            <span className="font-black text-slate-800 flex items-center gap-3 text-lg">
                               <div className={`w-4 h-4 rounded-full shadow-inner ${idx === 0 ? 'bg-rose-500' : idx === 1 ? 'bg-indigo-500' : 'bg-slate-400'}`}></div>
                               {tier.tier}
                            </span>
                         </div>
                         <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
                            {tier.stocks.map((stock, sIdx) => (
                               <div key={sIdx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-indigo-400 hover:bg-white transition-all shadow-sm">
                                  <div className="flex justify-between items-start mb-4">
                                     <div>
                                        <div className="font-black text-slate-800 text-xl flex items-center gap-2">
                                           {stock.name} 
                                           <span className="text-[11px] font-mono text-slate-400">{stock.code}</span>
                                        </div>
                                        <div className="text-[11px] font-black text-slate-400 mt-2 uppercase tracking-wide">{stock.performance}</div>
                                     </div>
                                     <span className={`text-[10px] font-black px-3 py-1 rounded-xl shadow-sm border ${
                                        stock.status === 'Leading' ? 'bg-rose-100 text-rose-600 border-rose-200' : 
                                        stock.status === 'Weakening' ? 'bg-slate-900 text-slate-200 border-slate-700' : 
                                        'bg-slate-200 text-slate-500'
                                     }`}>{stock.status}</span>
                                  </div>
                                  <p className="text-sm text-slate-500 font-bold leading-relaxed italic border-t border-slate-200/50 pt-4">
                                     "{stock.logic}"
                                  </p>
                               </div>
                            ))}
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             <div className="lg:col-span-4 space-y-8">
                <div className="bg-slate-900 rounded-[2.5rem] border-2 border-slate-700 p-8 shadow-2xl text-white">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-500" /> 行情凋零预判信号
                   </h4>
                   <ul className="space-y-4">
                      {data.warning_signals.map((p, i) => (
                         <li key={i} className="flex gap-4 text-sm font-bold text-slate-200 bg-white/5 p-4 rounded-2xl border border-white/10 shadow-sm">
                            <Skull className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                            {p}
                         </li>
                      ))}
                   </ul>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-500" /> 联动性诊断
                   </h4>
                   <div className="space-y-8 text-center">
                      <div className="text-4xl font-black text-slate-900">{data.structural_integrity.synergy_score}%</div>
                      <div className={`p-4 rounded-3xl border ${data.structural_integrity.is_divergent ? 'bg-rose-50 border-rose-100 text-rose-900' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
                         <p className="text-sm font-black italic">"{data.structural_integrity.verdict}"</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
