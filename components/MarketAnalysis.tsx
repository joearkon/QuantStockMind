
import React, { useState, useEffect, useRef } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { Loader2, BarChart2, Zap, Search, Cpu, Activity, Shuffle, Gauge, TrendingUp, TrendingDown, ShieldAlert, Globe, Landmark, Target, Camera, X, Image as ImageIcon } from 'lucide-react';
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeWithLLM(currentModel, "", true, settings, true, savedPeriod, undefined, currentMarket, undefined, selectedImage || undefined);
      onResultUpdate(data);
    } catch (err: any) {
      setError(err.message || "看板同步失败。请检查 API Key 配置。");
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage((reader.result as string).split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsedSeconds(0);
      interval = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

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
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">情绪水位</span>
        </div>
      </div>
    );
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
            <h2 className="text-base font-black text-slate-800">
              {marketLabel} 盘面实时实测
              {loading && <span className="ml-3 text-xs text-indigo-500 font-bold animate-pulse">正在获取实时数据... ({elapsedSeconds}s)</span>}
            </h2>
            {d?.data_date && !loading && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">基准日期: {d.data_date}</span>}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button onClick={() => onPeriodUpdate('day')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${savedPeriod === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>日度快照</button>
            <button onClick={() => onPeriodUpdate('month')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${savedPeriod === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>月度趋势</button>
          </div>
          
          <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageSelect} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${selectedImage ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400'}`}
          >
            <Camera className="w-4 h-4" />
            {selectedImage ? '已上传行情图' : '视觉对齐'}
          </button>

          <button 
            onClick={handleAnalysis} 
            disabled={loading} 
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${loading ? 'animate-bounce text-amber-400' : ''}`} />
            {loading ? '同步中' : '刷新数据'}
          </button>
        </div>
      </div>

      {selectedImage && !loading && (
        <div className="bg-indigo-50 p-4 border border-indigo-100 rounded-2xl flex items-center justify-between gap-4 animate-fade-in shadow-sm">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-indigo-200 shadow-inner">
                 <img src={`data:image/jpeg;base64,${selectedImage}`} className="w-full h-full object-cover" />
              </div>
              <div>
                 <p className="text-xs font-black text-indigo-900 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> 已启用视觉数据校准</p>
                 <p className="text-[10px] text-indigo-600 font-bold">点击“刷新数据”后，AI 将根据该图识别真实的指数、成交量与市场情绪。</p>
              </div>
           </div>
           <button onClick={() => setSelectedImage(null)} className="p-2 text-indigo-300 hover:text-rose-500 transition-colors">
              <X className="w-5 h-5" />
           </button>
        </div>
      )}

      {/* 2. 指数卡片栏 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {d?.market_indices && d.market_indices.length > 0 ? (
          d.market_indices.map((idx, i) => (
            <div key={i} className={`bg-white rounded-2xl p-4 border border-slate-200 shadow-sm transition-all hover:scale-[1.02] ${idx.direction === 'up' ? 'border-rose-100 bg-rose-50/10' : 'border-emerald-100 bg-emerald-50/10'}`}>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{idx.name}</div>
              <div className="text-xl font-black tracking-tighter text-slate-800">{idx.value}</div>
              <div className={`text-[10px] font-bold mt-1 ${idx.direction === 'up' ? 'text-rose-500' : 'text-emerald-500'}`}>
                {idx.direction === 'up' ? '▲' : '▼'} {idx.percent}
              </div>
            </div>
          ))
        ) : (
          [1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-slate-50 border border-slate-100 border-dashed rounded-2xl flex items-center justify-center">
               <span className="text-[10px] text-slate-300">等待同步...</span>
            </div>
          ))
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 animate-fade-in">
          <ShieldAlert className="w-5 h-5" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {d ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 左侧：流动性与情绪 */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col items-center">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Gauge className="w-4 h-4" /> 市场博弈强度
              </div>
              {renderGauge(d.market_sentiment?.score || 0)}
              <div className="mt-6 text-center">
                <p className="text-xs font-bold text-slate-500 leading-relaxed italic">"{d.market_sentiment?.summary}"</p>
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-xl">
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4" /> 实时流动性
              </div>
              <div className="space-y-6">
                <div>
                  <div className="text-3xl font-black tracking-tighter mb-1">{d.market_volume?.total_volume || '--'}</div>
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block ${d.market_volume?.volume_trend === 'expansion' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                    {d.market_volume?.volume_delta}
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase">资金评价</div>
                  <div className="text-sm font-bold text-indigo-300">{d.market_volume?.capital_mood}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：宏观逻辑与板块轮动 */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-2">
                <Landmark className="w-6 h-6 text-indigo-600" />
                宏观环境与政策定调
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-50 p-2 rounded-lg"><Globe className="w-4 h-4 text-blue-600" /></div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">外部环境</h4>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">{d.macro_logic?.external_impact}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-indigo-50 p-2 rounded-lg"><Target className="w-4 h-4 text-indigo-600" /></div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">政策重心</h4>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">{d.macro_logic?.policy_focus}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col justify-center">
                  <h4 className="text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">AI 核心研判</h4>
                  <p className="text-lg font-black text-slate-800 leading-snug italic">"{d.macro_logic?.core_verdict}"</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm overflow-hidden">
               <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-2">
                  <Shuffle className="w-6 h-6 text-emerald-600" />
                  主力资金搬家路径
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-rose-500" /> 介入板块 (Inflow)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.capital_rotation?.inflow_sectors?.map((s, i) => (
                        <span key={i} className="px-3 py-1.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-lg">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-emerald-500" /> 撤离板块 (Outflow)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.capital_rotation?.outflow_sectors?.map((s, i) => (
                        <span key={i} className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 pt-6 border-t border-slate-100">
                    <p className="text-sm text-slate-500 leading-relaxed font-medium italic bg-slate-50 p-4 rounded-xl">
                      <b>搬家逻辑：</b> {d.capital_rotation?.rotation_logic}
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
              <p className="text-slate-400 font-black text-xl tracking-tight">等待同步行情数据</p>
              <p className="text-slate-300 text-sm mt-3 font-medium">提示：如果使用混元模型，建议点击“视觉对齐”上传一张行情 App 的首页截图，AI 将从中自动提取最新点位，避免数据错误。</p>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <Cpu className="w-20 h-20 text-indigo-600 animate-spin-slow mb-6" />
              <p className="text-slate-500 font-black text-lg tracking-tight">正在实时实测全网盘面数据{selectedImage ? " (视觉校准已开启)" : ""}，请稍候...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
