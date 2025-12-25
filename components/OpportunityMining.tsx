
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { fetchOpportunityMining } from '../services/opportunityService';
import { Radar, Loader2, Link2, Zap, AlertTriangle, Search, Shuffle, Factory, BrainCircuit, ArrowRight, Activity, Wallet, Crosshair, Calendar, Target, Sparkles, TrendingUp, Info } from 'lucide-react';

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
  
  const [mode, setMode] = useState<'chain' | 'deploy' | 'foresight'>('chain');
  const [inputData, setInputData] = useState("");
  
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState("");

  useEffect(() => {
    if (mode === 'chain') setInputData("");
    else if (mode === 'deploy') setInputData("综合/稳健趋势");
    else setInputData(""); 
    setResult(null);
    setError(null);
  }, [mode]);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  useEffect(() => {
    if (loading) {
      if (elapsed < 5) setPhase("正在联网检索最新政策与产业公告...");
      else if (elapsed < 12) setPhase("AI 正在构建产业链图谱并计算关联度...");
      else setPhase("正在为您筛选并格式化高胜率标的...");
    }
  }, [elapsed, loading]);

  const handleMine = async () => {
    if (!settings.geminiKey && !process.env.API_KEY && currentModel === ModelProvider.GEMINI_INTL) {
      if (onOpenSettings) {
        onOpenSettings();
      } else {
        setError("未检测到 API Key，请在设置中配置。");
      }
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const data = await fetchOpportunityMining(currentModel, currentMarket, settings, inputData, mode);
      setResult(data);
    } catch (err: any) {
      console.error("Opportunity Mining Error:", err);
      setError(err.message || "分析中断，请检查 API 配置或网络。");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToStock = (code: string, name: string) => {
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Header Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-10 relative overflow-hidden">
        <div className="relative z-10">
          <div className="mb-8">
             <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4 mb-3">
                <div className={`p-3 rounded-2xl text-white shadow-xl ${mode === 'foresight' ? 'bg-rose-600 shadow-rose-200' : 'bg-indigo-600 shadow-indigo-200'}`}>
                  {mode === 'foresight' ? <Calendar className="w-7 h-7" /> : <BrainCircuit className="w-7 h-7" />}
                </div>
                {mode === 'foresight' ? '题材前瞻日历' : mode === 'chain' ? '产业链关联挖潜' : '资金配置选股'}
              </h2>
             <p className="text-slate-500 text-base max-w-2xl font-medium">
               利用 AI 深度扫描与全网数据实时检索，挖掘当前市场环境中隐蔽的投资机会与产业链共振点。
             </p>
          </div>

          <div className="flex space-x-8 border-b border-slate-100 mb-8 overflow-x-auto">
             <button 
               onClick={() => setMode('chain')}
               className={`pb-4 text-sm font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'chain' ? 'text-indigo-600 border-indigo-600 scale-105' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
             >
                <Link2 className="w-4 h-4" /> 持仓挖潜
             </button>
             <button 
               onClick={() => setMode('deploy')}
               className={`pb-4 text-sm font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'deploy' ? 'text-amber-600 border-amber-600 scale-105' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
             >
                <Wallet className="w-4 h-4" /> 资金选股
             </button>
             <button 
               onClick={() => setMode('foresight')}
               className={`pb-4 text-sm font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'foresight' ? 'text-rose-600 border-rose-600 scale-105' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
             >
                <Sparkles className="w-4 h-4" /> 题材前瞻
             </button>
          </div>

          <div className={`p-3 rounded-[2rem] border flex flex-col md:flex-row gap-3 ${mode === 'foresight' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'}`}>
             <div className="flex-1 relative">
                {mode === 'chain' && (
                  <>
                    <input 
                      type="text" 
                      value={inputData}
                      onChange={(e) => setInputData(e.target.value)}
                      placeholder="输入持有的股票名称或代码，挖掘产业链机会..." 
                      className="w-full h-14 pl-14 pr-4 bg-white rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-slate-700 text-lg transition-all"
                    />
                    <Factory className="w-6 h-6 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2" />
                  </>
                )}
                {mode === 'deploy' && (
                  <>
                    <select 
                       value={inputData}
                       onChange={(e) => setInputData(e.target.value)}
                       className="w-full h-14 pl-14 pr-4 bg-white rounded-2xl border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-50 outline-none font-bold text-slate-700 text-lg appearance-none transition-all cursor-pointer"
                    >
                       <option value="综合/稳健趋势">综合/稳健趋势</option>
                       <option value="激进/龙头战法">激进/龙头战法</option>
                       <option value="低吸/潜伏反弹">低吸/潜伏反弹</option>
                       <option value="机构/重仓价值">机构/重仓价值</option>
                    </select>
                    <Crosshair className="w-6 h-6 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2" />
                  </>
                )}
                {mode === 'foresight' && (
                  <>
                    <input 
                      type="text" 
                      value={inputData}
                      onChange={(e) => setInputData(e.target.value)}
                      placeholder="输入特定板块关键字 (如“卫星互联网”)..." 
                      className="w-full h-14 pl-14 pr-4 bg-white rounded-2xl border border-rose-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-50 outline-none font-bold text-slate-700 text-lg transition-all"
                    />
                    <Target className="w-6 h-6 text-rose-300 absolute left-5 top-1/2 -translate-y-1/2" />
                  </>
                )}
             </div>
             <button
              onClick={handleMine}
              disabled={loading}
              className={`px-10 h-14 font-black text-white rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-70 whitespace-nowrap flex items-center justify-center gap-3 text-lg ${mode === 'chain' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : mode === 'deploy' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'}`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {loading ? `分析中 (${elapsed}s)` : '立即扫描机会'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 animate-pulse">
          <BrainCircuit className={`w-14 h-14 mb-6 ${mode === 'chain' ? 'text-indigo-400' : mode === 'deploy' ? 'text-amber-400' : 'text-rose-400'}`} />
          <p className="font-black text-slate-500 text-lg tracking-tight">{phase}</p>
          <p className="text-slate-300 text-sm mt-2">AI 正在调取全网实时研报与公告数据...</p>
        </div>
      )}

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-700 max-w-3xl mx-auto shadow-sm">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <span className="font-bold text-base">{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-10 animate-slide-up">
          
          {/* Summary Banner - Centered to fix "all left" feeling */}
          <div className={`p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center ${mode === 'foresight' ? 'bg-rose-900 border-t-8 border-rose-500' : mode === 'chain' ? 'bg-indigo-900 border-t-8 border-indigo-500' : 'bg-slate-900 border-t-8 border-amber-500'}`}>
             <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <Radar className="w-96 h-96 -ml-20 -mt-20 animate-pulse" />
             </div>
             <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-60 mb-4 flex items-center gap-3">
                <Zap className="w-4 h-4" /> {result.opportunityData?.policy_theme || result.foresightData?.monthly_focus || '机会洞察总结'}
             </h3>
             <p className="text-xl md:text-2xl font-black leading-relaxed italic max-w-4xl">
                "{result.opportunityData?.analysis_summary || result.foresightData?.macro_policy_insight || '正在为您解析研判结果...'}"
             </p>
          </div>

          {/* Mode 1: Chain Matrix (持仓挖潜) - Improved Grid Balance */}
          {mode === 'chain' && result.opportunityData?.supply_chain_matrix && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {result.opportunityData.supply_chain_matrix.map((chain, idx) => (
                  <div key={idx} className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl transition-all ${result.opportunityData?.supply_chain_matrix?.length === 1 ? 'md:col-span-2 max-w-3xl mx-auto' : ''}`}>
                     <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center">
                        <span className="font-black text-slate-800 flex items-center gap-3 text-lg">
                           <Factory className="w-5 h-5 text-indigo-500" /> {chain.user_holding}
                        </span>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border border-slate-200 px-3 py-1 rounded-full">产业链共振点</span>
                     </div>
                     <div className="p-8 space-y-5">
                        {chain.opportunities.map((opp, oIdx) => (
                           <div key={oIdx} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-400 hover:bg-white transition-all shadow-sm hover:shadow-indigo-100">
                              <div className="flex justify-between items-start mb-3">
                                 <div>
                                    <div className="font-black text-indigo-700 text-xl flex items-center gap-3">
                                       {opp.stock_name} <span className="text-xs font-mono text-slate-400 px-2 py-0.5 bg-slate-100 rounded">{opp.stock_code}</span>
                                    </div>
                                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                       <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                       {opp.relation_type}
                                    </div>
                                 </div>
                                 <button onClick={() => handleNavigateToStock(opp.stock_code, opp.stock_name)} className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><ArrowRight className="w-5 h-5" /></button>
                              </div>
                              <p className="text-sm text-slate-600 font-bold leading-relaxed">{opp.logic_core}</p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 inline-block">🎯 {opp.policy_match}</div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                ))}
             </div>
          )}

          {/* Mode 2: Deployment (资金选股) - Balanced 1:2 Column Ratio */}
          {mode === 'deploy' && result.opportunityData?.deployment_plan && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-4">建议配置板块</h4>
                   {result.opportunityData.deployment_plan.focus_directions.map((dir, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-l-[10px] border-amber-500 hover:shadow-lg transition-all">
                         <div className="flex justify-between items-center mb-3">
                            <span className="font-black text-slate-800 text-lg">{dir.sector}</span>
                            <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">{dir.inflow_status}</span>
                         </div>
                         <p className="text-sm text-slate-50 font-medium leading-relaxed bg-slate-900 p-4 rounded-xl">{dir.logic}</p>
                      </div>
                   ))}
                </div>
                <div className="lg:col-span-2 space-y-6">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-4">高匹配核心资产</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {result.opportunityData.deployment_plan.top_picks.map((stock, idx) => (
                         <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-2xl transition-all group flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                               <div>
                                  <div className="font-black text-slate-900 text-xl flex items-center gap-3">
                                     {stock.name} <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">{stock.code}</span>
                                  </div>
                                  <div className="text-[11px] font-black text-slate-400 uppercase mt-2 flex items-center gap-1">
                                     <Shuffle className="w-3 h-3" /> {stock.sector}
                                  </div>
                               </div>
                               <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${
                                  stock.risk_tag === 'High' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                               }`}>{stock.risk_tag} Risk</span>
                            </div>
                            <p className="text-sm text-slate-600 font-bold leading-relaxed mb-6 flex-1 italic">"{stock.reason}"</p>
                            <div className="flex items-center justify-between border-t border-slate-50 pt-5 mt-auto">
                               <div className="text-xs font-black text-amber-600 flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" /> 操作位: {stock.buy_point}
                               </div>
                               <button onClick={() => handleNavigateToStock(stock.code, stock.name)} className="text-xs font-black text-slate-400 hover:text-amber-600 flex items-center gap-1 transition-colors">深度分析 <ArrowRight className="w-4 h-4"/></button>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          )}

          {/* Mode 3: Foresight (题材前瞻) - Responsive Grid Balance */}
          {mode === 'foresight' && result.foresightData?.catalysts && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {result.foresightData.catalysts.map((cat, idx) => (
                   <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all border-b-8 border-rose-100">
                      <div className="bg-rose-50 px-6 py-4 border-b border-rose-100 flex justify-between items-center">
                         <span className="text-rose-700 font-black text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> {cat.date_window}
                         </span>
                         <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest border border-rose-200 px-2 py-0.5 rounded">{cat.opportunity_level}</span>
                      </div>
                      <div className="p-8 flex-1 flex flex-col">
                         <h4 className="text-xl font-black text-slate-800 mb-2">{cat.event_name}</h4>
                         <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Sparkles className="w-3 h-3" /> {cat.theme_label}
                         </div>
                         <p className="text-sm text-slate-500 font-bold leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-8 flex-1">
                            {cat.logic_chain}
                         </p>
                         <div className="space-y-3">
                            <div className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2 px-1">
                               <Target className="w-3.5 h-3.5" /> 潜在收益标的
                            </div>
                            <div className="flex flex-wrap gap-2">
                               {cat.suggested_stocks.map((s, si) => (
                                  <button key={si} onClick={() => handleNavigateToStock("", s)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:border-rose-400 hover:text-rose-600 hover:shadow-md transition-all">
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

          <div className="text-center py-12">
             <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-100 rounded-full text-[11px] text-slate-400 font-black uppercase tracking-[0.3em]">
                <Info className="w-4 h-4" /> AI 分析结果基于公开研报与联网数据推演，仅供研究参考
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
