
import React, { useState, useEffect } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { Telescope, Loader2, Zap, Calendar, TrendingUp, Lightbulb, Rocket, Target, AlertTriangle } from 'lucide-react';
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
    if (currentModel === ModelProvider.HUNYUAN_CN && !settings.hunyuanKey) {
      setError("您当前选择了腾讯混元模型，请在设置中配置 API Key。");
      onOpenSettings?.();
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await analyzeWithLLM(currentModel, inputData, true, settings, false, 'day', undefined, currentMarket, true);
      if (!data.macroData && data.content) {
         try {
           const jsonMatch = data.content.match(/\{[\s\S]*\}/);
           if (jsonMatch) data.macroData = JSON.parse(jsonMatch[0]);
         } catch (e) { console.warn(e); }
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || "推演失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900 rounded-2xl shadow-xl p-8 relative overflow-hidden text-white border border-slate-700">
         <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
               <div className="p-3 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20"><Telescope className="w-8 h-8 text-white" /></div>
               <div>
                  <h2 className="text-2xl font-bold">深度宏观推演</h2>
                  <p className="text-slate-400 text-sm mt-1">结合消息面与“十五五”规划，洞察未来板块轮动与投资机遇。</p>
               </div>
            </div>
            <div className="mt-8 flex flex-col md:flex-row gap-3">
               <textarea value={inputData} onChange={(e) => setInputData(e.target.value)} placeholder="输入关键词（如：国产替代、大飞机、低空经济）..." className="flex-1 bg-slate-800 border border-slate-600 rounded-xl p-4 text-slate-100 outline-none h-24 transition-all focus:ring-2 focus:ring-indigo-500" />
               <button onClick={handleDeduce} disabled={loading || !inputData} className="flex flex-col items-center justify-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold disabled:opacity-50 min-w-[160px]">
                 {loading ? <><Loader2 className="w-6 h-6 animate-spin" /><span className="text-xs font-mono">{elapsed}s</span></> : <><Zap className="w-6 h-6" /><span>开始推演</span></>}
               </button>
            </div>
         </div>
      </div>

      {error && <div className="p-4 bg-rose-950/20 border border-rose-900/50 rounded-xl flex items-center gap-3 text-rose-400"><AlertTriangle className="w-5 h-5" />{error}</div>}

      {result?.macroData && (
        <div className="space-y-8 animate-slide-up pb-12">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
             <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase mb-2"><Lightbulb className="w-4 h-4" /> 核心推演摘要</div>
             <p className="text-slate-700 text-lg leading-relaxed">{result.macroData.summary}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-500" /> 下月展望 ({result.macroData.short_term_outlook?.period})</h3>
                <div className="space-y-4">{result.macroData.short_term_outlook?.top_sectors?.map((s, idx) => (
                      <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-400 transition-colors">
                         <div className="flex justify-between items-start mb-2"><h4 className="text-lg font-bold text-slate-900">{s.name}</h4><span className="text-xl font-black text-blue-600">{s.heat_index}</span></div>
                         <p className="text-sm text-slate-600 mb-3">{s.logic}</p>
                         <div className="flex flex-wrap gap-2">{s.catalysts?.map((c, i) => (<span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">#{c}</span>))}</div>
                      </div>
                   ))}</div>
             </div>

             <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" /> 推演逻辑链</h3>
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-6 relative">
                   {result.macroData.logic_chain?.map((step, idx) => (
                      <div key={idx} className="relative flex gap-6">
                         <div className="w-6 h-6 rounded-full bg-white border-4 border-emerald-500 shrink-0 z-10"></div>
                         <div><div className="text-xs font-black text-emerald-600 uppercase mb-1">{step.event}</div><p className="text-sm text-slate-800 font-medium">传导效应: {step.impact}</p></div>
                      </div>
                   ))}
                </div>
             </div>

             <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-8 text-white">
                <div className="flex items-center gap-3 mb-6"><Rocket className="w-6 h-6 text-indigo-300" /><h3 className="text-xl font-bold">“十五五”战略规划前瞻</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="space-y-1"><div className="text-indigo-300 text-xs font-bold">核心主题</div><div className="text-xl font-bold">{result.macroData.strategic_planning_15th?.theme}</div><p className="text-slate-400 text-sm">{result.macroData.strategic_planning_15th?.vision}</p></div>
                   <div className="space-y-1"><div className="text-indigo-300 text-xs font-bold">潜伏冠军板块</div><div className="flex flex-wrap gap-1">{result.macroData.strategic_planning_15th?.potential_winners?.map((w, i) => (<span key={i} className="px-2 py-1 bg-white/5 rounded text-sm">{w}</span>))}</div></div>
                   <div className="space-y-1"><div className="text-indigo-300 text-xs font-bold">关键政策指标</div><ul className="text-sm text-slate-300">{result.macroData.strategic_planning_15th?.key_policy_indicators?.map((k, i) => (<li key={i} className="flex items-center gap-2"><Target className="w-3 h-3 text-indigo-500" />{k}</li>))}</ul></div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
