
import React, { useState, useEffect } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HistoricalYearData } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { fetchSectorHistory } from '../services/geminiService';
import { Loader2, BarChart2, TrendingUp, Zap, Wind, Layers, Settings, ShieldCheck, Rocket, ListChecks, Target, Hourglass, Search, Cpu, Banknote, ArrowUpRight, ArrowDownRight, Activity, CalendarDays, History, Calendar } from 'lucide-react';
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
  
  // History Mode State
  const [historyMode, setHistoryMode] = useState(false);
  const [historyYear, setHistoryYear] = useState('2024');
  const [historyMonth, setHistoryMonth] = useState('all');
  const [historyData, setHistoryData] = useState<HistoricalYearData | null>(null);

  // Progress tracking
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
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

  const handleHistoryFetch = async () => {
    setLoading(true);
    setError(null);
    setHistoryData(null);
    try {
      // Fix: API key is now handled internally via process.env.API_KEY, so it is removed from the service call
      const res = await fetchSectorHistory(historyYear, historyMonth, currentMarket);
      if (res.historyData) {
        setHistoryData(res.historyData);
      }
    } catch (err: any) {
      setError(err.message || "历史数据获取失败");
    } finally {
      setLoading(false);
    }
  };

  const d = savedResult?.structuredData;
  const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;

  // Safe Accessors
  const sentimentScore = d?.market_sentiment?.score ?? 50;
  const sentimentSummary = d?.market_sentiment?.summary ?? "暂无情绪数据";
  const hotTopics = d?.hot_topics ?? [];
  const capitalRotation = d?.capital_rotation;
  const deepLogic = d?.deep_logic;
  const allocationModel = d?.allocation_model;
  
  // Data Date Display logic
  const dataDateStr = d?.data_date;
  const isStale = dataDateStr && !dataDateStr.includes("Realtime") && dataDateStr !== new Date().toLocaleDateString('zh-CN');

  // Dynamic Loading Text based on elapsed time
  const getLoadingStatus = () => {
    if (historyMode) return { text: `正在回溯 ${historyYear}年 ${historyMonth === 'all' ? '' : historyMonth + '月'} 数据...`, icon: History };
    if (elapsedSeconds < 3) return { text: "正在初始化 AI 模型...", icon: Cpu };
    if (elapsedSeconds < 8) return { text: `联网搜索 ${marketLabel} 实时行情与新闻...`, icon: Search };
    if (elapsedSeconds < 16) return { text: "深度挖掘：主力资金流向与机构动向...", icon: TrendingUp };
    if (elapsedSeconds < 24) return { text: "量化计算：市场情绪评分与板块轮动...", icon: BarChart2 };
    if (elapsedSeconds < 32) return { text: "策略推演：生成攻守兼备的仓位模型...", icon: Layers };
    return { text: "正在整理最终结构化报告 (数据量大，请稍候)...", icon: Loader2 };
  };

  const status = getLoadingStatus();
  const StatusIcon = status.icon;

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
            {/* Show Data Date if available */}
            {d && d.data_date && !historyMode && (
              <div className={`flex items-center gap-1.5 mt-1.5 text-xs font-medium px-2 py-0.5 rounded w-fit ${isStale ? 'bg-amber-100 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                <Calendar className="w-3 h-3" />
                数据基准: {d.data_date} {isStale && "(非实时)"}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Toggle History Mode */}
            <button
               onClick={() => setHistoryMode(!historyMode)}
               className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                 historyMode ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
               }`}
            >
               <History className="w-4 h-4" />
               {historyMode ? "返回实时分析" : "历史复盘"}
            </button>

            {historyMode ? (
              <div className="flex items-center gap-2">
                 <select 
                   value={historyYear} 
                   onChange={(e) => setHistoryYear(e.target.value)}
                   className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-indigo-500"
                 >
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                 </select>
                 <select 
                   value={historyMonth} 
                   onChange={(e) => setHistoryMonth(e.target.value)}
                   className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-indigo-500"
                 >
                    <option value="all">全年 (All)</option>
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                       <option key={m} value={m.toString()}>{m}月</option>
                    ))}
                 </select>
                 <button
                   onClick={handleHistoryFetch}
                   disabled={loading}
                   className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm disabled:opacity-50"
                 >
                   {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                   查询
                 </button>
              </div>
            ) : (
              // Real-time Controls
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
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {loading ? (
                    <span className="font-mono">{elapsedSeconds}s</span>
                  ) : '生成全景报告'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading State Visualization */}
        {loading && (
          <div className="mb-6 p-8 bg-slate-50 rounded-xl border border-indigo-100 flex flex-col items-center justify-center text-center animate-pulse relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
             <div className="bg-white p-4 rounded-full shadow-sm mb-4 relative z-10">
               <StatusIcon className={`w-8 h-8 text-indigo-600 ${elapsedSeconds > 32 ? 'animate-spin' : 'animate-bounce'}`} />
             </div>
             <h3 className="text-lg font-bold text-slate-800 mb-2 relative z-10">
               {status.text}
             </h3>
             <p className="text-sm text-slate-500 relative z-10 max-w-md">
               AI 正在实时聚合多维数据。通常耗时 20-40 秒。
             </p>
          </div>
        )}

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

        {/* --- HISTORY MODE VIEW --- */}
        {historyMode && !loading && historyData && (
           <div className="animate-slide-up">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-center">
                 <h3 className="text-lg font-bold text-slate-800">
                    {historyData.year} {historyMonth === 'all' ? '年度' : `${historyMonth}月`} 主线回顾
                 </h3>
                 <p className="text-slate-600 text-sm mt-1">{historyData.yearly_summary}</p>
              </div>
              
              <div className={`grid grid-cols-1 ${historyData.months.length === 1 ? 'max-w-2xl mx-auto' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} gap-4`}>
                 {historyData.months.map((m) => (
                    <div key={m.month} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                       <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                          <span className="font-bold text-slate-700 text-lg">{m.month}月</span>
                          <span className="text-xs bg-white px-2 py-0.5 rounded text-slate-500 border border-slate-200 line-clamp-1 max-w-[140px]" title={m.key_event}>{m.key_event}</span>
                       </div>
                       <div className="p-4 space-y-4 flex-1 flex flex-col">
                          <div className="text-sm text-slate-600 italic mb-2 flex-grow bg-slate-50 p-2 rounded border border-slate-100">{m.summary}</div>
                          
                          {/* Winners */}
                          <div>
                             <div className="text-xs font-bold text-rose-600 uppercase mb-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> 领涨 (Winners)
                             </div>
                             <div className="flex flex-wrap gap-1">
                                {m.winners.map((w, i) => (
                                   <div key={i} className="px-2 py-1 bg-rose-50 border border-rose-100 text-rose-700 rounded text-xs font-medium w-full flex justify-between">
                                      <span>{w.name}</span>
                                      <span className="font-bold">{w.change_approx}</span>
                                   </div>
                                ))}
                             </div>
                          </div>

                          {/* Losers */}
                          <div>
                             <div className="text-xs font-bold text-emerald-600 uppercase mb-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 rotate-180" /> 领跌 (Losers)
                             </div>
                             <div className="flex flex-wrap gap-1">
                                {m.losers.map((l, i) => (
                                   <div key={i} className="px-2 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded text-xs font-medium w-full flex justify-between">
                                      <span>{l.name}</span>
                                      <span className="font-bold">{l.change_approx}</span>
                                   </div>
                                ))}
                             </div>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* --- REAL-TIME MODE VIEW --- */}
        {!historyMode && !d && !loading && !error && (
          <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>点击“生成全景报告”获取基于 {currentModel} 的深度市场复盘</p>
          </div>
        )}

        {/* Indices Row */}
        {!historyMode && d && d.market_indices && d.market_indices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {d.market_indices.map((idx, i) => {
              // Check if data is valid (not 0.00, not NaN, not "未更新")
              const isInvalid = !idx.value || idx.value === "0.00" || idx.value.includes("未更新") || idx.value.includes("NaN");
              const isUp = idx.direction === 'up';
              const colorClass = isInvalid ? 'text-slate-400' : isUp ? 'text-rose-500' : 'text-emerald-500';
              const bgClass = isInvalid ? 'bg-slate-500' : isUp ? 'bg-rose-500' : 'bg-emerald-500';

              return (
                <div key={i} className="bg-slate-900 rounded-lg p-4 text-white shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-slate-400 text-sm font-medium">{idx.name}</span>
                      <span className={`text-sm font-bold ${colorClass}`}>
                         {isInvalid ? 'Data Unavailable' : idx.change}
                      </span>
                    </div>
                    <div className={`text-2xl font-bold tracking-tight ${isInvalid ? 'text-slate-500' : ''}`}>
                      {idx.value}
                    </div>
                  </div>
                  <div className={`absolute -right-4 -bottom-6 w-20 h-20 rounded-full blur-2xl opacity-20 ${bgClass}`}></div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- NEW: Volume & Capital Dashboard --- */}
        {!historyMode && d && d.market_volume && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
             {/* Total Volume */}
             <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase mb-1">
                   <Activity className="w-4 h-4" /> 两市成交额
                </div>
                <div className="text-2xl font-bold text-slate-800">{d.market_volume.total_volume}</div>
                <div className="text-xs text-slate-500">Total Volume</div>
             </div>

             {/* Volume Delta */}
             <div className={`border rounded-xl p-4 flex flex-col justify-center ${d.market_volume.volume_trend === 'expansion' ? 'bg-rose-50 border-rose-100' : d.market_volume.volume_trend === 'contraction' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className={`flex items-center gap-2 font-bold text-xs uppercase mb-1 ${d.market_volume.volume_trend === 'expansion' ? 'text-rose-600' : d.market_volume.volume_trend === 'contraction' ? 'text-emerald-600' : 'text-slate-600'}`}>
                   {d.market_volume.volume_trend === 'expansion' ? <ArrowUpRight className="w-4 h-4"/> : <ArrowDownRight className="w-4 h-4"/>} 
                   量能变化
                </div>
                <div className="text-lg font-bold text-slate-800 truncate">{d.market_volume.volume_delta}</div>
                <div className="text-xs text-slate-500">Volume Delta</div>
             </div>

             {/* Net Inflow */}
             <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase mb-1">
                   <Banknote className="w-4 h-4" /> 资金信号
                </div>
                <div className="text-lg font-bold text-slate-800 truncate">{d.market_volume.net_inflow}</div>
                <div className="text-xs text-slate-500">Net Inflow</div>
             </div>

             {/* Capital Mood */}
             <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-violet-600 font-bold text-xs uppercase mb-1">
                   <Zap className="w-4 h-4" /> 市场活水
                </div>
                <div className="text-lg font-bold text-slate-800 truncate">{d.market_volume.capital_mood}</div>
                <div className="text-xs text-slate-500">Liquidity</div>
             </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!historyMode && d && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Col 1: Market Sentiment */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none"></div>
                <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">市场情绪评分</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className={`text-6xl font-bold tracking-tighter ${
                    sentimentScore >= 60 ? 'text-amber-400' : 'text-slate-200'
                  }`}>
                    {sentimentScore}
                  </span>
                  <span className="text-slate-500 font-mono">/ 100</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full mb-4 overflow-hidden">
                   <div 
                     className={`h-full rounded-full transition-all duration-1000 ease-out ${
                       sentimentScore >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-slate-500'
                     }`} 
                     style={{ width: `${sentimentScore}%` }}
                   ></div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-amber-500 pl-3">
                  {sentimentSummary}
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-slate-800 font-bold flex items-center gap-2 mb-4">
                  <Wind className="w-5 h-5 text-indigo-500" />
                  风口题材 (Wind Topics)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {hotTopics.length > 0 ? hotTopics.map((topic, idx) => (
                    <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full border border-indigo-100">
                      {topic}
                    </span>
                  )) : <span className="text-slate-400 text-sm">暂无题材数据</span>}
                </div>
              </div>
            </div>

            {/* Col 2: Capital Rotation */}
            {capitalRotation && (
              <div className="lg:col-span-1 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-slate-800 font-bold flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  主力/资金轮动 (Main Force)
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">INFLOW</span>
                      <span className="text-sm font-medium text-slate-600">主力买入</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                       {capitalRotation.inflow_sectors?.map((s, i) => (
                         <span key={i} className="text-sm font-bold text-slate-800 border-b-2 border-emerald-400 pb-0.5">{s}</span>
                       )) || <span className="text-sm text-slate-400">无数据</span>}
                    </div>
                    <div className="text-xs text-slate-500 leading-normal">
                      {capitalRotation.inflow_reason || "暂无数据"}
                    </div>
                  </div>
                  <div className="border-t border-slate-100"></div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded">OUTFLOW</span>
                      <span className="text-sm font-medium text-slate-600">主力流出</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                       {capitalRotation.outflow_sectors?.map((s, i) => (
                         <span key={i} className="text-sm font-bold text-slate-800 border-b-2 border-rose-400 pb-0.5">{s}</span>
                       )) || <span className="text-sm text-slate-400">无数据</span>}
                    </div>
                    <div className="text-xs text-slate-500 leading-normal">
                      {capitalRotation.outflow_reason || "暂无数据"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Col 3: Deep Logic */}
            {deepLogic && (
              <div className="lg:col-span-1 bg-slate-50 rounded-xl p-6 border border-slate-200">
                 <h3 className="text-slate-800 font-bold flex items-center gap-2 mb-4">
                    <Layers className="w-5 h-5 text-blue-600" />
                    核心策略推演
                 </h3>
                 <div className="space-y-4">
                   <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                      <h4 className="text-xs font-bold text-blue-600 mb-1">1. 政策驱动 (Policy)</h4>
                      <p className="text-sm text-slate-700">{deepLogic.policy_driver || "暂无数据"}</p>
                   </div>
                   <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                      <h4 className="text-xs font-bold text-indigo-600 mb-1">2. 外部环境 (Macro)</h4>
                      <p className="text-sm text-slate-700">{deepLogic.external_environment || "暂无数据"}</p>
                   </div>
                   <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                      <h4 className="text-xs font-bold text-violet-600 mb-1">3. 估值与趋势 (Valuation)</h4>
                      <p className="text-sm text-slate-700">{deepLogic.market_valuation || "暂无数据"}</p>
                   </div>
                 </div>
              </div>
            )}

            {/* --- Opportunity Analysis --- */}
            {d.opportunity_analysis && (
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                 {d.opportunity_analysis.defensive_value && (
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
                        {d.opportunity_analysis.defensive_value.sectors?.map((s, i) => (
                          <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-600 text-emerald-200 text-xs rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                   </div>
                 )}

                 {d.opportunity_analysis.tech_growth && (
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
                        {d.opportunity_analysis.tech_growth.sectors?.map((s, i) => (
                          <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-600 text-rose-200 text-xs rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                   </div>
                 )}
              </div>
            )}

            {/* --- Detailed Allocation Model Table --- */}
            {allocationModel && allocationModel[allocationType] && (
              <div className="lg:col-span-3 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      {allocationType === 'aggressive' ? <Rocket className="w-5 h-5 text-rose-600" /> : <ShieldCheck className="w-5 h-5 text-emerald-600" />}
                      {allocationModel[allocationType].strategy_name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {allocationModel[allocationType].description}
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
                        {allocationModel[allocationType].action_plan?.map((step, idx) => (
                          <div key={idx} className="flex gap-3 text-sm text-slate-700">
                             <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold border border-slate-200">{idx + 1}</span>
                             <div className="pt-0.5">{step}</div>
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
                               <th className="p-3 font-semibold border-b border-slate-200">持仓数量 (Volume)</th>
                               <th className="p-3 font-semibold border-b border-slate-200">占比 (Weight)</th>
                               <th className="p-3 font-semibold border-b border-slate-200">逻辑标签</th>
                            </tr>
                         </thead>
                         <tbody className="text-sm divide-y divide-slate-100">
                            {allocationModel[allocationType].portfolio_table?.map((item, idx) => (
                               <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-3 font-medium text-slate-900">
                                     <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                        <span>{item.name}</span>
                                        {item.code !== '-' && <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.code}</span>}
                                     </div>
                                  </td>
                                  <td className="p-3 text-slate-700">{item.volume}</td>
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
                      <div className="text-sm font-medium leading-relaxed">
                         {allocationModel[allocationType].core_advantage}
                      </div>
                   </div>
                </div>
              </div>
            )}

            {/* Strategist Verdict */}
            {d?.strategist_verdict && (
              <div className="lg:col-span-3 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 border-l-4 border-blue-500 shadow-xl text-white">
                 <h3 className="text-blue-400 font-bold uppercase text-xs tracking-wider mb-2">Final Verdict</h3>
                 <div className="text-lg font-medium leading-relaxed opacity-90">
                   {d.strategist_verdict}
                 </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};
