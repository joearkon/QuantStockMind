import React, { useState, useEffect } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { fetchOpportunityMining } from '../services/opportunityService';
import { Radar, Loader2, Calendar, TrendingUp, AlertTriangle, Search, Lock, Zap, ArrowRight, DollarSign } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Progress visualization
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState("");

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => {
        setElapsed(prev => prev + 1);
        if (elapsed < 5) setPhase("正在分析历史日历效应 (Seasonality)...");
        else if (elapsed < 12) setPhase("正在扫描近期主力资金流向 (Smart Money)...");
        else if (elapsed < 18) setPhase("正在排除过热/高位板块 (Filtering)...");
        else setPhase("正在挖掘低位潜力标的 (Mining)...");
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [loading, elapsed]);

  const handleMine = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await fetchOpportunityMining(currentModel, currentMarket, settings);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "挖掘失败");
    } finally {
      setLoading(false);
    }
  };

  const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200">
                  <Radar className="w-6 h-6 animate-pulse-slow" />
                </div>
                短线精灵 (Short-term Wizard)
              </h2>
              <p className="text-slate-500 mt-2 max-w-xl text-sm leading-relaxed">
                不想追高？本功能利用 AI 结合 <span className="font-bold text-slate-700">“历史日历效应”</span> 与 <span className="font-bold text-slate-700">“近期资金暗流”</span>，
                为您挖掘那些尚未起爆、但主力正在潜伏的低位板块。拒绝马后炮，只看潜力。
              </p>
            </div>
            <button
              onClick={handleMine}
              disabled={loading}
              className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-slate-900 font-lg rounded-xl hover:bg-slate-800 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  <span>{elapsed}s</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  启动雷达扫描
                </>
              )}
              {/* Button Glow Effect */}
              {!loading && <div className="absolute -inset-3 rounded-xl bg-indigo-500 opacity-20 blur-lg group-hover:opacity-40 transition duration-200"></div>}
            </button>
          </div>
        </div>
        
        {/* Background Decorations */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-50 to-transparent pointer-events-none"></div>
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      </div>

      {/* Loading Phase */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 animate-pulse bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Radar className="w-12 h-12 text-indigo-400 mb-4 animate-spin-slow" />
          <p className="font-mono text-sm">{phase}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
          {onOpenSettings && (
             <button onClick={onOpenSettings} className="underline text-sm ml-auto">检查 API 设置</button>
          )}
        </div>
      )}

      {/* Results Grid */}
      {result && result.opportunityData && result.opportunityData.opportunities && (
        <div className="space-y-8 animate-slide-up">
          
          {/* Phase Banner */}
          <div className="flex items-center gap-4 bg-indigo-900 text-white px-6 py-4 rounded-xl shadow-lg">
             <Calendar className="w-5 h-5 text-indigo-300" />
             <div>
                <span className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Current Market Phase</span>
                <div className="font-bold text-lg">{result.opportunityData.market_phase}</div>
             </div>
             <div className="ml-auto text-right hidden sm:block">
                <div className="text-xs text-indigo-300">Target Month</div>
                <div className="font-bold">{result.opportunityData.month}</div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {result.opportunityData.opportunities.map((opp, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col">
                {/* Card Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 group-hover:bg-indigo-50/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                     <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                        {opp.sector_name}
                     </h3>
                     <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded border border-green-200">
                        潜伏期
                     </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                     <Lock className="w-3 h-3" /> 未过热 (Low Hype)
                  </div>
                </div>

                {/* Logic Section */}
                <div className="p-6 space-y-4 flex-1">
                   <div className="flex gap-3">
                      <div className="mt-1 min-w-[20px]"><Calendar className="w-4 h-4 text-slate-400" /></div>
                      <div>
                         <h4 className="text-xs font-bold text-slate-500 uppercase">历史规律 (Seasonality)</h4>
                         <p className="text-sm text-slate-700 leading-relaxed">{opp.reason_seasonality}</p>
                      </div>
                   </div>
                   
                   <div className="flex gap-3">
                      <div className="mt-1 min-w-[20px]"><DollarSign className="w-4 h-4 text-slate-400" /></div>
                      <div>
                         <h4 className="text-xs font-bold text-slate-500 uppercase">资金暗流 (Flow)</h4>
                         <p className="text-sm text-slate-700 leading-relaxed">{opp.reason_fund_flow}</p>
                      </div>
                   </div>

                   <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                      <h4 className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1">
                         <AlertTriangle className="w-3 h-3" /> 为什么选它 (Why Not Hype?)
                      </h4>
                      <p className="text-xs text-amber-900 opacity-80">{opp.avoid_reason}</p>
                   </div>
                </div>

                {/* Stocks Section */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100">
                   <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                      <Zap className="w-3 h-3 text-indigo-500" /> 关注标的 (Watchlist)
                   </h4>
                   <div className="space-y-3">
                      {opp.representative_stocks.map((stock, sIdx) => (
                         <div key={sIdx} className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col gap-2 hover:border-indigo-300 transition-colors">
                            <div className="flex justify-between items-center">
                               <div>
                                  <span className="font-bold text-slate-800">{stock.name}</span>
                                  <span className="text-xs text-slate-400 font-mono ml-2">{stock.code}</span>
                               </div>
                               <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {stock.current_price}
                               </span>
                            </div>
                            <div className="text-xs text-slate-500 border-t border-slate-100 pt-2 flex items-start gap-1">
                               <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-indigo-400" />
                               {stock.logic}
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-xs text-slate-400 mt-8">
             * 数据基于历史统计与近期资金流向估算，过往业绩不代表未来表现，仅供选股参考。
          </div>
        </div>
      )}
    </div>
  );
};