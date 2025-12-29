
import React, { useState, useRef, useEffect } from 'react';
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { fetchKLineSynergyAnalysis } from '../services/geminiService';
import { Wand2, Camera, Loader2, Search, ArrowRight, Activity, Zap, Target, Info, Flame, History, X, LineChart, TrendingUp, Compass, MessageSquareCode, CalendarDays, ArrowUpRight, ArrowDownRight, Crosshair, Quote } from 'lucide-react';

export const KLineMaster: React.FC<{
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: any;
  onOpenSettings: () => void;
}> = ({ currentModel, currentMarket, settings, onOpenSettings }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => setElapsed(p => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

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

  const handleAnalyze = async () => {
    if (!query && !selectedImage) return;
    if (!settings.geminiKey) {
      onOpenSettings();
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchKLineSynergyAnalysis(query, selectedImage, currentMarket, settings.geminiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "合力研判失败");
    } finally {
      setLoading(false);
    }
  };

  const kdata = result?.klineSynergyData;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Search Header */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-12 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl text-white shadow-xl">
              <Wand2 className="w-8 h-8" />
            </div>
            K线合力大师 (3-5日战法)
          </h2>
          <p className="text-slate-500 text-base max-w-2xl font-medium mb-10">
            拒绝繁琐文字，直接看股价运行区间。AI 通过读取 K 线影线细节和主力资金大盘，为您推演明后两日的“博弈地图”。
          </p>

          <div className="max-w-3xl space-y-4">
            <div className="relative group">
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="输入股票代码或名称 (如: 宁德时代)..."
                className="w-full h-16 pl-14 pr-16 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-lg transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
              
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${selectedImage ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:text-indigo-600'}`}
              >
                <Camera className="w-6 h-6" />
              </button>
            </div>

            {selectedImage && (
              <div className="flex items-center gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl animate-slide-down">
                <div className="relative w-24 h-16 rounded-lg overflow-hidden border-2 border-indigo-200 shrink-0 shadow-md">
                  <img src={`data:image/jpeg;base64,${selectedImage}`} className="w-full h-full object-cover" />
                  <button onClick={() => setSelectedImage(null)} className="absolute top-0 right-0 p-1 bg-rose-600 text-white rounded-bl-lg hover:bg-rose-700">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div>
                   <div className="flex items-center gap-2 text-indigo-700 font-black text-sm mb-1">
                      <Zap className="w-4 h-4 text-amber-500" /> 视觉引擎已介入
                   </div>
                   <p className="text-xs text-indigo-600/70 font-medium">AI 已读取图中所有 K 线价格节点，正在同步全网主力底池...</p>
                </div>
              </div>
            )}

            <button 
              onClick={handleAnalyze}
              disabled={loading || (!query && !selectedImage)}
              className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <TrendingUp className="w-6 h-6" />}
              {loading ? `全网合力计算中 (${elapsed}s)...` : '开始明后日股价预判'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 flex items-center gap-4 shadow-sm animate-fade-in">
          <Info className="w-6 h-6 shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {kdata && (
        <div className="space-y-8 animate-slide-up">
          
          {/* 核心股价路线图 - 重点升级模块 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* 明日预测卡片 */}
             <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl relative group hover:border-indigo-500 transition-all overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <CalendarDays className="w-40 h-40 text-indigo-900" />
                </div>
                <div className="relative z-10">
                   <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg">
                            <Target className="w-5 h-5" />
                         </div>
                         <h3 className="text-xl font-black text-slate-800">明日股价路线 (T+1)</h3>
                      </div>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
                         {kdata.prediction.probability} 胜率
                      </span>
                   </div>
                   
                   <div className="text-center py-6 bg-slate-50 rounded-3xl border border-slate-100 mb-6">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">预期运行区间</div>
                      <div className="text-4xl font-black text-slate-900 tracking-tighter">{kdata.prediction.price_roadmap.tomorrow.range}</div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col items-center">
                         <div className="flex items-center gap-1 text-[10px] font-black text-rose-600 mb-1">
                            <ArrowUpRight className="w-3 h-3" /> 乐观冲击
                         </div>
                         <div className="text-xl font-black text-rose-700">{kdata.prediction.price_roadmap.tomorrow.high_target}</div>
                      </div>
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center">
                         <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 mb-1">
                            <ArrowDownRight className="w-3 h-3" /> 悲观支撑
                         </div>
                         <div className="text-xl font-black text-emerald-700">{kdata.prediction.price_roadmap.tomorrow.low_support}</div>
                      </div>
                   </div>

                   <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl flex items-center gap-4">
                      <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                      <div className="text-sm font-bold">{kdata.prediction.price_roadmap.tomorrow.action_hint}</div>
                   </div>
                </div>
             </div>

             {/* 后日预测卡片 */}
             <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl relative group hover:border-violet-500 transition-all overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <LineChart className="w-40 h-40 text-violet-900" />
                </div>
                <div className="relative z-10">
                   <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-violet-600 rounded-xl text-white shadow-lg">
                            <Crosshair className="w-5 h-5" />
                         </div>
                         <h3 className="text-xl font-black text-slate-800">后日股价预期 (T+2)</h3>
                      </div>
                      <span className="text-xs font-black text-violet-600 bg-violet-50 px-3 py-1 rounded-full border border-violet-100 uppercase tracking-widest">
                         趋势延伸
                      </span>
                   </div>
                   
                   <div className="text-center py-6 bg-slate-50 rounded-3xl border border-slate-100 mb-6">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">预期运行区间</div>
                      <div className="text-4xl font-black text-slate-900 tracking-tighter">{kdata.prediction.price_roadmap.day_after.range}</div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl flex flex-col items-center">
                         <div className="text-[10px] font-black text-slate-400 mb-1 uppercase">建议止盈位</div>
                         <div className="text-xl font-black text-slate-800">{kdata.prediction.price_roadmap.day_after.high_target}</div>
                      </div>
                      <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl flex flex-col items-center">
                         <div className="text-[10px] font-black text-slate-400 mb-1 uppercase">建议止损位</div>
                         <div className="text-xl font-black text-slate-800">{kdata.prediction.price_roadmap.day_after.low_support}</div>
                      </div>
                   </div>

                   <div className="bg-violet-900 text-white p-5 rounded-2xl shadow-xl flex items-center gap-4">
                      <MessageSquareCode className="w-5 h-5 text-violet-300 shrink-0" />
                      <div className="text-sm font-bold">{kdata.prediction.price_roadmap.day_after.action_hint}</div>
                   </div>
                </div>
             </div>
          </div>

          {/* 合力指数与摘要 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             {/* 综合得分 */}
             <div className="lg:col-span-4 bg-slate-900 text-white rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center shadow-2xl border-t-8 border-indigo-500 relative group overflow-hidden">
                <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                   <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">合力强度 (Synergy)</div>
                   <div className="text-8xl font-black tracking-tighter mb-4 drop-shadow-lg">{kdata.synergy_score}</div>
                   <div className="px-6 py-2 bg-indigo-600 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">
                      {kdata.pattern_name}
                   </div>
                </div>
             </div>

             {/* 战况总结 */}
             <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex flex-col justify-center relative">
                <Quote className="absolute top-6 left-6 w-12 h-12 text-slate-100 -scale-x-100" />
                <div className="relative z-10 pl-8">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">多空博弈·战区快报</h4>
                   <p className="text-2xl font-black text-slate-800 italic leading-relaxed">
                      "{kdata.battle_summary}"
                   </p>
                   <div className="mt-8 flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                         <span className="text-[10px] font-black text-slate-400 uppercase">量能共振</span>
                         <span className="text-sm font-black text-indigo-600">{kdata.synergy_factors.volume_resonance}%</span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                         <span className="text-[10px] font-black text-slate-400 uppercase">价格强度</span>
                         <span className="text-sm font-black text-rose-600">{kdata.synergy_factors.price_strength}%</span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                         <span className="text-[10px] font-black text-slate-400 uppercase">资金倾向</span>
                         <span className="text-sm font-black text-amber-600">{kdata.synergy_factors.capital_alignment}%</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Timeline - 辅助信息置于底部 */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
             <h4 className="text-sm font-black text-slate-800 mb-8 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" /> 3-5日合力演化路径
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {kdata.logic_timeline.map((step, idx) => (
                   <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black mb-3">T-{kdata.logic_timeline.length - idx - 1}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{step.day}</div>
                      <div className="text-sm font-black text-slate-800 mb-2">{step.action}</div>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic line-clamp-2">"{step.psychology}"</p>
                   </div>
                ))}
             </div>
          </div>

          <div className="text-center py-12">
             <div className="inline-flex items-center gap-3 px-8 py-3 bg-slate-100 rounded-full text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                <Activity className="w-4 h-4 text-indigo-500" /> 预测模型：基于 3-5 日博弈论与实时资金流对齐
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
