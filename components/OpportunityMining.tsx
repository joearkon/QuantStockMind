
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { fetchOpportunityMining } from '../services/opportunityService';
import { fetchHighFreqSurveys } from '../services/institutionService';
import { Radar, Loader2, Link2, Zap, AlertTriangle, Search, Shuffle, Factory, BrainCircuit, ArrowRight, Activity, Wallet, Crosshair, Calendar, Target, Sparkles, TrendingUp, Info, Users, Globe, Building2, ChevronRight, Clock } from 'lucide-react';

interface OpportunityMiningProps {
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: UserSettings;
  onOpenSettings?: () => void;
}

export const OpportunityMining: React.FC<OpportunityMiningProps> = ({
  currentModel,
  currentMarket,
  settings,
  onOpenSettings
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [mode, setMode] = useState<'chain' | 'survey' | 'foresight'>('survey'); // 默认改为最有确定性的机构风向标
  const [inputData, setInputData] = useState("");
  
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState("");

  useEffect(() => {
    setResult(null);
    setError(null);
    setInputData("");
  }, [mode]);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (loading) {
      if (mode === 'survey') setPhase("正在扫描机构席位与最近一周高频调研纪要...");
      else if (mode === 'foresight') setPhase("正在锁定未来30-60天重大政策与工程节点...");
      else setPhase("正在构建产业链价值共振图谱...");
    }
  }, [elapsed, loading, mode]);

  const handleMine = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let data: AnalysisResult;
      if (mode === 'survey') {
         data = await fetchHighFreqSurveys(currentMarket, "");
      } else {
         data = await fetchOpportunityMining(currentModel, currentMarket, settings, inputData, mode === 'chain' ? 'chain' : 'foresight');
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || "由于网络或配额原因，分析中断。");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToStock = (code: string, name: string) => {
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-24">
      {/* 顶部专业投研看板 */}
      <div className="bg-slate-950 rounded-[3rem] shadow-2xl p-8 md:p-12 relative overflow-hidden text-white border-b-8 border-indigo-500">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
           <Building2 className="w-96 h-96 -mr-20 -mt-20" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-12">
             <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-6">
                   <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
                      <Sparkles className="w-7 h-7 text-white" />
                   </div>
                   <span className="text-xs font-black uppercase tracking-[0.5em] text-indigo-400">RESEARCH ALPHA CENTER</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">投研金矿 <span className="text-indigo-500">.</span></h2>
                <p className="text-slate-400 text-lg font-medium leading-relaxed">
                   融合机构**调研雷达**、**产业链映射**与**确定性事件前瞻**。AI 实时穿透海量研报，挖掘尚未定价的逻辑差。
                </p>
             </div>
             
             <div className="flex bg-white/5 p-1.5 rounded-2xl backdrop-blur-md border border-white/10">
                <button 
                  onClick={() => setMode('survey')}
                  className={`px-6 py-3 text-sm font-black rounded-xl transition-all ${mode === 'survey' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                >
                   机构风向标
                </button>
                <button 
                  onClick={() => setMode('chain')}
                  className={`px-6 py-3 text-sm font-black rounded-xl transition-all ${mode === 'chain' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                >
                   产业链挖掘
                </button>
                <button 
                  onClick={() => setMode('foresight')}
                  className={`px-6 py-3 text-sm font-black rounded-xl transition-all ${mode === 'foresight' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                >
                   题材前瞻
                </button>
             </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
             {mode !== 'survey' && (
                <div className="flex-1 relative group">
                   <input 
                     type="text" 
                     value={inputData}
                     onChange={(e) => setInputData(e.target.value)}
                     placeholder={mode === 'chain' ? "输入关注个股 (如“宁德时代”)，挖掘逻辑共振..." : "输入题材关键字 (如“机器人”)，预测爆发节点..."} 
                     className="w-full h-16 pl-14 pr-4 bg-white/5 border-2 border-white/10 rounded-2xl focus:bg-white focus:text-slate-900 focus:border-indigo-500 outline-none font-bold text-lg transition-all"
                   />
                   <Search className="w-6 h-6 text-slate-500 absolute left-5 top-1/2 -translate-y-1/2" />
                </div>
             )}
             
             <button
               onClick={handleMine}
               disabled={loading || (mode !== 'survey' && !inputData)}
               className={`h-16 px-12 font-black text-white rounded-2xl shadow-2xl transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-3 text-lg bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30`}
             >
               {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 text-amber-400" />}
               {loading ? `投研扫描中 (${elapsed}s)` : mode === 'survey' ? '立即同步机构动向' : '开始扫描金矿'}
             </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="py-32 flex flex-col items-center justify-center bg-white rounded-[3.5rem] border-2 border-dashed border-slate-200 animate-pulse">
          <Radar className="w-20 h-20 mb-8 text-indigo-500 animate-spin-slow" />
          <p className="font-black text-slate-800 text-2xl tracking-tight">{phase}</p>
          <p className="text-slate-400 text-sm mt-3 font-bold flex items-center gap-2">
            <Globe className="w-4 h-4" /> 正在调取全网实时数据，包含公开纪要与政策文件...
          </p>
        </div>
      )}

      {error && (
        <div className="p-10 bg-rose-50 border border-rose-100 rounded-[2.5rem] flex items-center gap-8 text-rose-700 shadow-sm animate-shake">
          <AlertTriangle className="w-10 h-10 shrink-0" />
          <div>
             <span className="font-black text-xl block">Alpha 扫描失败</span>
             <span className="text-sm font-bold opacity-75">{error}</span>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-10 animate-slide-up">
          
          {/* Summary Banner - 统一风格 */}
          <div className={`p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border-b-8 ${mode === 'foresight' ? 'bg-rose-950 border-rose-500' : 'bg-indigo-950 border-indigo-500'}`}>
             <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-4 flex items-center gap-2">
                <Info className="w-4 h-4" /> AI 核心洞察摘要 (Alpha Insight)
             </h3>
             <p className="text-2xl md:text-3xl font-black italic leading-relaxed">
                "{result.hotlistData?.summary || result.opportunityData?.analysis_summary || result.foresightData?.macro_policy_insight || '正在解析结论...'}"
             </p>
          </div>

          {/* 机构风向标视图 */}
          {mode === 'survey' && result.hotlistData && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {result.hotlistData.ranking.map((stock, idx) => (
                   <div key={idx} className="group bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-2xl transition-all duration-300">
                      <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                         <span className="text-3xl font-black text-indigo-600">#{idx + 1}</span>
                         <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${stock.potential_rating === 'High' ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>
                            {stock.potential_rating} 评级
                         </div>
                      </div>
                      <div className="p-8">
                         <h4 className="text-2xl font-black text-slate-900 mb-2">{stock.name}</h4>
                         <span className="text-xs font-mono font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{stock.code}</span>
                         
                         <div className="mt-8 flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600"><Users className="w-6 h-6" /></div>
                            <div className="flex flex-col">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">机构调研强度</span>
                               <span className="text-sm font-black text-slate-800">{stock.visit_frequency}</span>
                            </div>
                         </div>

                         <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold text-slate-600 leading-relaxed italic min-h-[120px] group-hover:bg-white transition-colors">
                            "{stock.core_logic}"
                         </div>
                         
                         <button 
                           onClick={() => handleNavigateToStock(stock.code, stock.name)}
                           className="mt-8 w-full py-4 bg-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-[0.3em] group-hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
                         >
                            发起个股深度穿透
                         </button>
                      </div>
                   </div>
                ))}
             </div>
          )}

          {/* 题材前瞻日历 - 重点增强展示效果 */}
          {mode === 'foresight' && result.foresightData?.catalysts && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {result.foresightData.catalysts.map((cat, idx) => (
                   <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all border-b-8 border-rose-100">
                      <div className="bg-rose-50 px-8 py-5 border-b border-rose-100 flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-rose-600" />
                            <span className="text-rose-900 font-black text-sm">{cat.date_window}</span>
                         </div>
                         <span className="text-[10px] font-black text-rose-500 bg-white border border-rose-200 px-3 py-1 rounded-full uppercase">{cat.opportunity_level} 强度</span>
                      </div>
                      <div className="p-10 flex-1 flex flex-col">
                         <h4 className="text-2xl font-black text-slate-900 mb-3">{cat.event_name}</h4>
                         <div className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> {cat.theme_label}
                         </div>
                         <p className="text-sm text-slate-600 font-bold leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 flex-1 italic group-hover:bg-white transition-all">
                            {cat.logic_chain}
                         </p>
                         <div className="space-y-4">
                            <div className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2 px-1">
                               <Target className="w-4 h-4" /> 潜伏标的库
                            </div>
                            <div className="flex flex-wrap gap-2">
                               {cat.suggested_stocks.map((s, si) => (
                                  <button key={si} onClick={() => handleNavigateToStock("", s)} className="px-4 py-2 bg-white border-2 border-slate-100 rounded-xl text-xs font-black text-slate-700 hover:border-rose-400 hover:text-rose-600 hover:shadow-md transition-all">
                                     {s}
                                  </button>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          )}

          {/* 产业链逻辑挖掘视图 */}
          {mode === 'chain' && result.opportunityData?.supply_chain_matrix && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {result.opportunityData.supply_chain_matrix.map((chain, idx) => (
                   <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-2xl transition-all">
                      <div className="bg-indigo-50 px-10 py-6 border-b border-indigo-100 flex justify-between items-center">
                         <h3 className="font-black text-slate-900 text-xl flex items-center gap-4">
                            <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600"><Factory className="w-7 h-7" /></div>
                            {chain.user_holding}
                         </h3>
                         <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-white border px-4 py-1.5 rounded-full">产业链共振</span>
                      </div>
                      <div className="p-10 space-y-6">
                         {chain.opportunities.map((opp, oIdx) => (
                            <div key={oIdx} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-indigo-400 hover:bg-white transition-all shadow-sm">
                               <div className="flex justify-between items-start mb-4">
                                  <div className="flex flex-col">
                                     <div className="font-black text-indigo-700 text-2xl flex items-center gap-3">
                                        {opp.stock_name}
                                        <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 bg-white border rounded">{opp.stock_code}</span>
                                     </div>
                                     <div className="flex items-center gap-2 mt-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{opp.relation_type}</span>
                                     </div>
                                  </div>
                                  <button onClick={() => handleNavigateToStock(opp.stock_code, opp.stock_name)} className="p-3 bg-white text-slate-300 hover:text-indigo-600 hover:shadow-lg rounded-2xl transition-all shadow-sm"><ArrowRight className="w-6 h-6" /></button>
                               </div>
                               <p className="text-sm text-slate-600 font-bold leading-relaxed mb-6 italic">"{opp.logic_core}"</p>
                               <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 inline-flex items-center gap-2">
                                  <Target className="w-3.5 h-3.5" /> 政策匹配: {opp.policy_match}
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                ))}
             </div>
          )}

          <div className="text-center pt-12 pb-20">
             <div className="inline-flex items-center gap-4 px-10 py-5 bg-slate-900 rounded-full text-[11px] text-indigo-300 font-black uppercase tracking-[0.5em] shadow-2xl">
                <Info className="w-5 h-5 text-indigo-500" /> AI 分析结果基于海量非结构化研报聚合推演 · 仅供研究参考
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
