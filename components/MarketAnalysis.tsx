
import React, { useState } from 'react';
import { ModelProvider, AnalysisResult, UserSettings } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { Loader2, BarChart2, TrendingUp, Zap, Wind, Layers, Settings, ShieldCheck, Rocket, PieChart } from 'lucide-react';

interface MarketAnalysisProps {
  currentModel: ModelProvider;
  settings: UserSettings;
  onOpenSettings?: () => void;
}

export const MarketAnalysis: React.FC<MarketAnalysisProps> = ({ currentModel, settings, onOpenSettings }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [period, setPeriod] = useState<'day' | 'month'>('day');
  const [error, setError] = useState<string | null>(null);
  const [allocationType, setAllocationType] = useState<'aggressive' | 'balanced'>('balanced');

  const handleAnalysis = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await analyzeWithLLM(currentModel, "", true, settings, true, period);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const d = result?.structuredData;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-blue-600" />
            深度市场推演 (Deep Dive)
          </h2>
          
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200">
              <button
                onClick={() => setPeriod('day')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  period === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                今日
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  period === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
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

            {/* --- NEW SECTION: Opportunity Analysis --- */}
            {d.opportunity_analysis && (
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-slate-900 rounded-xl p-6 text-white border border-slate-700 relative overflow-hidden">
                    <h3 className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">Main Board / Defensive</h3>
                    <h4 className="text-xl font-bold mb-4">主板价值/红利机会</h4>
                    <div className="mb-4">
                       <span className="text-xs font-bold text-slate-500 uppercase">Logic</span>
                       <p className="text-sm text-slate-300 mt-1 leading-relaxed">{d.opportunity_analysis.defensive_value.logic}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {d.opportunity_analysis.defensive_value.sectors.map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-600 text-blue-200 text-xs rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                 </div>

                 <div className="bg-slate-900 rounded-xl p-6 text-white border border-slate-700 relative overflow-hidden">
                    <h3 className="text-pink-400 text-xs font-bold uppercase tracking-wider mb-1">Tech / Growth</h3>
                    <h4 className="text-xl font-bold mb-4">全域成长 (主板+科创)</h4>
                    <div className="mb-4">
                       <span className="text-xs font-bold text-slate-500 uppercase">Logic</span>
                       <p className="text-sm text-slate-300 mt-1 leading-relaxed">{d.opportunity_analysis.tech_growth.logic}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {d.opportunity_analysis.tech_growth.sectors.map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-600 text-pink-200 text-xs rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                 </div>
              </div>
            )}

            {/* --- NEW SECTION: Strategist Verdict --- */}
            {d.strategist_verdict && (
              <div className="lg:col-span-3 bg-gradient-to-r from-emerald-900 to-slate-900 rounded-xl p-6 border-l-4 border-emerald-500 shadow-xl">
                 <h3 className="text-emerald-400 font-bold uppercase text-xs tracking-wider mb-2">Strategist Verdict</h3>
                 <p className="text-lg text-white font-medium leading-relaxed">
                   {d.strategist_verdict}
                 </p>
              </div>
            )}

            {/* --- NEW SECTION: Allocation Model --- */}
            {d.allocation_model && (
              <div className="lg:col-span-3 bg-slate-900 rounded-xl p-8 text-white border border-slate-800">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-slate-100">建议仓位配置模型</h3>
                  <div className="flex p-1 bg-slate-800 rounded-lg border border-slate-700">
                    <button
                       onClick={() => setAllocationType('aggressive')}
                       className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${
                         allocationType === 'aggressive' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                       }`}
                    >
                      <Rocket className="w-3 h-3" /> 激进型
                    </button>
                    <button
                       onClick={() => setAllocationType('balanced')}
                       className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${
                         allocationType === 'balanced' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                       }`}
                    >
                      <ShieldCheck className="w-3 h-3" /> 平衡型
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                   <p className="text-slate-300 text-sm italic border-l-2 border-slate-600 pl-3">
                     "{d.allocation_model[allocationType].description}"
                   </p>
                </div>

                {/* Visual Bar */}
                <div className="w-full h-4 bg-slate-800 rounded-full flex overflow-hidden mb-8">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{width: `${d.allocation_model[allocationType].allocation.equity_value}%`}}
                    title="底仓/防御"
                  ></div>
                  <div 
                    className="h-full bg-emerald-500" 
                    style={{width: `${d.allocation_model[allocationType].allocation.equity_growth}%`}}
                    title="稳健成长"
                  ></div>
                  <div 
                    className="h-full bg-slate-500" 
                    style={{width: `${d.allocation_model[allocationType].allocation.bonds_cash}%`}}
                    title="现金/债券"
                  ></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-blue-400 text-xs font-bold">底仓/防御 (红利/大金融)</span>
                         <span className="text-white font-bold">{d.allocation_model[allocationType].allocation.equity_value}%</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">提供稳定的现金流和较低的波动性，作为市场不确定性下的安全垫。</p>
                   </div>
                   <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-emerald-400 text-xs font-bold">稳健成长 (主板白马)</span>
                         <span className="text-white font-bold">{d.allocation_model[allocationType].allocation.equity_growth}%</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">配置主板中业绩确定性高、估值合理的成长龙头，享受长期增长红利。</p>
                      <div className="flex flex-wrap gap-2">
                        {d.allocation_model[allocationType].suggested_picks.map((pick, i) => (
                          <span key={i} className="px-2 py-0.5 bg-emerald-900/50 border border-emerald-700 text-emerald-300 text-[10px] rounded">
                             {pick}
                          </span>
                        ))}
                      </div>
                   </div>
                   <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-slate-400 text-xs font-bold">现金/债券</span>
                         <span className="text-white font-bold">{d.allocation_model[allocationType].allocation.bonds_cash}%</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">保持资金灵活性，应对市场波动，或作为未来投资的储备。</p>
                   </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};
