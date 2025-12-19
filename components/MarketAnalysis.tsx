
import React, { useState, useEffect } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HistoricalYearData } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { fetchSectorHistory } from '../services/geminiService';
import { Loader2, BarChart2, TrendingUp, Zap, Wind, Layers, Settings, ShieldCheck, Rocket, ListChecks, Target, Hourglass, Search, Cpu, Banknote, ArrowUpRight, ArrowDownRight, Activity, CalendarDays, History, Calendar, LayoutGrid, Info } from 'lucide-react';
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
  const [allocationType, setAllocationType] = useState<'aggressive' | 'balanced'>('aggressive');
  
  const [historyMode, setHistoryMode] = useState(false);
  const [historyYear, setHistoryYear] = useState('2024');
  const [historyMonth, setHistoryMonth] = useState('all');
  const [historyData, setHistoryData] = useState<HistoricalYearData | null>(null);

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
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {historyMode ? <CalendarDays className="w-6 h-6 text-indigo-600" /> : <BarChart2 className="w-6 h-6 text-blue-600" />}
              {historyMode ? `${historyYear} 年度题材复盘` : `${marketLabel} 深度推演 (Deep Dive)`}
            </h2>
            {d && d.data_date && !historyMode && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs font-medium px-2 py-0.5 rounded w-fit bg-green-50 text-green-700">
                <Calendar className="w-3 h-3" /> 数据基准: {d.data_date}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <button
               onClick={() => setHistoryMode(!historyMode)}
               className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                 historyMode ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
               }`}
            >
               <History className="w-4 h-4" />
               {historyMode ? "返回实时分析" : "历史复盘"}
            </button>

            {!historyMode && (
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200">
                  <button onClick={() => onPeriodUpdate('day')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${savedPeriod === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>今日</button>
                  <button onClick={() => onPeriodUpdate('month')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${savedPeriod === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>本月</button>
                </div>
                <button
                  onClick={handleAnalysis}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {loading ? <span className="font-mono">{elapsedSeconds}s</span> : '生成全景报告'}
                </button>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="mb-6 p-8 bg-slate-50 rounded-xl border border-indigo-100 flex flex-col items-center justify-center text-center animate-pulse">
             <div className="bg-white p-4 rounded-full shadow-sm mb-4">
               <Cpu className="w-8 h-8 text-indigo-600 animate-bounce" />
             </div>
             <h3 className="text-lg font-bold text-slate-800 mb-2">正在深度扫描全场主力动向...</h3>
             <p className="text-sm text-slate-500 max-w-md">包含龙虎榜、大宗交易与活跃资金流向。通常耗时 20-40 秒。</p>
          </div>
        )}

        {/* --- Volume & Capital Signal看板 --- */}
        {!historyMode && d && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase mb-1">
                     <Activity className="w-4 h-4" /> 成交额
                  </div>
                  <div className="text-2xl font-bold text-slate-800">{d.market_volume?.total_volume}</div>
                  <div className="text-xs text-slate-500">{d.market_volume?.volume_delta}</div>
               </div>
               <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase mb-1">
                     <Zap className="w-4 h-4" /> 买卖差趋势
                  </div>
                  <div className="text-lg font-bold text-slate-800 truncate">{d.market_volume?.active_buy_spread || "趋势增强中"}</div>
                  <div className="text-xs text-rose-500">Active Spread Trend</div>
               </div>
               <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase mb-1">
                     <LayoutGrid className="w-4 h-4" /> 龙虎榜监控
                  </div>
                  <div className="text-sm font-bold text-slate-800 line-clamp-2">{d.institutional_signals?.dragon_tiger_summary || "机构活跃"}</div>
               </div>
               <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-violet-600 font-bold text-xs uppercase mb-1">
                     <Wind className="w-4 h-4" /> 大宗交易
                  </div>
                  <div className="text-sm font-bold text-slate-800 line-clamp-2">{d.institutional_signals?.block_trade_activity || "溢价波动低"}</div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-slate-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
                <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">市场情绪评分</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-6xl font-bold tracking-tighter">{d.market_sentiment.score}</span>
                  <span className="text-slate-500 font-mono">/ 100</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full mb-4">
                   <div className="h-full bg-amber-500 rounded-full" style={{ width: `${d.market_sentiment.score}%` }}></div>
                </div>
                <p className="text-sm text-slate-300 border-l-2 border-amber-500 pl-3">{d.market_sentiment.summary}</p>
              </div>

              <div className="lg:col-span-1 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-slate-800 font-bold flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  主力资金趋势 (Main Flow)
                </h3>
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <div className="text-xs font-bold text-emerald-700 mb-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> 净流入趋势</div>
                    <div className="flex flex-wrap gap-2">{d.capital_rotation.inflow_sectors.map((s, i) => <span key={i} className="text-xs font-bold text-slate-800">{s}</span>)}</div>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-lg">
                    <div className="text-xs font-bold text-rose-700 mb-1 flex items-center gap-1"><ArrowDownRight className="w-3 h-3"/> 净流出趋势</div>
                    <div className="flex flex-wrap gap-2">{d.capital_rotation.outflow_sectors.map((s, i) => <span key={i} className="text-xs font-bold text-slate-800">{s}</span>)}</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1 bg-slate-50 rounded-xl p-6 border border-slate-200">
                 <h3 className="text-slate-800 font-bold flex items-center gap-2 mb-4">
                    <Info className="w-5 h-5 text-indigo-600" />
                    高频信号解读
                 </h3>
                 <p className="text-sm text-slate-600 leading-relaxed italic">
                    "{d.institutional_signals?.active_money_flow_trend}"
                 </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
