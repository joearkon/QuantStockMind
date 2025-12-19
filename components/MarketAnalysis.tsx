
import React, { useState, useEffect } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { Loader2, BarChart2, TrendingUp, Zap, Search, Cpu, Activity, ListOrdered, Shuffle, Gauge, TrendingDown, Info } from 'lucide-react';
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
    setError(null);
    try {
      const data = await analyzeWithLLM(currentModel, "", true, settings, true, savedPeriod, undefined, currentMarket);
      onResultUpdate(data);
    } catch (err: any) {
      setError(err.message || "看板同步失败。");
    } finally {
      setLoading(false);
    }
  };

  const d = savedResult?.structuredData;
  const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;

  const renderGauge = (score: number) => {
    const radius = 70;
    const circumference = Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    return (
      <div className="relative flex flex-col items-center">
        <svg width="180" height="110" className="transform translate-y-2">
          <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="#f1f5f9" strokeWidth="12" strokeLinecap="round" />
          <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke={score > 60 ? '#ef4444' : score < 40 ? '#10b981' : '#f59e0b'} strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000" />
        </svg>
        <div className="absolute top-10 flex flex-col items-center">
          <span className="text-4xl font-black text-slate-800">{score}</span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5"> सेंटीमेंट指数</span>
        </div>
        <div className="flex justify-between w-full px-4 text-[10px] font-black mt-2">
          <span className="text-emerald-500">恐慌</span>
          <span className="text-slate-400">中性</span>
          <span className="text-rose-500">贪婪</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      
      {/* 1. Indices Section - 核心指数置顶 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {d?.market_indices && d.market_indices.length > 0 ? (
          d.market_indices.map((idx, i) => (
            <div key={i} className={`bg-white rounded-2xl p-4 border border-slate-200 shadow-sm transition-all hover:scale-[1.02] ${idx.direction === 'up' ? 'bg-rose-50/20 border-rose-100' : 'bg-emerald-50/20 border-emerald-100'}`}>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{idx.name}</div>
              <div className="flex flex-col">
                <div className={`text-xl font-black tracking-tighter ${idx.direction === 'up' ? 'text-rose-600' : 'text-emerald-600'}`}>{idx.value}</div>
                <div className={`flex items-center text-[10px] font-black mt-1 ${idx.direction === 'up' ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {idx.direction === 'up' ? '+' : ''}{idx.change} ({idx.percent || '0%'})
                </div>
              </div>
            </div>
          ))
        ) : (
          [1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 border-dashed flex items-center justify-center">
               {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-200" /> : <span className="text-[10px] text-slate-300">待同步</span>}
            </div>
          ))
        )}
      </div>

      {/* 控制条 & 局部加载提示 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 px-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        {loading && (
           <div className="absolute top-0 left-0 h-1 bg-indigo-600 animate-loading-bar w-full"></div>
        )}
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-2 rounded-xl text-white">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BarChart2 className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              {marketLabel} 盘面实测
              {loading && <span className="text-xs text-indigo-500 font-bold animate-pulse">正在同步数据 ({elapsedSeconds}s)...</span>}
            </h2>
            {d?.data_date && !loading && <span className="text-[10px] text-slate-400 font-bold">交易基准日: {d.data_date}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
            <button onClick={() => onPeriodUpdate('day')} className={`px-5 py-2 text-xs font-black rounded-lg transition-all ${savedPeriod === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>今日实时</button>
            <button onClick={() => onPeriodUpdate('month')} className={`px-5 py-2 text-xs font-black rounded-lg transition-all ${savedPeriod === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>本月概览</button>
          </div>
          <button 
            onClick={handleAnalysis} 
            disabled={loading} 
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all active:scale-95"
          >
            <Zap className={`w-4 h-4 ${loading ? 'animate-bounce' : 'fill-amber-300 text-amber-300'}`} />
            {loading ? '同步中' : '刷新快照'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 animate-fade-in">
          <Info className="w-5 h-5" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {d ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 左侧：情绪仪表盘与流动性实测 */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col items-center group transition-all hover:shadow-md">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1">
                <Gauge className="w-4 h-4 text-slate-800" /> 全场赚钱效应水位
              </div>
              {renderGauge(d.market_sentiment?.score || 0)}
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] font-bold text-slate-500 text-center leading-relaxed">
                "{d.market_sentiment?.summary}"
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-xl space-y-6">
              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4" /> 今日流动性实测
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="text-3xl font-black tracking-tighter">{d.market_volume?.total_volume || '--'}</div>
                  <div className={`text-[10px] font-black px-2 py-1 rounded-lg ${d.market_volume?.volume_trend === 'expansion' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {d.market_volume?.volume_trend === 'expansion' ? '较前日放量' : '较前日缩量'}
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${d.market_volume?.volume_trend === 'expansion' ? 'bg-rose-500 shadow-lg shadow-rose-500/50' : 'bg-emerald-500 shadow-lg shadow-emerald-500/50'}`} style={{width: '75%'}}></div>
                </div>
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 font-bold">主动买卖盘差:</span>
                    <span className="text-white font-black">{d.market_volume?.active_buy_spread || '--'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 font-bold">资金面评价:</span>
                    <span className="text-indigo-400 font-black">{d.market_volume?.capital_mood || '--'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：龙虎榜前10实录 */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm p-8 overflow-hidden flex flex-col min-h-[500px]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-slate-900 font-black flex items-center gap-2 text-xl">
                <ListOrdered className="w-7 h-7 text-amber-500" />
                主力机构龙虎榜 Top 10
              </h3>
              <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full border border-slate-200">INSTITUTIONAL NET BUY</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar">
              {d.institutional_signals?.lh_top_10 && d.institutional_signals.lh_top_10.length > 0 ? (
                d.institutional_signals.lh_top_10.map((stock, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-xl hover:scale-[1.02] transition-all group">
                    <span className="text-2xl font-black text-slate-200 group-hover:text-indigo-500 transition-colors w-10 text-center">{(i + 1).toString().padStart(2, '0')}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-slate-800 truncate text-base">{stock.name}</span>
                        <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">{stock.net_buy}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold leading-relaxed line-clamp-1 group-hover:line-clamp-none transition-all">{stock.logic}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-20 text-center text-slate-300 italic">暂无龙虎榜具体明细数据</div>
              )}
            </div>
          </div>

          {/* 底部通栏：板块资金搬家路径 (Rotation) */}
          <div className="lg:col-span-12">
            <div className="bg-slate-50 border border-slate-200 rounded-[3rem] p-10 shadow-inner relative overflow-hidden">
              <h3 className="text-slate-900 font-black flex items-center gap-2 mb-10 text-xl">
                <Shuffle className="w-7 h-7 text-indigo-600" />
                主力资金实测搬家路径
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center relative z-10">
                {/* 撤离区 */}
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-emerald-500" /> 资金撤离区 (Outflow)
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {d.capital_rotation?.outflow_sectors?.map((s, i) => (
                      <div key={i} className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-500 shadow-sm flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-emerald-400"></div> {s}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 逻辑核心 */}
                <div className="flex flex-col items-center justify-center p-8 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                   <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">搬家逻辑解读</div>
                   <p className="text-lg font-bold text-slate-800 text-center leading-relaxed italic px-4">
                      "{d.capital_rotation?.rotation_logic || '正在深度分析资金动态...'}"
                   </p>
                </div>

                {/* 介入区 */}
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-rose-500" /> 资金介入区 (Inflow)
                  </div>
                  <div className="flex flex-wrap gap-3 mb-6">
                    {d.capital_rotation?.inflow_sectors?.map((s, i) => (
                      <div key={i} className="px-5 py-3 bg-white border border-rose-100 rounded-2xl text-[11px] font-black text-rose-700 shadow-md flex items-center gap-2 border-b-4 border-b-rose-400">
                         <div className="w-2 h-2 rounded-full bg-rose-500"></div> {s}
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-[10px] font-black text-slate-400 mb-2 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" /> 深度介入标的:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.capital_rotation?.top_inflow_stocks?.map((s, i) => <span key={i} className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg">{s}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200">
          {!loading ? (
            <>
              <Search className="w-16 h-16 text-slate-200 mb-6" />
              <p className="text-slate-400 font-black text-xl tracking-tight">暂无实测数据</p>
              <p className="text-slate-300 text-sm mt-3 font-medium">点击右上角 “刷新快照” 开始同步今日五大指数与主力动向</p>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <Cpu className="w-20 h-20 text-indigo-600 animate-spin-slow mb-6" />
              <p className="text-slate-500 font-black text-lg">正在全网实测盘面数据，请稍候...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
