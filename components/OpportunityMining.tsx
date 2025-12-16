import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { fetchOpportunityMining } from '../services/opportunityService';
import { Radar, Loader2, Link2, Zap, AlertTriangle, Search, Shuffle, Factory, BrainCircuit, ArrowRight, Activity, Wallet, Crosshair, TrendingUp, BarChart2 } from 'lucide-react';
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
  
  // Mode selection
  const [mode, setMode] = useState<'chain' | 'deploy'>('chain');
  const [inputData, setInputData] = useState("");
  
  // Progress visualization
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState("");

  useEffect(() => {
    setInputData(mode === 'chain' ? "" : "综合/稳健趋势"); // Default values
    setResult(null);
    setError(null);
  }, [mode]);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => {
        setElapsed(prev => prev + 1);
        if (mode === 'chain') {
            if (elapsed < 6) setPhase("正在解析持仓的产业链结构 (Supply Chain Mapping)...");
            else if (elapsed < 12) setPhase("正在联网匹配“国家战略”与“产业逻辑”...");
            else setPhase("正在挖掘上游隐形冠军与供应商...");
        } else {
            if (elapsed < 6) setPhase("正在扫描今日全市场资金流向 (Smart Money Scan)...");
            else if (elapsed < 12) setPhase("正在分析机构席位与龙虎榜数据...");
            else setPhase("正在筛选符合您风格的最佳标的...");
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [loading, elapsed, mode]);

  const handleMine = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await fetchOpportunityMining(currentModel, currentMarket, settings, inputData, mode);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "挖掘失败");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToStock = (code: string, name: string) => {
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="mb-6">
             <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-lg text-white shadow-lg shadow-indigo-200">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                机会挖掘与资金配置
              </h2>
             <p className="text-slate-500 text-sm max-w-2xl">
               AI 驱动的深度投研引擎。支持基于 <b>持仓的产业链挖掘</b> 和基于 <b>现金的智能选股</b>。
             </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex space-x-4 border-b border-slate-200 mb-6">
             <button 
               onClick={() => setMode('chain')}
               className={`pb-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${mode === 'chain' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
             >
                <Link2 className="w-4 h-4" />
                持仓挖潜 (Supply Chain)
             </button>
             <button 
               onClick={() => setMode('deploy')}
               className={`pb-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${mode === 'deploy' ? 'text-amber-600 border-amber-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
             >
                <Wallet className="w-4 h-4" />
                资金选股 (Smart Select)
             </button>
          </div>

          {/* Input Area */}
          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-inner flex flex-col md:flex-row gap-2">
             <div className="flex-1 relative">
                {mode === 'chain' ? (
                  <>
                    <input 
                      type="text" 
                      value={inputData}
                      onChange={(e) => setInputData(e.target.value)}
                      placeholder="输入您关注的标的，例如：中科曙光, 东方财富..." 
                      className="w-full h-12 pl-10 pr-4 bg-white rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                    />
                    <Factory className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </>
                ) : (
                  <>
                    <select 
                       value={inputData}
                       onChange={(e) => setInputData(e.target.value)}
                       className="w-full h-12 pl-10 pr-4 bg-white rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all font-medium text-slate-700 appearance-none"
                    >
                       <option value="综合/稳健趋势">综合/稳健趋势 (推荐)</option>
                       <option value="激进/龙头战法">激进/龙头战法 (高风险)</option>
                       <option value="低吸/潜伏反弹">低吸/潜伏反弹 (左侧)</option>
                       <option value="机构/北向重仓">机构/北向重仓 (中长线)</option>
                    </select>
                    <Crosshair className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </>
                )}
             </div>
             <button
              onClick={handleMine}
              disabled={loading}
              className={`group relative inline-flex items-center justify-center px-8 h-12 font-bold text-white transition-all duration-200 font-lg rounded-lg hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap ${mode === 'chain' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-amber-600 hover:bg-amber-700'}`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>{elapsed}s</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  {mode === 'chain' ? '深度挖掘' : '扫描机会'}
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Background Decorations */}
        <div className={`absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l pointer-events-none ${mode === 'chain' ? 'from-indigo-50' : 'from-amber-50'}`}></div>
      </div>

      {/* Loading Phase */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 animate-pulse bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <BrainCircuit className={`w-12 h-12 mb-4 animate-pulse ${mode === 'chain' ? 'text-indigo-400' : 'text-amber-400'}`} />
          <p className="font-mono text-sm font-medium text-slate-600">{phase}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* --- RESULTS AREA --- */}
      {result && result.opportunityData && (
        <div className="space-y-8 animate-slide-up">
          
          {/* Common: Summary & Theme */}
          <div className={`bg-gradient-to-r text-white p-6 rounded-xl shadow-lg relative overflow-hidden ${mode === 'chain' ? 'from-indigo-900 to-slate-900' : 'from-slate-900 to-amber-900'}`}>
             <div className="relative z-10">
                <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-2 ${mode === 'chain' ? 'text-indigo-300' : 'text-amber-300'}`}>
                   <Zap className="w-4 h-4" /> {mode === 'chain' ? '核心逻辑主线' : '市场环境判断'}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">
                  {mode === 'chain' ? result.opportunityData.policy_theme : result.opportunityData.deployment_plan?.market_environment}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed opacity-90 max-w-4xl">
                   {result.opportunityData.analysis_summary}
                </p>
             </div>
          </div>

          {/* MODE 1: SUPPLY CHAIN RESULTS */}
          {mode === 'chain' && result.opportunityData.supply_chain_matrix && (
            <div className="grid grid-cols-1 gap-6">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-indigo-600" />
                  产业链协同与黑马挖掘
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {result.opportunityData.supply_chain_matrix.map((chain, idx) => (
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
                                    诊断
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
          )}

          {/* MODE 1: ROTATION */}
          {mode === 'chain' && result.opportunityData.rotation_strategy && (
            <div className="bg-amber-50 rounded-xl border border-amber-100 p-6">
               <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2 mb-4">
                  <Shuffle className="w-5 h-5 text-amber-600" />
                  资金高低切轮动策略 (Rotation)
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.opportunityData.rotation_strategy.map((strat, idx) => (
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
          )}

          {/* MODE 2: CAPITAL DEPLOYMENT RESULTS */}
          {mode === 'deploy' && result.opportunityData.deployment_plan && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Hot Sectors */}
                <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                   <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-rose-600" />
                      主力进攻方向
                   </h3>
                   <div className="space-y-4">
                      {result.opportunityData.deployment_plan.focus_directions.map((dir, idx) => (
                        <div key={idx} className="bg-rose-50 rounded-lg p-4 border border-rose-100">
                           <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-slate-800 text-lg">{dir.sector}</span>
                              <span className="text-xs font-bold text-rose-600 bg-white px-2 py-0.5 rounded border border-rose-200 shadow-sm">
                                 {dir.inflow_status}
                              </span>
                           </div>
                           <p className="text-sm text-slate-600 leading-relaxed">
                              {dir.logic}
                           </p>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Stock Picks */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                   <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <Crosshair className="w-5 h-5 text-indigo-600" />
                      精选潜力标的 (Top Picks)
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.opportunityData.deployment_plan.top_picks.map((stock, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-xl p-5 border border-slate-200 hover:border-indigo-300 transition-colors group">
                           <div className="flex justify-between items-start mb-3">
                              <div>
                                 <div className="font-bold text-lg text-indigo-700 flex items-center gap-2">
                                    {stock.name}
                                    <span className="text-xs bg-white text-slate-500 px-1.5 py-0.5 rounded font-mono border border-slate-200">{stock.code}</span>
                                 </div>
                                 <div className="text-xs text-slate-400 font-medium mt-1">{stock.sector}</div>
                              </div>
                              <span className={`text-xs font-bold px-2 py-1 rounded border ${
                                 stock.risk_tag === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                                 stock.risk_tag === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              }`}>
                                 {stock.risk_tag === 'High' ? '高弹性' : stock.risk_tag === 'Medium' ? '中风险' : '稳健'}
                              </span>
                           </div>
                           <div className="space-y-2 mb-4">
                              <div className="text-sm text-slate-700">
                                 <span className="font-bold text-slate-900 mr-1">推荐逻辑:</span> 
                                 {stock.reason}
                              </div>
                              <div className="text-sm text-slate-700">
                                 <span className="font-bold text-slate-900 mr-1">建议买点:</span> 
                                 <span className="bg-indigo-50 text-indigo-700 px-1 rounded">{stock.buy_point}</span>
                              </div>
                           </div>
                           <button 
                             onClick={() => handleNavigateToStock(stock.code, stock.name)}
                             className="w-full py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                           >
                              开始个股诊断
                           </button>
                        </div>
                      ))}
                   </div>
                </div>

             </div>
          )}

          <div className="text-center text-xs text-slate-400 mt-8">
             * AI生成结果仅供参考，不构成投资建议。请注意市场风险。
          </div>
        </div>
      )}
    </div>
  );
};