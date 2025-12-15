import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { fetchOpportunityMining } from '../services/opportunityService';
import { Radar, Loader2, Link2, Zap, AlertTriangle, Search, Shuffle, Factory, BrainCircuit, ArrowRight, Activity } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';

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
  const [userHoldings, setUserHoldings] = useState("");
  
  // Progress visualization
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState("");

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => {
        setElapsed(prev => prev + 1);
        if (elapsed < 6) setPhase("正在解析持仓的产业链结构 (Supply Chain Mapping)...");
        else if (elapsed < 12) setPhase("正在联网匹配“国家战略”与“产业逻辑”...");
        else if (elapsed < 18) setPhase("正在挖掘上游隐形冠军与供应商...");
        else setPhase("正在计算高低切换轮动逻辑...");
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [loading, elapsed]);

  const handleMine = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await fetchOpportunityMining(currentModel, currentMarket, settings, userHoldings);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "挖掘失败");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToStock = (code: string, name: string) => {
    // Navigate to stock analysis with query param
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card with Input */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="mb-6">
             <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-lg text-white shadow-lg shadow-indigo-200">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                产业链深度透视 · 机会挖掘
              </h2>
             <p className="text-slate-500 text-sm max-w-2xl">
               不再盲目潜伏。输入您的持仓（如：中科曙光、国机精工），AI将结合 <b>国家宏观战略 (如：十五五规划、自主可控、新质生产力等)</b>，为您挖掘<b>上游核心供应商</b>与<b>高低切轮动机会</b>。
             </p>
          </div>

          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-inner flex flex-col md:flex-row gap-2">
             <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={userHoldings}
                  onChange={(e) => setUserHoldings(e.target.value)}
                  placeholder="输入您关注的标的，例如：中科曙光, 东方财富, 贵州茅台..." 
                  className="w-full h-12 pl-10 pr-4 bg-white rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                />
                <Factory className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
             </div>
             <button
              onClick={handleMine}
              disabled={loading}
              className="group relative inline-flex items-center justify-center px-8 h-12 font-bold text-white transition-all duration-200 bg-slate-900 font-lg rounded-lg hover:bg-slate-800 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>{elapsed}s</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  深度挖掘
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Background Decorations */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-50 to-transparent pointer-events-none"></div>
      </div>

      {/* Loading Phase */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 animate-pulse bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <BrainCircuit className="w-12 h-12 text-indigo-400 mb-4 animate-pulse" />
          <p className="font-mono text-sm font-medium text-indigo-600">{phase}</p>
          <p className="text-xs text-slate-400 mt-2">正在通过 AI 搜索构建产业链图谱...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && result.opportunityData && (
        <div className="space-y-8 animate-slide-up">
          
          {/* 1. Summary & Theme */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider mb-2">
                   <Zap className="w-4 h-4" /> 核心逻辑主线 (Core Theme)
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{result.opportunityData.policy_theme}</h3>
                <p className="text-slate-300 text-sm leading-relaxed opacity-90 max-w-4xl">
                   {result.opportunityData.analysis_summary}
                </p>
             </div>
             <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500 opacity-10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          </div>

          {/* 2. Supply Chain Matrix */}
          <div className="grid grid-cols-1 gap-6">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-indigo-600" />
                产业链协同与黑马挖掘
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {result.opportunityData.supply_chain_matrix?.map((chain, idx) => (
                 <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                       <span className="font-bold text-slate-700 flex items-center gap-2">
                          <Factory className="w-4 h-4 text-slate-400" />
                          {chain.user_holding} <span className="text-xs text-slate-400 font-normal">(原点)</span>
                       </span>
                       <ArrowRight className="w-4 h-4 text-slate-300" />
                    </div>
                    <div className="p-5 space-y-4">
                       {chain.opportunities.map((opp, oIdx) => (
                          <div key={oIdx} className="relative pl-4 border-l-2 border-indigo-100 group">
                             <div className="flex justify-between items-start">
                                <div>
                                   <div className="font-bold text-indigo-700 flex items-center gap-2">
                                      {opp.stock_name}
                                      <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-mono border border-indigo-100">{opp.stock_code}</span>
                                   </div>
                                   <div className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wide">
                                      {opp.relation_type}
                                   </div>
                                </div>
                                <button 
                                  onClick={() => handleNavigateToStock(opp.stock_code, opp.stock_name)}
                                  className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 shadow-sm text-xs font-medium text-slate-600 rounded hover:text-indigo-600 hover:border-indigo-200 transition-colors opacity-80 hover:opacity-100"
                                >
                                  <Activity className="w-3 h-3" />
                                  量化诊断
                                </button>
                             </div>
                             <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                                {opp.logic_core}
                             </p>
                             <div className="mt-2 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-block border border-emerald-100">
                                🎯 {opp.policy_match}
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
               ))}
             </div>
          </div>

          {/* 3. Rotation Strategy */}
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-6">
             <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2 mb-4">
                <Shuffle className="w-5 h-5 text-amber-600" />
                资金高低切轮动策略 (Rotation)
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.opportunityData.rotation_strategy?.map((strat, idx) => (
                   <div key={idx} className="bg-white rounded-lg p-4 border border-amber-200 shadow-sm">
                      <div className="flex items-center gap-3 text-sm mb-3">
                         <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded font-medium line-through decoration-slate-400 decoration-2">
                            {strat.current_sector}
                         </span>
                         <ArrowRight className="w-4 h-4 text-amber-500" />
                         <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded font-bold shadow-sm">
                            {strat.next_sector}
                         </span>
                      </div>
                      <div className="space-y-2">
                         <p className="text-sm text-slate-700">
                            <span className="font-bold text-slate-900">逻辑:</span> {strat.reason}
                         </p>
                         <p className="text-sm text-slate-700">
                            <span className="font-bold text-slate-900">催化剂:</span> {strat.catalyst}
                         </p>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          <div className="text-center text-xs text-slate-400 mt-8">
             * 产业链关系基于公开信息与AI推理，中小市值标的波动较大，请结合基本面审慎决策。
          </div>
        </div>
      )}
    </div>
  );
};