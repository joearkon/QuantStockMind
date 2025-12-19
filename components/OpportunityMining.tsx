
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { fetchOpportunityMining } from '../services/opportunityService';
import { Radar, Loader2, Link2, Zap, AlertTriangle, Search, Shuffle, Factory, BrainCircuit, ArrowRight, Activity, Wallet, Crosshair, Calendar, Target, Sparkles, TrendingUp, Info } from 'lucide-react';
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
  const [mode, setMode] = useState<'chain' | 'deploy' | 'foresight'>('chain');
  const [inputData, setInputData] = useState("");
  
  // Progress visualization
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
        if (mode === 'chain') {
            if (elapsed < 6) setPhase("正在解析持仓的产业链结构...");
            else if (elapsed < 12) setPhase("正在联网匹配政策与产业逻辑...");
            else setPhase("正在挖掘上游隐形冠军...");
        } else if (mode === 'deploy') {
            if (elapsed < 6) setPhase("正在扫描今日全市场资金流向...");
            else if (elapsed < 12) setPhase("正在分析机构席位与龙虎榜数据...");
            else setPhase("正在筛选符合您风格的最佳标的...");
        } else {
            if (elapsed < 6) setPhase("正在检索未来 60 天内的政策窗口与行业会议...");
            else if (elapsed < 12) setPhase("正在推演事件对二级市场的催化逻辑...");
            else setPhase("正在生成题材前瞻日历...");
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
      setError(err.message || "分析中断，请检查 API 配置或网络。");
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
                <div className={`p-2 rounded-lg text-white shadow-lg ${mode === 'foresight' ? 'bg-gradient-to-br from-rose-600 to-red-700 shadow-rose-200' : 'bg-gradient-to-br from-indigo-600 to-blue-700 shadow-indigo-200'}`}>
                  {mode === 'foresight' ? <Calendar className="w-6 h-6" /> : <BrainCircuit className="w-6 h-6" />}
                </div>
                {mode === 'foresight' ? '政策洞察与题材前瞻' : '机会挖掘与资金配置'}
              </h2>
             <p className="text-slate-500 text-sm max-w-2xl">
               {mode === 'foresight' 
                ? "拒绝追高，从未来找机会。AI 全网检索政策窗口与重大工程节点，预判下一个“长征十二号”。" 
                : "AI 驱动的深度投研引擎。支持基于持仓的产业链挖掘和基于现金的智能选股。"}
             </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex space-x-6 border-b border-slate-200 mb-6 overflow-x-auto">
             <button 
               onClick={() => setMode('chain')}
               className={`pb-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'chain' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
             >
                <Link2 className="w-4 h-4" />
                持仓挖潜
             </button>
             <button 
               onClick={() => setMode('deploy')}
               className={`pb-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'deploy' ? 'text-amber-600 border-amber-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
             >
                <Wallet className="w-4 h-4" />
                资金选股
             </button>
             <button 
               onClick={() => setMode('foresight')}
               className={`pb-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'foresight' ? 'text-rose-600 border-rose-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
             >
                <Sparkles className="w-4 h-4" />
                题材前瞻 (New)
             </button>
          </div>

          {/* Input Area */}
          <div className={`p-1.5 rounded-xl border shadow-inner flex flex-col md:flex-row gap-2 ${mode === 'foresight' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'}`}>
             <div className="flex-1 relative">
                {mode === 'chain' && (
                  <>
                    <input 
                      type="text" 
                      value={inputData}
                      onChange={(e) => setInputData(e.target.value)}
                      placeholder="输入持仓标的，挖掘上下游关联机会..." 
                      className="w-full h-12 pl-10 pr-4 bg-white rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-medium text-slate-700"
                    />
                    <Factory className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </>
                )}
                {mode === 'deploy' && (
                  <>
                    <select 
                       value={inputData}
                       onChange={(e) => setInputData(e.target.value)}
                       className="w-full h-12 pl-10 pr-4 bg-white rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all font-medium text-slate-700 appearance-none"
                    >
                       <option value="综合/稳健趋势">综合/稳健趋势</option>
                       <option value="激进/龙头战法">激进/龙头战法</option>
                       <option value="低吸/潜伏反弹">低吸/潜伏反弹</option>
                       <option value="机构/北向重仓">机构/北向重仓</option>
                    </select>
                    <Crosshair className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </>
                )}
                {mode === 'foresight' && (
                  <>
                    <input 
                      type="text" 
                      value={inputData}
                      onChange={(e) => setInputData(e.target.value)}
                      placeholder="可选：输入特定偏好板块（如“低空经济”），不填则全市场扫描" 
                      className="w-full h-12 pl-10 pr-4 bg-white rounded-lg border border-rose-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all font-medium text-slate-700"
                    />
                    <Target className="w-5 h-5 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </>
                )}
             </div>
             <button
              onClick={handleMine}
              disabled={loading}
              className={`group relative inline-flex items-center justify-center px-8 h-12 font-bold text-white transition-all duration-200 font-lg rounded-lg hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap ${mode === 'chain' ? 'bg-slate-900' : mode === 'deploy' ? 'bg-amber-600' : 'bg-rose-600'}`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>{elapsed}s</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  {mode === 'chain' ? '深度挖掘' : mode === 'deploy' ? '扫描机会' : '全网前瞻'}
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Background Decorations */}
        <div className={`absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l pointer-events-none ${mode === 'chain' ? 'from-indigo-50' : mode === 'deploy' ? 'from-amber-50' : 'from-rose-50'}`}></div>
      </div>

      {/* Loading Phase */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 animate-pulse bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <BrainCircuit className={`w-12 h-12 mb-4 animate-pulse ${mode === 'chain' ? 'text-indigo-400' : mode === 'deploy' ? 'text-amber-400' : 'text-rose-400'}`} />
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
      {result && (
        <div className="space-y-8 animate-slide-up">
          
          {/* Mode 3: FORESIGHT RESULTS */}
          {mode === 'foresight' && result.foresightData && (
             <div className="space-y-6">
                {/* Monthly Focus Banner */}
                <div className="bg-gradient-to-r from-rose-900 to-slate-900 text-white p-6 rounded-xl shadow-lg border-l-4 border-rose-500">
                   <h3 className="text-rose-300 font-bold uppercase text-xs tracking-wider mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> 下阶段主线洞察 (Theme Outlook)
                   </h3>
                   <p className="text-lg font-bold mb-4">{result.foresightData.monthly_focus || '全市场政策窗口博弈期'}</p>
                   <div className="bg-white/10 p-4 rounded-lg border border-white/20">
                      <h4 className="text-xs font-bold text-rose-200 uppercase mb-1">宏观政策解读</h4>
                      <p className="text-sm opacity-90 leading-relaxed">{result.foresightData.macro_policy_insight || 'AI 正在分析未来 60 天内的政策导向，暂无具体解读。'}</p>
                   </div>
                </div>

                {/* Catalyst Calendar/Grid */}
                {!result.foresightData.catalysts || result.foresightData.catalysts.length === 0 ? (
                   <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
                      AI 暂未检索到具有强确定性的近期催化事件。
                   </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {result.foresightData.catalysts.map((cat, idx) => (
                        <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
                          <div className="bg-rose-50 px-4 py-3 border-b border-rose-100 flex justify-between items-center">
                              <span className="text-rose-700 font-bold text-sm flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {cat.date_window || '近期'}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                cat.opportunity_level === 'High' ? 'bg-rose-600 text-white border-rose-600' :
                                cat.opportunity_level === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {cat.opportunity_level === 'High' ? '重磅关注' : '中等机会'}
                              </span>
                          </div>
                          <div className="p-5 flex-1 space-y-4">
                              <div>
                                <h4 className="text-lg font-bold text-slate-800 leading-tight mb-1">{cat.event_name || '未知事件'}</h4>
                                <span className="text-xs font-bold text-rose-500 uppercase">{cat.theme_label || '相关题材'}</span>
                              </div>
                              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                {cat.logic_chain || '暂无逻辑推演内容。'}
                              </p>
                              <div>
                                <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1 uppercase">
                                    <Target className="w-3 h-3" /> 受益标的 (Stock Map)
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {cat.suggested_stocks?.length > 0 ? cat.suggested_stocks.map((stock, sIdx) => (
                                      <button 
                                        key={sIdx}
                                        onClick={() => {
                                          const codeMatch = stock.match(/\d+/);
                                          const code = codeMatch ? codeMatch[0] : "";
                                          const name = stock.replace(/\d+/g, '').trim();
                                          handleNavigateToStock(code, name);
                                        }}
                                        className="px-2 py-1 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded hover:border-rose-300 hover:text-rose-600 transition-all flex items-center gap-1 group/btn shadow-sm"
                                      >
                                          {stock}
                                          <ArrowRight className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                      </button>
                                    )) : <span className="text-xs text-slate-300 italic">暂未匹配到相关个股</span>}
                                </div>
                              </div>
                          </div>
                        </div>
                    ))}
                  </div>
                )}

                {/* Warning Card */}
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 flex items-start gap-4">
                   <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                      <Info className="w-5 h-5 text-amber-600" />
                   </div>
                   <div>
                      <h4 className="font-bold text-amber-900 mb-1">题材轮动风险预警</h4>
                      <p className="text-sm text-amber-800 opacity-90 leading-relaxed">{result.foresightData.rotation_warning || '近期市场板块切换频率正常，暂无高风险提示。'}</p>
                   </div>
                </div>
             </div>
          )}

          {/* MODE 1 & 2: ORIGINAL RESULTS */}
          {result.opportunityData && (
             <div className="space-y-8">
                {/* Summary & Theme */}
                <div className={`bg-gradient-to-r text-white p-6 rounded-xl shadow-lg relative overflow-hidden ${mode === 'chain' ? 'from-indigo-900 to-slate-900' : 'from-slate-900 to-amber-900'}`}>
                   <div className="relative z-10">
                      <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-2 ${mode === 'chain' ? 'text-indigo-300' : 'text-amber-300'}`}>
                         <Zap className="w-4 h-4" /> {mode === 'chain' ? '核心逻辑主线' : '市场环境判断'}
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-white">
                        {result.opportunityData.policy_theme || '市场机会洞察'}
                      </h3>
                      <p className="text-slate-300 text-sm leading-relaxed opacity-90 max-w-4xl">
                         {result.opportunityData.analysis_summary || 'AI 正在分析相关标的的深度关联与资金偏好，请参考下方明细。'}
                      </p>
                   </div>
                </div>

                {/* Chain Matrix */}
                {mode === 'chain' && result.opportunityData.supply_chain_matrix && (
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
                               {chain.opportunities?.map((opp, oIdx) => (
                                  <div key={oIdx} className="relative pl-4 border-l-2 border-indigo-100 group">
                                     <div className="flex justify-between items-start">
                                        <div>
                                           <div className="font-bold text-indigo-700 flex items-center gap-2">
                                              {opp.stock_name}
                                              <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-mono border border-indigo-100">{opp.stock_code}</span>
                                           </div>
                                           <div className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wide">{opp.relation_type}</div>
                                        </div>
                                        <button 
                                          onClick={() => handleNavigateToStock(opp.stock_code, opp.stock_name)}
                                          className="px-2 py-1 bg-white border border-slate-200 text-xs font-medium text-slate-600 rounded hover:text-indigo-600 transition-colors"
                                        >
                                          诊断
                                        </button>
                                     </div>
                                     <p className="text-sm text-slate-700 mt-2 leading-relaxed">{opp.logic_core}</p>
                                     <div className="mt-2 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-block border border-emerald-100">🎯 {opp.policy_match}</div>
                                  </div>
                               ))}
                            </div>
                         </div>
                       ))}
                     </div>
                  </div>
                )}

                {/* Deployment Results */}
                {mode === 'deploy' && result.opportunityData.deployment_plan && (
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                         <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-rose-600" /> 主力进攻方向
                         </h3>
                         <div className="space-y-4">
                            {result.opportunityData.deployment_plan.focus_directions?.map((dir, idx) => (
                              <div key={idx} className="bg-rose-50 rounded-lg p-4 border border-rose-100">
                                 <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-slate-800 text-lg">{dir.sector}</span>
                                    <span className="text-xs font-bold text-rose-600 bg-white px-2 py-0.5 rounded border border-rose-200 shadow-sm">{dir.inflow_status}</span>
                                 </div>
                                 <p className="text-sm text-slate-600 leading-relaxed">{dir.logic}</p>
                              </div>
                            ))}
                         </div>
                      </div>
                      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                         <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <Crosshair className="w-5 h-5 text-indigo-600" /> 精选潜力标的
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {result.opportunityData.deployment_plan.top_picks?.map((stock, idx) => (
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
                                    }`}>{stock.risk_tag}</span>
                                 </div>
                                 <div className="space-y-2 mb-4">
                                    <div className="text-sm text-slate-700"><span className="font-bold text-slate-900 mr-1">逻辑:</span>{stock.reason}</div>
                                    <div className="text-sm text-slate-700"><span className="font-bold text-slate-900 mr-1">买点:</span><span className="bg-indigo-50 text-indigo-700 px-1 rounded">{stock.buy_point}</span></div>
                                 </div>
                                 <button onClick={() => handleNavigateToStock(stock.code, stock.name)} className="w-full py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm">开始诊断</button>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                )}
             </div>
          )}

          <div className="text-center text-xs text-slate-400 mt-8">
             * AI 生成结果可能受数据延迟影响。分析推演仅供参考，不构成任何投资建议。
          </div>
        </div>
      )}
    </div>
  );
};
