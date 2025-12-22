
import React, { useState, useEffect } from 'react';
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { fetchSectorLadderAnalysis } from '../services/geminiService';
import { Layers, Loader2, Search, Zap, AlertTriangle, ShieldCheck, ChevronRight, TrendingUp, TrendingDown, Info, Activity, Flame, Target, ShieldAlert, CheckCircle2 } from 'lucide-react';

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

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Starting': return 'bg-emerald-500';
      case 'Growing': return 'bg-blue-500';
      case 'Climax': return 'bg-rose-500';
      case 'End': return 'bg-amber-600';
      case 'Receding': return 'bg-slate-600';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Search Header */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 md:p-12 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100">
              <Layers className="w-8 h-8" />
            </div>
            板块梯队效能大师
          </h2>
          <p className="text-slate-500 text-base max-w-2xl font-medium mb-10">
            深度对标“龙头-中军-补涨”专业研判模型，实时计算联动性背离，预判行情转向。
          </p>

          <div className="max-w-2xl flex gap-3 p-2 bg-slate-100 rounded-[2rem] border border-slate-200">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="输入板块名称 (如: 商业航天, 机器人)..."
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
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 pointer-events-none">
           <Activity className="w-80 h-80 -mr-20 -mt-20" />
        </div>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 flex items-center gap-3 animate-fade-in shadow-sm">
          <AlertTriangle className="w-6 h-6" />
          <span className="text-base font-bold">{error}</span>
        </div>
      )}

      {data && (
        <div className="space-y-8 animate-slide-up">
          {/* Summary Verdict Banner */}
          <div className={`p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8 ${data.risk_score > 60 ? 'bg-gradient-to-br from-amber-700 to-rose-900' : 'bg-gradient-to-br from-indigo-900 to-blue-800'}`}>
             <div className="relative z-10 flex-1">
                <div className="flex items-center gap-3 mb-4">
                   <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${getStageColor(data.cycle_stage)}`}>{data.stage_label}</span>
                   <span className="text-sm font-bold opacity-60">行情状态研判</span>
                </div>
                <h3 className="text-3xl font-black mb-4">{data.sector_name} · 效能综合评估</h3>
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                   <p className="text-lg font-black italic leading-relaxed">"{data.action_advice}"</p>
                </div>
             </div>
             <div className="text-center relative z-10 bg-black/20 p-8 rounded-full border border-white/10 w-48 h-48 flex flex-col justify-center items-center">
                <div className="text-6xl font-black mb-1">{data.risk_score}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">风险指数</div>
             </div>
             <div className="absolute left-0 bottom-0 opacity-10 pointer-events-none">
                <Flame className="w-64 h-64 -ml-20 -mb-20" />
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             {/* Left: Tiers Ladder */}
             <div className="lg:col-span-8 space-y-6">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">板块梯队结构矩阵 (Tier Matrix)</h4>
                <div className="space-y-6">
                   {data.ladder.map((tier, idx) => (
                      <div key={idx} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-all">
                         <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
                            <span className="font-black text-slate-800 flex items-center gap-3 text-lg">
                               <div className={`w-3 h-3 rounded-full shadow-sm ${idx === 0 ? 'bg-rose-500 animate-pulse' : idx === 1 ? 'bg-indigo-500' : 'bg-slate-400'}`}></div>
                               {tier.tier}
                            </span>
                            <span className="text-xs font-bold text-slate-400 uppercase bg-slate-200/50 px-3 py-1 rounded-full">{tier.stocks.length} 核心标的</span>
                         </div>
                         <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tier.stocks.map((stock, sIdx) => (
                               <div key={sIdx} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-400 hover:bg-white transition-all shadow-sm">
                                  <div className="flex justify-between items-start mb-3">
                                     <div>
                                        <div className="font-black text-slate-800 text-lg flex items-center gap-2">
                                           {stock.name} 
                                           <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{stock.code}</span>
                                        </div>
                                        <div className="text-[10px] font-black text-slate-400 mt-1 uppercase">{stock.performance}</div>
                                     </div>
                                     <div className="flex flex-col items-end gap-1">
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                                           stock.status === 'Leading' ? 'bg-rose-100 text-rose-600 border border-rose-200' : 
                                           stock.status === 'Stagnant' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 
                                           stock.status === 'Following' ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-slate-200 text-slate-500'
                                        }`}>{stock.status}</span>
                                        <div className="text-[9px] font-bold text-slate-400">健康度: {stock.health_score}%</div>
                                     </div>
                                  </div>
                                  <p className="text-sm text-slate-500 font-medium leading-relaxed italic border-t border-slate-100 pt-3">
                                     "{stock.logic}"
                                  </p>
                               </div>
                            ))}
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             {/* Right: Structural Logic */}
             <div className="lg:col-span-4 space-y-8">
                {/* 支撑点 */}
                <div className="bg-emerald-50 rounded-[2rem] border border-emerald-100 p-8 shadow-sm">
                   <h4 className="text-xs font-black text-emerald-700 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" /> 行情延续支撑点
                   </h4>
                   <ul className="space-y-4">
                      {data.support_points.map((p, i) => (
                         <li key={i} className="flex gap-3 text-sm font-bold text-emerald-900 bg-white/60 p-4 rounded-2xl border border-emerald-100 shadow-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            {p}
                         </li>
                      ))}
                   </ul>
                </div>

                {/* 警示信号 */}
                <div className="bg-rose-50 rounded-[2rem] border border-rose-100 p-8 shadow-sm">
                   <h4 className="text-xs font-black text-rose-700 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5" /> 行情终结警示信号
                   </h4>
                   <ul className="space-y-4">
                      {data.warning_signals.map((p, i) => (
                         <li key={i} className="flex gap-3 text-sm font-bold text-rose-900 bg-white/60 p-4 rounded-2xl border border-rose-100 shadow-sm">
                            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                            {p}
                         </li>
                      ))}
                   </ul>
                </div>

                {/* 协同度诊断 */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-500" /> 联动性结构诊断
                   </h4>
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <span className="text-sm font-bold text-slate-600">龙补协同度</span>
                         <span className="text-2xl font-black text-indigo-600">{data.structural_integrity.synergy_score}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                         <div className="bg-indigo-500 h-full transition-all duration-1000" style={{width: `${data.structural_integrity.synergy_score}%`}}></div>
                      </div>
                      <div className={`p-6 rounded-2xl border shadow-sm ${data.structural_integrity.is_divergent ? 'bg-amber-50 border-amber-100 text-amber-900' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
                         <p className="text-sm font-black leading-relaxed">
                            {data.structural_integrity.verdict}
                         </p>
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
