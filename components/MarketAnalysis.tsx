
import React, { useState, useEffect } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { Loader2, BarChart2, TrendingUp, Zap, Search, Cpu, ArrowUpRight, ArrowDownRight, Activity, History, Calendar, LayoutGrid, Info, ArrowUp, ArrowDown, ListOrdered, Target, Sparkles } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';

interface MarketAnalysisProps {
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: UserSettings;
  onOpenSettings?: () => void;
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsedSeconds(0);
      interval = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleAnalysis = async () => {
    setLoading(true);
    onResultUpdate(null);
    setError(null);
    try {
      const data = await analyzeWithLLM(currentModel, "", true, settings, true, savedPeriod, undefined, currentMarket);
      onResultUpdate(data);
    } catch (err: any) {
      setError(err.message || "全景报告生成失败。");
    } finally {
      setLoading(false);
    }
  };

  const d = savedResult?.structuredData;
  const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <BarChart2 className="w-6 h-6 text-white" />
              </div>
              {marketLabel} 量化推演核心看板
            </h2>
            {d?.data_date && (
              <div className="flex items-center gap-1.5 mt-2 text-xs font-bold px-2 py-0.5 rounded w-fit bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Calendar className="w-3 h-3" /> 数据基准: {d.data_date}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
              <button onClick={() => onPeriodUpdate('day')} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${savedPeriod === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>今日实时</button>
              <button onClick={() => onPeriodUpdate('month')} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${savedPeriod === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>本月趋势</button>
            </div>
            <button
              onClick={handleAnalysis}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-200 disabled:opacity-50 transition-all hover:scale-[1.02]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />}
              {loading ? `${elapsedSeconds}s 深度扫描...` : '刷新量化报告'}
            </button>
          </div>
        </div>

        {error && (
           <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 flex items-center gap-3 mb-6">
              <Info className="w-5 h-5" />
              <span className="font-medium">{error}</span>
           </div>
        )}

        {/* --- 1. Indices (Enhanced) --- */}
        {d?.market_indices && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {d.market_indices.map((idx, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-all group">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500">{idx.name}</div>
                <div className="flex items-baseline justify-between">
                  <div className="text-xl font-black text-slate-800 tracking-tighter">{idx.value}</div>
                  <div className={`flex items-center text-xs font-black px-1.5 py-0.5 rounded ${idx.direction === 'up' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {idx.direction === 'up' ? '+' : ''}{idx.change}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- 2. Central Pulse Section --- */}
        {d && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Sentiment Column */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 group-hover:rotate-45 transition-transform">
                   <Activity className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                   <h3 className="text-indigo-400 text-xs font-black uppercase tracking-[0.2em] mb-4">全市场情绪水位</h3>
                   <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-7xl font-black tracking-tighter">{d.market_sentiment.score}</span>
                      <span className="text-slate-500 font-black text-2xl">/100</span>
                   </div>
                   <div className="w-full h-4 bg-slate-800 rounded-full mb-6 relative overflow-hidden">
                      <div 
                         className={`h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.3)] ${
                           d.market_sentiment.score > 60 ? 'bg-rose-500' : d.market_sentiment.score < 40 ? 'bg-emerald-500' : 'bg-amber-500'
                         }`}
                         style={{ width: `${d.market_sentiment.score}%` }}
                      ></div>
                   </div>
                   <p className="text-sm text-slate-300 font-medium leading-relaxed italic border-l-4 border-indigo-500 pl-4">
                     "{d.market_sentiment.summary}"
                   </p>
                </div>
              </div>
              
              <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6">
                 <h3 className="text-indigo-900 font-black flex items-center gap-2 mb-4 text-sm">
                    <Target className="w-4 h-4" /> 活跃资金解读 (AI Insight)
                 </h3>
                 <p className="text-xs text-indigo-700 font-bold leading-relaxed">
                   {d.institutional_signals?.active_money_flow_trend}
                 </p>
              </div>
            </div>

            {/* Dragon Tiger Top 10 List */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-slate-800 font-black flex items-center gap-2 text-lg">
                    <ListOrdered className="w-6 h-6 text-amber-500" />
                    龙虎榜核心标的 Top 10
                 </h3>
                 <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">SMART MONEY</span>
               </div>
               
               <div className="space-y-3">
                  {d.institutional_signals?.lh_top_10?.map((stock, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-200 cursor-default group">
                       <span className="text-lg font-black text-slate-300 group-hover:text-indigo-500 transition-colors w-6">{(i+1).toString().padStart(2, '0')}</span>
                       <div className="flex-1">
                          <div className="flex justify-between items-center">
                             <span className="font-black text-slate-800">{stock.name}</span>
                             <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg">+{stock.net_buy}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold mt-0.5 line-clamp-1 group-hover:line-clamp-none transition-all">{stock.logic}</div>
                       </div>
                    </div>
                  ))}
                  {(!d.institutional_signals?.lh_top_10 || d.institutional_signals.lh_top_10.length === 0) && (
                    <div className="py-20 text-center text-slate-400 italic">暂无上榜明细</div>
                  )}
               </div>
            </div>

            {/* Capital Rotation (Right Column) */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                 <h3 className="text-slate-800 font-black flex items-center gap-2 mb-6">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    资金主线
                 </h3>
                 <div className="space-y-4">
                    <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                       <div className="text-[10px] font-black text-rose-600 mb-2 uppercase tracking-widest flex items-center gap-1">
                         <ArrowUpRight className="w-4 h-4"/> 强攻板块
                       </div>
                       <div className="flex flex-wrap gap-2">
                          {d.capital_rotation.inflow_sectors.map((s, i) => <span key={i} className="px-2 py-1 bg-white border border-rose-200 rounded-lg text-xs font-black text-rose-700 shadow-sm">{s}</span>)}
                       </div>
                    </div>
                    
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                       <div className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest flex items-center gap-1">
                         <Sparkles className="w-4 h-4"/> 主力流入个股
                       </div>
                       <div className="flex flex-wrap gap-2">
                          {d.capital_rotation.top_inflow_stocks?.map((s, i) => <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">{s}</span>)}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6">
                 <h3 className="text-emerald-900 font-black flex items-center gap-2 mb-4 text-sm">
                    <Activity className="w-4 h-4" /> 盘面基本数据
                 </h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <div className="text-[10px] font-bold text-emerald-600 uppercase">成交额</div>
                       <div className="text-lg font-black text-emerald-900">{d.market_volume.total_volume}</div>
                    </div>
                    <div>
                       <div className="text-[10px] font-bold text-emerald-600 uppercase">增减量</div>
                       <div className="text-lg font-black text-emerald-900">{d.market_volume.volume_delta}</div>
                    </div>
                 </div>
              </div>
            </div>

          </div>
        )}

        {loading && (
          <div className="py-40 flex flex-col items-center justify-center text-center animate-pulse">
             <div className="relative">
                <Cpu className="w-16 h-16 text-indigo-600 mb-4 animate-spin-slow" />
                <Search className="w-6 h-6 text-indigo-400 absolute top-0 right-0 animate-bounce" />
             </div>
             <h3 className="text-2xl font-black text-slate-800">正在回溯 龙虎榜 Top 10 & 主动买卖盘...</h3>
             <p className="text-slate-500 font-bold mt-2">通常需要 15-30 秒以确保数据的准确与实时性</p>
          </div>
        )}

        {!loading && !d && !error && (
          <div className="py-40 text-center flex flex-col items-center justify-center">
            <div className="p-8 bg-slate-50 rounded-full mb-6">
              <Search className="w-16 h-16 text-slate-200" />
            </div>
            <p className="text-slate-400 font-black text-xl">请点击上方按钮 生成深度量化推演报告</p>
          </div>
        )}
      </div>
    </div>
  );
};
