import React, { useState, useEffect } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, MacroDeductionData } from '../types';
import { fetchMacroForecaster } from '../services/geminiService';
import { Telescope, Loader2, Search, Zap, Calendar, History, TrendingUp, ShieldAlert, Cpu, ArrowRight, Lightbulb, Rocket, Target, AlertTriangle } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';

interface MacroForecasterProps {
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: UserSettings;
  onOpenSettings?: () => void;
}

export const MacroForecaster: React.FC<MacroForecasterProps> = ({
  currentModel,
  currentMarket,
  settings,
  onOpenSettings
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputData, setInputData] = useState("商业航天 十五五规划 长征十二号甲");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleDeduce = async () => {
    if (!inputData.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Fix: Removed settings.geminiKey as fetchMacroForecaster only accepts inputData and market
      const data = await fetchMacroForecaster(inputData, currentMarket);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "推演失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl shadow-xl p-8 relative overflow-hidden text-white border border-slate-700">
         <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
               <div className="p-3 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20">
                  <Telescope className="w-8 h-8 text-white" />
               </div>
               <div>
                  <h2 className="text-2xl font-bold">深度宏观推演 (Strategic Forecaster)</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    结合最新消息面与“十五五”战略规划，洞察未来 1-60 个月的板块轮动与投资机遇。
                  </p>
               </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row gap-3">
               <div className="flex-1 relative">
                  <textarea
                    value={inputData}
                    onChange={(e) => setInputData(e.target.value)}
                    placeholder="输入关键词、新闻碎片或规划主题（如：商业航天、低空经济、国产替代）..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl p-4 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none h-24"
                  />
               </div>
               <button
                 onClick={handleDeduce}
                 disabled={loading || !inputData}
                 className="flex flex-col items-center justify-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
               >
                 {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-xs font-mono">{elapsed}s</span>
                    </>
                 ) : (
                    <>
                      <Zap className="w-6 h-6" />
                      <span>开始推演</span>
                    </>
                 )}
               </button>
            </div>
         </div>
         <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-600/10 blur-[100px] rounded-full"></div>
         <div className="absolute left-1/4 top-0 w-40 h-40 bg-blue-600/10 blur-[80px] rounded-full"></div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/20 border border-rose-900/50 rounded-xl flex items-center gap-3 text-rose-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Result View */}
      {result && result.macroData && (
        <div className="space-y-8 animate-slide-up pb-12">
          
          {/* Summary Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
             <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2">
                <Lightbulb className="w-4 h-4" /> 核心推演摘要
             </div>
             <p className="text-slate-700 text-lg leading-relaxed font-medium">
                {result.macroData.summary}
             </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             
             {/* 1. Short-term Outlook (1-2 Months) */}
             <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                   <Calendar className="w-5 h-5 text-blue-500" />
                   下月催化展望 ({result.macroData.short_term_outlook.period})
                </h3>
                <div className="space-y-4">
                   {result.macroData.short_term_outlook.top_sectors.map((s, idx) => (
                      <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-400 transition-colors shadow-sm">
                         <div className="flex justify-between items-start mb-3">
                            <h4 className="text-lg font-bold text-slate-900">{s.name}</h4>
                            <div className="flex flex-col items-end">
                               <span className="text-[10px] text-slate-400 uppercase font-bold">预期热度</span>
                               <span className="text-xl font-black text-blue-600">{s.heat_index}</span>
                            </div>
                         </div>
                         <p className="text-sm text-slate-600 mb-4">{s.logic}</p>
                         <div className="flex flex-wrap gap-2">
                            {s.catalysts.map((c, i) => (
                               <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-[11px] font-bold rounded border border-blue-100 flex items-center gap-1">
                                  <Zap className="w-3 h-3" /> {c}
                               </span>
                            ))}
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             {/* 2. Logic Chain & Timeline */}
             <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                   <TrendingUp className="w-5 h-5 text-emerald-500" />
                   推演逻辑链 (Logic Chain)
                </h3>
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-6 relative">
                   <div className="absolute left-9 top-10 bottom-10 w-0.5 bg-slate-200"></div>
                   {result.macroData.logic_chain.map((step, idx) => (
                      <div key={idx} className="relative flex gap-6 group">
                         <div className="w-6 h-6 rounded-full bg-white border-4 border-emerald-500 shrink-0 z-10 group-hover:scale-125 transition-transform"></div>
                         <div>
                            <div className="text-xs font-black text-emerald-600 uppercase mb-1">{step.event}</div>
                            <div className="text-sm font-bold text-slate-800 mb-1">传导效应: {step.impact}</div>
                            <p className="text-xs text-slate-500">最终指向: {step.result}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             {/* 3. 15th Plan Foresight (Full Width) */}
             <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                         <Rocket className="w-6 h-6 text-indigo-300" />
                      </div>
                      <h3 className="text-xl font-bold">“十五五”规划战略前瞻 (Strategic Foresight)</h3>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-4">
                         <div className="text-indigo-300 text-xs font-bold uppercase tracking-widest">核心主题</div>
                         <div className="text-2xl font-bold">{result.macroData.strategic_planning_15th.theme}</div>
                         <p className="text-slate-400 text-sm leading-relaxed">{result.macroData.strategic_planning_15th.vision}</p>
                      </div>

                      <div className="space-y-4">
                         <div className="text-indigo-300 text-xs font-bold uppercase tracking-widest">潜在国家冠军板块</div>
                         <div className="flex flex-wrap gap-2">
                            {result.macroData.strategic_planning_15th.potential_winners.map((w, i) => (
                               <div key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">
                                  {w}
                               </div>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="text-indigo-300 text-xs font-bold uppercase tracking-widest">关键政策指标</div>
                         <ul className="space-y-2">
                            {result.macroData.strategic_planning_15th.key_policy_indicators.map((k, i) => (
                               <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                  <Target className="w-4 h-4 text-indigo-500" />
                                  {k}
                               </li>
                            ))}
                         </ul>
                      </div>
                   </div>
                </div>
                <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
             </div>

             {/* 4. Risk Alert */}
             <div className="lg:col-span-2 bg-rose-50 border border-rose-100 rounded-xl p-6">
                <h4 className="text-sm font-bold text-rose-800 flex items-center gap-2 mb-2">
                   <ShieldAlert className="w-4 h-4" /> 推演失效风险
                </h4>
                <p className="text-sm text-rose-700 leading-relaxed">
                   {result.macroData.risk_warning}
                </p>
             </div>
          </div>

          {/* Data Sources */}
          {result.groundingSource && result.groundingSource.length > 0 && (
            <div className="text-center text-[11px] text-slate-400">
               * 基于 Google Search 提供的最新实时公开数据推演。
            </div>
          )}
        </div>
      )}
    </div>
  );
};