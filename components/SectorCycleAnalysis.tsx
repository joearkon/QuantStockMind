
import React, { useState } from 'react';
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { fetchSectorLadderAnalysis } from '../services/geminiService';
import { Layers, Loader2, Search, Zap, AlertTriangle, ShieldCheck, TrendingUp, Info, Activity, Flame, Target, ShieldAlert, CheckCircle2, BookOpen, Triangle, Gauge } from 'lucide-react';

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

  // 获取风险等级主题色 - 严格对齐逻辑
  const getRiskTheme = (score: number) => {
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

  const theme = data ? getRiskTheme(data.risk_score) : null;

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
              {showGuide ? '收起图例说明' : '看懂风险评分'}
            </button>
          </div>
          
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

        {/* --- GUIDE MODULE --- */}
        {showGuide && (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-slate-50 rounded-[3rem] border-2 border-slate-200 animate-slide-down relative z-10 shadow-2xl">
             <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2 border-b-2 border-indigo-100 pb-2 w-fit">
                   <Activity className="w-5 h-5 text-indigo-500" /> 第一步：识别生命周期
                </h4>
                <div className="space-y-4">
                   {[
                     { id: 'Starting', label: '启动期', desc: '刚从底部放量，赚钱效应初现，最安全介入点。', color: 'bg-emerald-500' },
                     { id: 'Growing', label: '发酵期', desc: '中军联动走强，共识达成，主升浪行情。', color: 'bg-blue-500' },
                     { id: 'Climax', label: '高潮期', desc: '补涨满天飞，缩量连板，虽然最快但风险极高。', color: 'bg-rose-500' },
                     { id: 'End', label: '末期分歧', desc: '龙头滞涨回落，补涨批量炸板，行情转折点。', color: 'bg-amber-600' },
                     { id: 'Receding', label: '退潮期', desc: '资金大举流出，仅余个别标的抵抗，建议回避。', color: 'bg-slate-600' },
                   ].map(s => (
                     <div key={s.id} className="flex gap-4 items-start p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
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
                   <Target className="w-5 h-5 text-rose-500" /> 第二步：理解风险分数 (0-100)
                </h4>
                <div className="space-y-4">
                   <div className="p-4 bg-white rounded-2xl border-2 border-emerald-50 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-emerald-600 flex items-center gap-1">0-30 极低风险 (萌芽区)</span>
                        <span className="text-[10px] text-slate-400 font-black">适合潜伏 / 布局</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden"><div className="bg-emerald-500 w-[30%] h-full"></div></div>
                   </div>
                   <div className="p-4 bg-white rounded-2xl border-2 border-blue-50 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-blue-600 flex items-center gap-1">31-60 中等风险 (博弈区)</span>
                        <span className="text-[10px] text-slate-400 font-black">趋势持股 / 加仓</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden"><div className="bg-blue-500 w-[60%] h-full"></div></div>
                   </div>
                   <div className="p-4 bg-white rounded-2xl border-2 border-amber-50 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-amber-600 flex items-center gap-1">61-80 高度风险 (警示区)</span>
                        <span className="text-[10px] text-slate-400 font-black">逢高减仓 / 止盈</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden"><div className="bg-amber-600 w-[80%] h-full"></div></div>
                   </div>
                   <div className="p-4 bg-white rounded-2xl border-2 border-rose-50 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-rose-600 flex items-center gap-1">81-100 极端危险 (崩塌区)</span>
                        <span className="text-[10px] text-slate-400 font-black">强制空仓 / 撤离</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden"><div className="bg-rose-600 w-full h-full"></div></div>
                   </div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-[10px] text-indigo-700 font-bold leading-relaxed">
                   💡 <b>实战总结</b>：分数越低，介入位置越好；分数越高，行情越接近尾声，千万不要被高涨幅蒙蔽双眼。
                </div>
             </div>
          </div>
        )}
        
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

      {data && theme && (
        <div className="space-y-8 animate-slide-up">
          {/* Summary Verdict Banner - Color Aligned with Score */}
          <div className={`p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-10 ${theme.bg}`}>
             <div className="relative z-10 flex-1">
                <div className="flex items-center gap-3 mb-4">
                   <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-white/20 backdrop-blur-md border border-white/20`}>{data.stage_label}</span>
                   <span className="text-sm font-bold opacity-70">| 行情状态智能研判</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-black mb-6 drop-shadow-md">{data.sector_name} · 效能全景评估</h3>
                <div className="bg-black/10 backdrop-blur-lg p-8 rounded-[2.5rem] border border-white/10 shadow-inner">
                   <p className="text-lg md:text-xl font-black italic leading-relaxed text-white/95">"{data.action_advice}"</p>
                </div>
             </div>
             
             {/* Enhanced Risk Barometer Display */}
             <div className="text-center relative z-10 bg-white/10 backdrop-blur-md p-10 rounded-full border-8 border-white/10 w-64 h-64 flex flex-col justify-center items-center group shadow-2xl transition-transform hover:scale-105">
                <div className={`absolute inset-0 rounded-full opacity-20 blur-xl animate-pulse ${theme.bg}`}></div>
                <div className="text-7xl font-black mb-1 tracking-tighter drop-shadow-lg">{Math.round(data.risk_score)}</div>
                <div className="text-[11px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">风险指数 (Risk)</div>
                <div className={`text-[12px] font-black px-4 py-1.5 bg-white rounded-full ${theme.text} shadow-lg uppercase tracking-widest border-b-2 border-slate-200`}>
                   评价：{theme.label}
                </div>
                <div className="mt-3 text-[9px] font-bold text-white/60 tracking-tight">
                   (0 = 极度安全 / 100 = 随时崩盘)
                </div>
             </div>

             <div className="absolute left-0 bottom-0 opacity-10 pointer-events-none scale-150 origin-bottom-left">
                <Gauge className="w-64 h-64" />
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             {/* Left: Tiers Ladder */}
             <div className="lg:col-span-8 space-y-6">
                <div className="flex justify-between items-center px-4">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">板块梯队结构矩阵 (Tier Matrix)</h4>
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">全网研报实时对标中</span>
                   </div>
                </div>
                <div className="space-y-6">
                   {data.ladder.map((tier, idx) => (
                      <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl transition-all">
                         <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                            <span className="font-black text-slate-800 flex items-center gap-3 text-lg">
                               <div className={`w-4 h-4 rounded-full shadow-inner ${idx === 0 ? 'bg-rose-500 animate-pulse' : idx === 1 ? 'bg-indigo-500' : 'bg-slate-400'}`}></div>
                               {tier.tier}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 uppercase bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">{tier.stocks.length} 个核心标的</span>
                         </div>
                         <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
                            {tier.stocks.map((stock, sIdx) => (
                               <div key={sIdx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-indigo-400 hover:bg-white transition-all shadow-sm">
                                  <div className="flex justify-between items-start mb-4">
                                     <div>
                                        <div className="font-black text-slate-800 text-xl flex items-center gap-2">
                                           {stock.name} 
                                           <span className="text-[11px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100">{stock.code}</span>
                                        </div>
                                        <div className="text-[11px] font-black text-slate-400 mt-2 uppercase tracking-wide">{stock.performance}</div>
                                     </div>
                                     <div className="flex flex-col items-end gap-1.5">
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-xl shadow-sm border ${
                                           stock.status === 'Leading' ? 'bg-rose-100 text-rose-600 border-rose-200' : 
                                           stock.status === 'Stagnant' ? 'bg-amber-100 text-amber-600 border-amber-200' : 
                                           stock.status === 'Following' ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-slate-200 text-slate-500 border-slate-300'
                                        }`}>{stock.status}</span>
                                        <div className="text-[10px] font-black text-slate-400 opacity-60">健康度 {stock.health_score}%</div>
                                     </div>
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

             {/* Right: Structural Logic */}
             <div className="lg:col-span-4 space-y-8">
                {/* 支撑点 */}
                <div className="bg-emerald-50 rounded-[2.5rem] border-2 border-emerald-100 p-8 shadow-sm">
                   <h4 className="text-[11px] font-black text-emerald-700 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" /> 行情延续支撑点
                   </h4>
                   <ul className="space-y-4">
                      {data.support_points.map((p, i) => (
                         <li key={i} className="flex gap-4 text-sm font-bold text-emerald-900 bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm transition-transform hover:scale-[1.02]">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            {p}
                         </li>
                      ))}
                   </ul>
                </div>

                {/* 警示信号 */}
                <div className="bg-rose-50 rounded-[2.5rem] border-2 border-rose-100 p-8 shadow-sm">
                   <h4 className="text-[11px] font-black text-rose-700 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5" /> 行情终结警示信号
                   </h4>
                   <ul className="space-y-4">
                      {data.warning_signals.map((p, i) => (
                         <li key={i} className="flex gap-4 text-sm font-bold text-rose-900 bg-white p-4 rounded-2xl border border-rose-100 shadow-sm transition-transform hover:scale-[1.02]">
                            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                            {p}
                         </li>
                      ))}
                   </ul>
                </div>

                {/* 协同度诊断 */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-500" /> 联动性结构诊断
                   </h4>
                   <div className="space-y-8">
                      <div className="flex items-end justify-between">
                         <div>
                            <span className="text-xs font-black text-slate-400 uppercase block mb-1">龙补协同度</span>
                            <span className="text-4xl font-black text-indigo-600 tracking-tighter">{data.structural_integrity.synergy_score}%</span>
                         </div>
                         <div className="text-right">
                             <div className={`text-[10px] font-black px-3 py-1 rounded-full inline-block ${data.structural_integrity.is_divergent ? 'bg-amber-100 text-amber-600 shadow-sm' : 'bg-indigo-100 text-indigo-600 shadow-sm'}`}>
                                {data.structural_integrity.is_divergent ? '结构背离' : '结构健康'}
                             </div>
                         </div>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                         <div className="bg-indigo-500 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{width: `${data.structural_integrity.synergy_score}%`}}></div>
                      </div>
                      <div className={`p-6 rounded-3xl border shadow-sm ${data.structural_integrity.is_divergent ? 'bg-amber-50 border-amber-100 text-amber-900' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
                         <p className="text-sm font-black leading-relaxed italic text-center">
                            "{data.structural_integrity.verdict}"
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
