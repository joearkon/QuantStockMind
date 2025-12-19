
import React, { useState, useEffect } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HistoricalYearData } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { fetchSectorHistory } from '../services/geminiService';
import { Loader2, BarChart2, TrendingUp, Zap, Wind, Layers, Settings, ShieldCheck, Rocket, ListChecks, Target, Search, Cpu, Banknote, ArrowUpRight, ArrowDownRight, Activity, CalendarDays, History, Calendar } from 'lucide-react';
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

  const handleHistoryFetch = async () => {
    setLoading(true);
    setError(null);
    setHistoryData(null);
    try {
      const res = await fetchSectorHistory(historyYear, historyMonth, currentMarket);
      if (res.historyData) setHistoryData(res.historyData);
    } catch (err: any) {
      setError(err.message || "历史数据获取失败");
    } finally {
      setLoading(false);
    }
  };

  const d = savedResult?.structuredData;
  const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;

  const sentimentScore = d?.market_sentiment?.score ?? 50;
  const sentimentSummary = d?.market_sentiment?.summary ?? "暂无情绪数据";
  const hotTopics = d?.hot_topics ?? [];
  const capitalRotation = d?.capital_rotation;
  const deepLogic = d?.deep_logic;
  const allocationModel = d?.allocation_model;
  
  const isStale = d?.data_date && !d.data_date.includes("Realtime") && d.data_date !== new Date().toLocaleDateString('zh-CN');

  const getLoadingStatus = () => {
    if (historyMode) return { text: `正在回溯 ${historyYear}年数据...`, icon: History };
    if (elapsedSeconds < 3) return { text: "正在初始化 AI 模型...", icon: Cpu };
    if (elapsedSeconds < 8) return { text: `联网搜索 ${marketLabel} 实时行情...`, icon: Search };
    if (elapsedSeconds < 16) return { text: "深度挖掘：主力资金流向...", icon: TrendingUp };
    if (elapsedSeconds < 24) return { text: "量化计算：市场情绪评分...", icon: BarChart2 };
    return { text: "正在整理最终报告...", icon: Loader2 };
  };

  const status = getLoadingStatus();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {historyMode ? <CalendarDays className="w-6 h-6 text-indigo-600" /> : <BarChart2 className="w-6 h-6 text-blue-600" />}
              {historyMode ? `${historyYear} 年度题材复盘` : `${marketLabel} 深度推演`}
            </h2>
            {d?.data_date && !historyMode && (
              <div className={`flex items-center gap-1.5 mt-1.5 text-xs font-medium px-2 py-0.5 rounded w-fit ${isStale ? 'bg-amber-100 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                <Calendar className="w-3 h-3" />
                数据基准: {d.data_date}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setHistoryMode(!historyMode)} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${historyMode ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
               <History className="w-4 h-4" />
               {historyMode ? "返回实时分析" : "历史复盘"}
            </button>
            {historyMode ? (
              <div className="flex items-center gap-2">
                 <select value={historyYear} onChange={(e) => setHistoryYear(e.target.value)} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none">
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                 </select>
                 <button onClick={handleHistoryFetch} disabled={loading} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm disabled:opacity-50">查询</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200">
                  <button onClick={() => onPeriodUpdate('day')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${savedPeriod === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>今日</button>
                  <button onClick={() => onPeriodUpdate('month')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${savedPeriod === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>本月</button>
                </div>
                <button onClick={handleAnalysis} disabled={loading} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md disabled:opacity-50 min-w-[140px] justify-center">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {loading ? `${elapsedSeconds}s` : '生成报告'}
                </button>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="mb-6 p-8 bg-slate-50 rounded-xl border border-indigo-100 flex flex-col items-center justify-center text-center animate-pulse">
             <div className="bg-white p-4 rounded-full shadow-sm mb-4">
               <StatusIcon className={`w-8 h-8 text-indigo-600 ${elapsedSeconds > 32 ? 'animate-spin' : 'animate-bounce'}`} />
             </div>
             <h3 className="text-lg font-bold text-slate-800 mb-2">{status.text}</h3>
          </div>
        )}

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">{error}</div>}

        {!historyMode && d?.market_indices && d.market_indices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {d.market_indices.map((idx, i) => (
              <div key={i} className="bg-slate-900 rounded-lg p-4 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-baseline mb-1">
                  <span className="text-slate-400 text-sm font-medium">{idx.name}</span>
                  <span className={`text-sm font-bold ${idx.direction === 'up' ? 'text-rose-500' : 'text-emerald-500'}`}>{idx.change}</span>
                </div>
                <div className="text-2xl font-bold tracking-tight">{idx.value}</div>
              </div>
            ))}
          </div>
        )}

        {!historyMode && d?.market_volume && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
             <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase mb-1"><Activity className="w-4 h-4" /> 成交额</div>
                <div className="text-lg font-bold text-slate-800">{d.market_volume.total_volume}</div>
             </div>
             <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase mb-1"><ArrowUpRight className="w-4 h-4"/> 量能变化</div>
                <div className="text-lg font-bold text-slate-800 truncate">{d.market_volume.volume_delta}</div>
             </div>
             <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase mb-1"><Banknote className="w-4 h-4" /> 资金信号</div>
                <div className="text-lg font-bold text-slate-800 truncate">{d.market_volume.net_inflow}</div>
             </div>
             <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-violet-600 font-bold text-xs uppercase mb-1"><Zap className="w-4 h-4" /> 市场活水</div>
                <div className="text-lg font-bold text-slate-800 truncate">{d.market_volume.capital_mood}</div>
             </div>
          </div>
        )}

        {!historyMode && d && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xl">
                <h3 className="text-slate-400 text-xs font-semibold uppercase mb-2">市场情绪评分</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className={`text-6xl font-bold tracking-tighter ${sentimentScore >= 60 ? 'text-amber-400' : 'text-slate-200'}`}>{sentimentScore}</span>
                  <span className="text-slate-500 font-mono">/ 100</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-amber-500 pl-3">{sentimentSummary}</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="text-slate-800 font-bold flex items-center gap-2 mb-4"><Wind className="w-5 h-5 text-indigo-500" /> 风口题材</h3>
                <div className="flex flex-wrap gap-2">{hotTopics?.map((topic, idx) => (
                  <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full border border-indigo-100">{topic}</span>
                )) || "暂无题材"}</div>
              </div>
            </div>

            {capitalRotation && (
              <div className="lg:col-span-1 bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="text-slate-800 font-bold flex items-center gap-2 mb-6"><TrendingUp className="w-5 h-5 text-emerald-600" /> 主力资金轮动</h3>
                <div className="space-y-6">
                  <div>
                    <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded mb-2 inline-block">主力买入</span>
                    <div className="flex flex-wrap gap-2 mb-2">{capitalRotation.inflow_sectors?.map((s, i) => (<span key={i} className="text-sm font-bold text-slate-800 border-b-2 border-emerald-400">{s}</span>)) || "无数据"}</div>
                    <div className="text-xs text-slate-500">{capitalRotation.inflow_reason}</div>
                  </div>
                  <div className="border-t border-slate-100"></div>
                  <div>
                    <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded mb-2 inline-block">主力流出</span>
                    <div className="flex flex-wrap gap-2 mb-2">{capitalRotation.outflow_sectors?.map((s, i) => (<span key={i} className="text-sm font-bold text-slate-800 border-b-2 border-rose-400">{s}</span>)) || "无数据"}</div>
                    <div className="text-xs text-slate-500">{capitalRotation.outflow_reason}</div>
                  </div>
                </div>
              </div>
            )}

            {deepLogic && (
              <div className="lg:col-span-1 bg-slate-50 rounded-xl p-6 border border-slate-200">
                 <h3 className="text-slate-800 font-bold flex items-center gap-2 mb-4"><Layers className="w-5 h-5 text-blue-600" /> 核心策略推演</h3>
                 <div className="space-y-4">
                   <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                      <h4 className="text-xs font-bold text-blue-600 mb-1">政策驱动</h4>
                      <p className="text-sm text-slate-700">{deepLogic.policy_driver}</p>
                   </div>
                   <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                      <h4 className="text-xs font-bold text-indigo-600 mb-1">外部环境</h4>
                      <p className="text-sm text-slate-700">{deepLogic.external_environment}</p>
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
