
import React, { useState } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { Loader2, BarChart2, TrendingUp, Zap, Wind, Layers, Settings, ShieldCheck, Rocket, ListChecks, Target } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';

interface MarketAnalysisProps {
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: UserSettings;
  onOpenSettings?: () => void;
  // Props for state persistence
  savedResult: AnalysisResult | null;
  onResultUpdate: (result: AnalysisResult | null) => void;
  savedPeriod: 'day' | 'month';
  onPeriodUpdate: (period: 'day' | 'month') => void;
}

export const MarketAnalysis: React.FC<MarketAnalysisProps> = ({ 
  currentModel, 
  currentMarket,
  settings, 
  onOpenSettings,
  savedResult,
  onResultUpdate,
  savedPeriod,
  onPeriodUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allocationType, setAllocationType] = useState<'aggressive' | 'balanced'>('aggressive');

  const handleAnalysis = async () => {
    setLoading(true);
    onResultUpdate(null);
    setError(null);
    try {
      const data = await analyzeWithLLM(currentModel, "", true, settings, true, savedPeriod, undefined, currentMarket);
      onResultUpdate(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const d = savedResult?.structuredData;
  const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-blue-600" />
            {marketLabel} 深度推演 (Deep Dive)
          </h2>
          
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200">
              <button
                onClick={() => onPeriodUpdate('day')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  savedPeriod === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                今日
              </button>
              <button
                onClick={() => onPeriodUpdate('month')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  savedPeriod === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                本月
              </button>
            </div>
            
            <button
              onClick={handleAnalysis}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? '全维扫描中...' : '生成全景报告'}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between text-red-700">
             <div className="flex items-center gap-2">
                <span className="font-semibold">分析失败:</span> {error}
             </div>
             {onOpenSettings && (
               <button 
                 onClick={onOpenSettings}
                 className="px-3 py-1 bg-white border border-red-200 text-red-600 text-sm rounded shadow-sm hover:bg-red-50 flex items-center gap-1"
               >
                 <Settings className="w-3 h-3" />
                 去配置
               </button>
             )}
          </div>
        )}

        {!d && !loading && !error && (
          <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>点击“生成全景报告”获取基于 {currentModel} 的深度市场复盘</p>
          </div>
        )}

        {/* Indices Row */}
        {d && d.market_indices && d.market_indices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {d.market_indices.map((idx, i) => (
              <div key={i} className="bg-slate-900 rounded-lg p-4 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-slate-400 text-sm font-medium">{idx.name}</span>
                    <span className={`text-sm font-bold ${idx.direction === 'up' ? 'text-rose-500' : 'text-emerald-500'}`}>
                       {idx.change}
                    </span>
                  </div>
                  <div className="text-2xl font-bold tracking-tight">{idx.value}</div>
                </div>
                <div className={`absolute -right-4 -bottom-6 w-20 h-20 rounded-full blur-2xl opacity-20 ${idx.direction === 'up' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
              </div>
            ))}
          </div>
        )}

        {/* Dashboard Content */}
        {d && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Col 1: Market Sentiment */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none"></div>
                <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">市场情绪评分</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className={`text-6xl font-bold tracking-tighter ${
                    d.market_sentiment.score >= 60 ? 'text-amber-400' : 'text-slate-200'
                  }`}>
                    {d.market_sentiment.score}
                  </span>
                  <span className="text-slate-500 font-mono">/ 100</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full mb-4 overflow-hidden">
                   <div 
                     className={`h-full rounded-full transition-all duration-1000 ease-out ${
                       d.market_sentiment.score >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-slate-500'
                     }`} 
                     style={{ width: `${d.market_sentiment.score}%` }}
                   ></div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-amber-500 pl-3">
                  {d.market_sentiment.summary}
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-slate-800 font-bold flex items-center gap-2 mb-4">
                  <Wind className="w-5 h-5 text-indigo-500" />
                  风口题材 (Wind Topics)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {d.hot_topics.map((topic, idx) => (
                    <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full border border-indigo-100">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Col 2: Capital Rotation */}
            <div className="lg:col-span-1 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-slate-800 font-bold flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                深度资金轮动
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">INFLOW</span>
                    <span className="text-sm font-medium text-slate-600">主力买入</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                     {d.capital_rotation.inflow_sectors.map((s, i) => (
                       <span key={i} className="text-sm font-bold text-slate-800 border-b-2 border-emerald-400 pb-0.5">{s}</span>
                     ))}
                  </div>
                  <p className="text-xs text-slate-500 leading-normal">
                    {d.capital_rotation.inflow_reason}
                  </p>
                </div>
                <div className="border-t border-slate-100"></div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded">OUTFLOW</span>
                    <span className="text-sm font-medium text-slate-600">主力流出</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                     {d.capital_rotation.outflow_sectors.map((s, i) => (
                       <span key={i} className="text-sm font-bold text-slate-800 border-b-2 border-rose-400 pb-0.5">{s}</span>
                     ))}
                  </div>
                  <p className="text-xs text-slate-500 leading-normal">
                    {d.capital_rotation.outflow_reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Col 3: Deep Logic */}
            <div className="lg:col-span-1 bg-slate-50 rounded-xl p-6 border border-slate-200">
               <h3 className="text-slate-800 font-bold flex items-center gap-2 mb-4">
                  <Layers className="w-5 h-5 text-blue-600" />
                  核心策略推演
               </h3>
               <div className="space-y-4">
                 <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                    <h4 className="text-xs font-bold text-blue-600 mb-1">1. 政策驱动 (Policy)</h4>
                    <p className="text-sm text-slate-700">{d.deep_logic.policy_driver}</p>
                 </div>
                 <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                    <h4 className="text-xs font-bold text-indigo-600 mb-1">2. 外部环境 (Macro)</h4>
                    <p className="text-sm text-slate-700">{d.deep_logic.external_environment}</p>
                 </div>
                 <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                    <h4 className="text-xs font-bold text-violet-600 mb-1">3. 估值与趋势 (Valuation)</h4>
                    <p className="text-sm text-slate-700">{d.deep_logic.market_valuation}</p>
                 </div>
               </div>
            </div>

            {/* --- Opportunity Analysis --- */}
            {d.opportunity_analysis && (
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div 
                    onClick={() => setAllocationType('balanced')}
                    className={`bg-slate-900 rounded-xl p-6 text-white border transition-all cursor-pointer relative overflow-hidden hover:shadow-xl ${allocationType === 'balanced' ? 'border-emerald-500 ring-2 ring-emerald-500/50' : 'border-slate-700 hover:border-slate-500'}`}
                 >
                    <div className="flex justify-between items-start mb-4">
                       <div>
                          <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">Defensive / Value</h3>
                          <h4 className="text-xl font-bold">防御/价值机会</h4>
                       </div>
                       {allocationType === 'balanced' && <div className="bg-emerald-500 p-1 rounded-full"><ShieldCheck className="w-4 h-4 text-white" /></div>}
                    </div>
                    <div className="mb-4">
                       <p className="text-sm text-slate-300 mt-1 leading-relaxed line-clamp-2">{d.opportunity_analysis.defensive_value.logic}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {d.opportunity_analysis.defensive_value.sectors.map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-600 text-emerald-200 text-xs rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                 </div>

                 <div 
                    onClick={() => setAllocationType('aggressive')}
                    className={`bg-slate-900 rounded-xl p-6 text-white border transition-all cursor-pointer relative overflow-hidden hover:shadow-xl ${allocationType === 'aggressive' ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-slate-700 hover:border-slate-500'}`}
                 >
                    <div className="flex justify-between items-start mb-4">
                       <div>
                           <h3 className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">Tech / Growth</h3>
                           <h4 className="text-xl font-bold">成长/科技机会</h4>
                       </div>
                       {allocationType === 'aggressive' && <div className="bg-rose-500 p-1 rounded-full"><Rocket className="w-4 h-4 text-white" /></div>}
                    </div>
                    <div className="mb-4">
                       <p className="text-sm text-slate-300 mt-1 leading-relaxed line-clamp-2">{d.opportunity_analysis.tech_growth.logic}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {d.opportunity_analysis.tech_growth.sectors.map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-600 text-rose-200 text-xs rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                 </div>
              </div>
            )}

            {/* --- Detailed Allocation Model Table --- */}
            {d.allocation_model && (
              <div className="lg:col-span-3 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      {allocationType === 'aggressive' ? <Rocket className="w-5 h-5 text-rose-600" /> : <ShieldCheck className="w-5 h-5 text-emerald-600" />}
                      实战配置模型：{d.allocation_model[allocationType].strategy_name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {d.allocation_model[allocationType].description}
                    </p>
                  </div>

                  {/* Toggle Buttons (Redundant but accessible) */}
                  <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                    <button
                       onClick={() => setAllocationType('aggressive')}
                       className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${
                         allocationType === 'aggressive' ? 'bg-rose-50 text-rose-700' : 'text-slate-400 hover:text-slate-600'
                       }`}
                    >
                      激进成长
                    </button>
                    <button
                       onClick={() => setAllocationType('balanced')}
                       className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${
                         allocationType === 'balanced' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:text-slate-600'
                       }`}
                    >
                      稳健防御
                    </button>
                  </div>
                </div>

                <div className="p-6">
                   {/* Step 1: Action Plan */}
                   <div className="mb-8">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                         <ListChecks className="w-4 h-4 text-slate-500" />
                         操作步骤 (Action Steps)
                      </h4>
                      <div className="space-y-2">
                        {d.allocation_model[allocationType].action_plan.map((step, idx) => (
                          <div key={idx} className="flex gap-3 text-sm text-slate-700">
                             <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold border border-slate-200">{idx + 1}</span>
                             <p className="pt-0.5">{step}</p>
                          </div>
                        ))}
                      </div>
                   </div>

                   {/* Step 2: Table */}
                   <div className="mb-8 overflow-x-auto">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                         <Target className="w-4 h-4 text-slate-500" />
                         核心标的配置 (Portfolio Targets)
                      </h4>
                      <table className="w-full text-left border-collapse rounded-lg overflow-hidden border border-slate-200">
                         <thead>
                            <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                               <th className="p-3 font-semibold border-b border-slate-200">标的 (Code)</th>
                               <th className="p-3 font-semibold border-b border-slate-200">建议仓位/占比</th>
                               <th className="p-3 font-semibold border-b border-slate-200">逻辑标签</th>
                            </tr>
                         </thead>
                         <tbody className="text-sm divide-y divide-slate-100">
                            {d.allocation_model[allocationType].portfolio_table.map((item, idx) => (
                               <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-3 font-medium text-slate-900">
                                     <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                        <span>{item.name}</span>
                                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.code}</span>
                                     </div>
                                  </td>
                                  <td className="p-3 text-slate-700 font-bold">{item.weight}</td>
                                  <td className="p-3 text-slate-600">
                                     <span className={`px-2 py-1 rounded text-xs font-medium border ${
                                        allocationType === 'aggressive' 
                                          ? 'bg-rose-50 text-rose-700 border-rose-100' 
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                     }`}>
                                        {item.logic_tag}
                                     </span>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>

                   {/* Step 3: Core Advantage */}
                   <div className={`p-4 rounded-lg border-l-4 ${
                      allocationType === 'aggressive' ? 'bg-rose-50 border-rose-500 text-rose-900' : 'bg-emerald-50 border-emerald-500 text-emerald-900'
                   }`}>
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Core Advantage</h4>
                      <p className="text-sm font-medium leading-relaxed">
                         {d.allocation_model[allocationType].core_advantage}
                      </p>
                   </div>
                </div>
              </div>
            )}

            {/* Strategist Verdict */}
            {d.strategist_verdict && (
              <div className="lg:col-span-3 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 border-l-4 border-blue-500 shadow-xl text-white">
                 <h3 className="text-blue-400 font-bold uppercase text-xs tracking-wider mb-2">Final Verdict</h3>
                 <p className="text-lg font-medium leading-relaxed opacity-90">
                   {d.strategist_verdict}
                 </p>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};
