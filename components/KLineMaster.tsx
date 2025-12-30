
import React, { useState, useRef, useEffect } from 'react';
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { fetchKLineSynergyAnalysis } from '../services/geminiService';
import { Wand2, Camera, Loader2, Search, ArrowRight, Activity, Zap, Target, Info, Flame, History, X, LineChart, TrendingUp, Compass, MessageSquareCode } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';

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
            解构短线K线组合形态，融合大数据搜索主力资金行为。建议提供行情截图，AI 将直接读取 K 线实体与影线细节，捕捉极致合力点。
          </p>

          <div className="max-w-3xl space-y-4">
            <div className="relative group">
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="输入股票代码或名称 (如: 东方财富)..."
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
                      <Zap className="w-4 h-4 text-amber-500" /> 视觉语义已挂载
                   </div>
                   <p className="text-xs text-indigo-600/70 font-medium">AI 将通过视觉算法分析图中 3-5 日的 OHLVC 实体、均线交叉与量能柱对比。</p>
                </div>
              </div>
            )}

            <button 
              onClick={handleAnalyze}
              disabled={loading || (!query && !selectedImage)}
              className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <TrendingUp className="w-6 h-6" />}
              {loading ? `全网合力计算中 (${elapsed}s)...` : '开始 3-5 日合力研判'}
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
          
          {/* Top Verdict Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Score Card */}
             <div className="bg-slate-900 text-white rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center shadow-2xl border-t-8 border-indigo-500 relative overflow-hidden group">
                <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                   <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">合力强度 (Synergy)</div>
                   <div className="text-8xl font-black tracking-tighter mb-4 drop-shadow-lg">{kdata.synergy_score}</div>
                   <div className="px-6 py-2 bg-indigo-600 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">
                      {kdata.pattern_name}
                   </div>
                </div>
             </div>

             {/* Prediction Box */}
             <div className={`lg:col-span-2 rounded-[2.5rem] p-10 shadow-xl border relative flex flex-col justify-center ${
                kdata.prediction.trend === 'Bullish' ? 'bg-rose-50 border-rose-100 text-rose-900' : 
                kdata.prediction.trend === 'Bearish' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 
                'bg-slate-50 border-slate-200 text-slate-800'
             }`}>
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${kdata.prediction.trend === 'Bullish' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white'}`}>
                         <Compass className="w-6 h-6" />
                      </div>
                      <h3 className="text-2xl font-black">后续趋势推演</h3>
                   </div>
                   <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-60">预判胜率</div>
                      <div className="text-3xl font-black">{kdata.prediction.probability}</div>
                   </div>
                </div>
                <p className="text-xl font-black italic leading-relaxed mb-8">
                   "{kdata.battle_summary}"
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-white/50 backdrop-blur-sm p-5 rounded-2xl border border-white/20">
                      <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">目标窗口</div>
                      <div className="text-lg font-black">{kdata.prediction.target_window}</div>
                   </div>
                   <div className="bg-white/50 backdrop-blur-sm p-5 rounded-2xl border border-white/20">
                      <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">核心观察点</div>
                      <div className="text-sm font-bold">{kdata.prediction.key_observation}</div>
                   </div>
                </div>
             </div>
          </div>

          {/* Logic Timeline & Factors */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             {/* Timeline */}
             <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                <h4 className="text-sm font-black text-slate-800 mb-8 flex items-center gap-2">
                   <History className="w-5 h-5 text-indigo-500" /> 博弈复盘时序图 (3-5日细节)
                </h4>
                <div className="space-y-6">
                   {kdata.logic_timeline.map((step, idx) => (
                      <div key={idx} className="flex gap-6 group">
                         <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs group-hover:bg-indigo-600 transition-colors shadow-lg">
                               T-{kdata.logic_timeline.length - idx - 1}
                            </div>
                            {idx < kdata.logic_timeline.length - 1 && <div className="w-1 h-full bg-slate-100 group-hover:bg-indigo-100"></div>}
                         </div>
                         <div className="pb-8 flex-1">
                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{step.day}</div>
                            <div className="text-lg font-black text-slate-800 mb-2">{step.action}</div>
                            <p className="text-sm text-slate-500 font-medium bg-slate-50 p-4 rounded-2xl italic border border-slate-100">
                               “{step.psychology}”
                            </p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             {/* Synergy Factors Radar-ish */}
             <div className="lg:col-span-4 space-y-8">
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                   <h4 className="text-sm font-black text-slate-800 mb-8 flex items-center gap-2">
                      <Flame className="w-5 h-5 text-rose-500" /> 合力因子审计 (Synergy Check)
                   </h4>
                   <div className="space-y-10">
                      <div>
                         <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-black text-slate-400 uppercase">量能共振 (Volume)</span>
                            <span className="text-lg font-black text-slate-800">{kdata.synergy_factors.volume_resonance}%</span>
                         </div>
                         <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{width: `${kdata.synergy_factors.volume_resonance}%`}}></div>
                         </div>
                      </div>
                      <div>
                         <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-black text-slate-400 uppercase">价格强度 (Price)</span>
                            <span className="text-lg font-black text-slate-800">{kdata.synergy_factors.price_strength}%</span>
                         </div>
                         <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div className="h-full bg-rose-500 rounded-full transition-all duration-1000" style={{width: `${kdata.synergy_factors.price_strength}%`}}></div>
                         </div>
                      </div>
                      <div>
                         <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-black text-slate-400 uppercase">资金倾向 (Capital)</span>
                            <span className="text-lg font-black text-slate-800">{kdata.synergy_factors.capital_alignment}%</span>
                         </div>
                         <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{width: `${kdata.synergy_factors.capital_alignment}%`}}></div>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl border-b-8 border-indigo-700">
                   <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <MessageSquareCode className="w-4 h-4" /> AI 形态实战提示
                   </h4>
                   <p className="text-sm font-bold leading-relaxed opacity-90">
                      {kdata.synergy_score > 75 ? '当前形态呈现极强的“进攻合力”，建议关注分时放量回踩机会。' : kdata.synergy_score > 40 ? '合力处于“震荡分歧”期，不建议盲目追高，等待5日均线扣底上行。' : '形态极差，呈现“合力瓦解”迹象，短期回避。'}
                   </p>
                </div>
             </div>
          </div>

          <div className="text-center py-12">
             <div className="inline-flex items-center gap-3 px-8 py-3 bg-slate-100 rounded-full text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                <Activity className="w-4 h-4 text-indigo-500" /> 分析已融合 Search Grounding 大数据引擎
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
