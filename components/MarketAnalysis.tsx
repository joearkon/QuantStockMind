
import React, { useState, useEffect } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, CapitalTypeData } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { Loader2, BarChart2, Zap, Search, Cpu, Activity, Shuffle, Gauge, TrendingUp, TrendingDown, ShieldAlert, Globe, Landmark, Target, RefreshCw, Users, AlertTriangle, Info, ArrowUpRight, ArrowDownRight, Minus, Radar, MessageSquareText } from 'lucide-react';
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
  const [loadingPhase, setLoadingPhase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Dynamic loading phase for better UX
  useEffect(() => {
    let interval: any;
    if (loading) {
      const phases = [
        "正在建立加密链路...",
        "正在检索全网盘面公告...",
        "AI 正在提取指数数据...",
        "正在计算多空情绪水位...",
        "正在审计资金轮动路径...",
        "正在构建看板模型数据..."
      ];
      let i = 0;
      setLoadingPhase(phases[0]);
      interval = setInterval(() => {
        i = (i + 1) % phases.length;
        setLoadingPhase(phases[i]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleAnalysis = async () => {
    setLoading(true);
    setError(null);
    setElapsedSeconds(0);
    const timer = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);

    try {
      const data = await analyzeWithLLM(currentModel, "", true, settings, true, savedPeriod, undefined, currentMarket);
      onResultUpdate(data);
    } catch (err: any) {
      setError(err.message || "看板同步失败。建议检查 API Key 或网络环境。");
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const d = savedResult?.structuredData;
  const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;

  const renderGauge = (score: number, warning?: string) => {
    const radius = 70;
    const circumference = Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    
    let color = '#f59e0b';
    if (score > 80 || warning === 'Extreme') color = '#ef4444';
    else if (score > 65 || warning === 'Overheated') color = '#f97316';
    else if (score < 40) color = '#10b981';

    return (
      <div className="relative flex flex-col items-center">
        <svg width="180" height="110" className="transform translate-y-2">
          <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="#f1f5f9" strokeWidth="12" strokeLinecap="round" />
          <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000" />
        </svg>
        <div className="absolute top-10 flex flex-col items-center">
          <span className="text-4xl font-black text-slate-800">{score}</span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">情绪水位</span>
        </div>
      </div>
    );
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return <ArrowUpRight className="w-3 h-3 text-rose-500" />;
    if (trend === 'decreasing') return <ArrowDownRight className="w-3 h-3 text-emerald-500" />;
    return <Minus className="w-3 h-3 text-slate-400" />;
  };

  const getTrendColor = (direction: 'up' | 'down') => {
    if (currentMarket === MarketType.US) return direction === 'up' ? 'text-emerald-500' : 'text-rose-500';
    return direction === 'up' ? 'text-rose-500' : 'text-emerald-500';
  };

  const getBgColor = (direction: 'up' | 'down') => {
    if (currentMarket === MarketType.US) return direction === 'up' ? 'border-emerald-100 bg-emerald-50/10' : 'border-rose-100 bg-rose-50/10';
    return direction === 'up' ? 'border-rose-100 bg-rose-50/10' : 'border-emerald-100 bg-emerald-50/10';
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      
      {/* 1. 控制中心 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BarChart2 className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
               <h2 className="text-base font-black text-slate-800">{marketLabel} 盘面深度透析</h2>
               {d?.market_status && (
                 <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold ${
                   d.market_status.includes('收盘') ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse'
                 }`}>
                   <RefreshCw className="w-3 h-3"/> {d.market_status}
                 </span>
               )}
            </div>
            {d?.data_date && !loading && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">基准时间: {d.data_date}</span>}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button onClick={() => onPeriodUpdate('day')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${savedPeriod === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>日度快照</button>
            <button onClick={() => onPeriodUpdate('month')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${savedPeriod === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>月度趋势</button>
          </div>
          <button 
            onClick={handleAnalysis} 
            disabled={loading} 
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${loading ? 'animate-bounce text-amber-400' : ''}`} />
            {loading ? '数据同步中' : '刷新数据'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 flex items-center gap-3 font-bold animate-shake">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. 收盘点评 (新板块 - 对应同花顺UI) */}
      {d?.closing_commentary && (
        <div className="bg-white border-l-4 border-indigo-600 rounded-xl p-5 shadow-sm animate-fade-in">
           <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-indigo-600 font-black text-sm uppercase tracking-widest">
                 <MessageSquareText className="w-4 h-4" /> 收盘点评
              </div>
              <span className="text-[10px] text-slate-400 font-bold">{d.data_date}</span>
           </div>
           <p className="text-slate-800 font-bold text-lg leading-relaxed">{d.closing_commentary}</p>
        </div>
      )}

      {/* 3. 指数卡片栏 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {d?.market_indices && d.market_indices.length > 0 ? (
          d.market_indices.map((idx, i) => (
            <div key={i} className={`bg-white rounded-2xl p-4 border border-slate-200 shadow-sm transition-all hover:scale-[1.02] ${getBgColor(idx.direction)}`}>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">{idx.name}</div>
              <div className="text-xl font-black tracking-tighter text-slate-800">{idx.value}</div>
              <div className={`text-[10px] font-bold mt-1 ${getTrendColor(idx.direction)}`}>
                {idx.direction === 'up' ? '▲' : '▼'} {idx.percent}
              </div>
            </div>
          ))
        ) : (
          [1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-slate-50 border border-slate-100 border-dashed rounded-2xl flex items-center justify-center"><span className="text-[10px] text-slate-300">等待 AI 注入行情...</span></div>)
        )}
      </div>

      {d ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-slide-up">
          
          {/* 左侧：资金成分 & 情绪水位 */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> 核心资金组成比例
              </div>
              <div className="space-y-5">
                {d.capital_composition?.map((cap, idx) => (
                  <div key={idx} className="group">
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-700">{cap.label}</span>
                        {getTrendIcon(cap.trend)}
                      </div>
                      <span className="text-sm font-black text-indigo-600">{cap.percentage}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                       <div 
                        className={`h-full transition-all duration-1000 ${
                          cap.type === 'Retail' ? 'bg-amber-500' : 
                          cap.type === 'Foreign' ? 'bg-rose-500' : 
                          cap.type === 'Institutional' ? 'bg-indigo-600' : 'bg-slate-700'
                        }`} 
                        style={{width: `${cap.percentage}%`}}
                       />
                    </div>
                    <p className="mt-2 text-[10px] text-slate-500 font-medium leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity">
                      {cap.description}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                   {renderGauge(d.market_sentiment?.score || 0, d.market_sentiment?.warning_level)}
                   <div className="max-w-[180px]">
                      <p className="text-xs font-bold text-slate-500 italic leading-relaxed">"{d.market_sentiment?.summary}"</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-xl">
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4" /> 流动性监控
              </div>
              <div className="space-y-6">
                <div>
                  <div className="text-3xl font-black tracking-tighter mb-1">{d.market_volume?.total_volume || '--'}</div>
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block ${d.market_volume?.volume_trend === 'expansion' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                    {d.market_volume?.volume_delta}
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-tighter">主力筹码研判</div>
                  <div className="text-sm font-bold text-indigo-300">{d.market_volume?.capital_mood}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：宏观逻辑与板块轮动 */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-2">
                <Landmark className="w-6 h-6 text-indigo-600" />
                宏观/政策逻辑
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-50 p-2 rounded-lg"><Globe className="w-4 h-4 text-blue-600" /></div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">外部影响</h4>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">{d.macro_logic?.external_impact}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-indigo-50 p-2 rounded-lg"><Target className="w-4 h-4 text-indigo-600" /></div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">政策重点</h4>
                      <p className="text-sm text-slate-700 font-medium">{d.macro_logic?.policy_focus}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col justify-center">
                  <h4 className="text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">AI 研判结论</h4>
                  <p className="text-lg font-black text-slate-800 leading-snug italic">"{d.macro_logic?.core_verdict}"</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm overflow-hidden">
               <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-2">
                  <Shuffle className="w-6 h-6 text-emerald-600" />
                  板块轮动路径
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-rose-500" /> 净介入 (Inflow)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.capital_rotation?.inflow_sectors?.map((s, i) => (
                        <span key={i} className="px-3 py-1.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-lg">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-emerald-500" /> 净撤离 (Outflow)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.capital_rotation?.outflow_sectors?.map((s, i) => (
                        <span key={i} className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 pt-6 border-t border-slate-100">
                    <p className="text-sm text-slate-500 leading-relaxed font-medium italic bg-slate-50 p-4 rounded-xl">
                      <b>博弈逻辑：</b> {d.capital_rotation?.rotation_logic}
                    </p>
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
              <p className="text-slate-400 font-black text-xl tracking-tight">等待同步盘面实时数据</p>
              <p className="text-slate-300 text-sm mt-3 font-medium">请点击刷新数据启动 AI 联网检索</p>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative mb-8">
                 <Radar className="w-20 h-20 text-indigo-600 animate-spin-slow" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-indigo-600 rounded-full animate-ping"></div>
                 </div>
              </div>
              <p className="text-slate-500 font-black text-lg tracking-tight">AI 正在深度拆解全市场数据 ({elapsedSeconds}s)...</p>
              <p className="text-indigo-600 text-xs font-bold mt-2 animate-pulse uppercase tracking-widest">{loadingPhase}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
