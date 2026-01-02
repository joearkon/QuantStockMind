
import React, { useState, useEffect, useRef } from 'react';
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { fetchStockSynergy } from '../services/geminiService';
import { UsersRound, Loader2, Search, Zap, ShieldAlert, Target, Activity, Flame, ArrowRight, ShieldCheck, TrendingUp, Info, UserCheck, Scale, AlertTriangle, Fingerprint, Camera, X, ImageIcon, Eye, CalendarClock, Sparkles, TrendingDown, Crown, ShieldCheck as SafetyIcon } from 'lucide-react';

export const StockSynergyAnalysis: React.FC<{
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: any;
  onOpenSettings: () => void;
}> = ({ currentModel, currentMarket, settings, onOpenSettings }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
        const fullData = reader.result as string;
        setImagePreview(fullData);
        setSelectedImage(fullData.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!query) return;
    if (!settings.geminiKey) {
      onOpenSettings();
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchStockSynergy(query, selectedImage, settings.geminiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "合力审计失败，请检查网络或图片格式");
    } finally {
      setLoading(false);
    }
  };

  const d = result?.stockSynergyData;

  const getDirectionIcon = (dir: string) => {
    switch (dir) {
      case '看涨': return <TrendingUp className="w-8 h-8 text-rose-500" />;
      case '看跌': return <TrendingDown className="w-8 h-8 text-emerald-500" />;
      case '冲高回落': return <Zap className="w-8 h-8 text-amber-500" />;
      default: return <Activity className="w-8 h-8 text-blue-500" />;
    }
  };

  const formatConfidence = (val: number) => {
    if (val === undefined || val === null) return "--";
    // 处理 AI 可能返回的 0.85 或 85
    let num = Number(val);
    if (num <= 1 && num > 0) num = num * 100;
    return Math.round(num);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 md:p-12 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl">
              <UsersRound className="w-8 h-8" />
            </div>
            标的合力与龙头基因审计
          </h2>
          <p className="text-slate-500 text-base max-w-2xl font-medium mb-10">
            审计标的是否具备 **“大妖股”基因**（如中国卫星 20->90 逻辑）。AI 将通过视觉形态与全网 Alpha 信号对齐主力真实意图。
          </p>

          <div className="max-w-2xl flex flex-col gap-4">
            <div className="flex gap-3 p-2 bg-slate-100 rounded-[2rem] border border-slate-200">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="输入代码或名称 (如 中国卫星)..."
                  className="w-full h-14 pl-12 pr-12 bg-white rounded-[1.5rem] border border-slate-200 focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-lg transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
                
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${selectedImage ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600'}`}
                  title="上传 K 线截图进行形态辅助审计"
                >
                  <Camera className="w-6 h-6" />
                </button>
              </div>
              <button 
                onClick={handleAnalyze}
                disabled={loading || !query}
                className="px-10 h-14 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                执行审计
              </button>
            </div>

            {imagePreview && (
              <div className="flex items-center gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl animate-fade-in max-w-xl">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-indigo-200 shrink-0 shadow-sm">
                  <img src={imagePreview} className="w-full h-full object-cover" />
                  <button onClick={() => {setSelectedImage(null); setImagePreview(null);}} className="absolute top-0 right-0 p-1 bg-indigo-600 text-white rounded-bl-lg">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-indigo-700 font-black mb-1">
                    <Eye className="w-4 h-4" /> 多模态视觉审计已就绪
                  </div>
                  <p className="text-xs text-indigo-600 font-medium italic">AI 将在研判过程中强制对齐截图中的实时量价形态。</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 flex items-center gap-4 animate-fade-in shadow-sm">
          <ShieldAlert className="w-6 h-6" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200 animate-pulse">
           <Fingerprint className="w-16 h-16 text-indigo-200 mb-6 animate-bounce" />
           <p className="text-slate-500 font-black text-xl tracking-tight">
             正在执行合力审计与历史波段回溯... ({elapsed}s)
           </p>
           {selectedImage && <p className="text-indigo-400 text-sm mt-2 font-bold flex items-center gap-2 animate-pulse"><ImageIcon className="w-4 h-4"/> 正在分析视觉 K 线与主力成本分层</p>}
        </div>
      )}

      {d && (
        <div className="space-y-8 animate-slide-up">
          {/* Dragon Status Banner */}
          <div className="bg-indigo-950 rounded-[3rem] p-8 text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 overflow-hidden relative">
             <div className="absolute right-0 top-0 p-4 opacity-5 pointer-events-none">
                <Crown className="w-64 h-64 text-indigo-100" />
             </div>
             <div className="relative z-10 flex items-center gap-6">
                <div className="bg-gradient-to-br from-amber-400 to-rose-600 p-6 rounded-[2rem] shadow-xl">
                   <Crown className="w-10 h-10 text-white" />
                </div>
                <div>
                   <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 text-[10px] font-black uppercase tracking-widest">
                         战位分析 (Position)
                      </span>
                      <span className="text-sm font-bold opacity-60">| {d.code}</span>
                   </div>
                   <h3 className="text-3xl font-black">{d.name} · {d.market_position}</h3>
                </div>
             </div>
             <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 flex items-center gap-8">
                <div className="text-center">
                   <div className="text-3xl font-black text-amber-400">{d.dragon_potential_score}%</div>
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">龙头基因分</div>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="text-center">
                   <div className={`text-3xl font-black ${d.chase_safety_index > 60 ? 'text-emerald-400' : 'text-rose-400'}`}>{d.chase_safety_index}%</div>
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">追涨安全系数</div>
                </div>
             </div>
          </div>

          {/* T+1 Forecast Section */}
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-[2.5rem] border border-indigo-100 p-8 shadow-sm">
             <div className="flex justify-between items-start mb-8">
                <h3 className="font-black text-indigo-900 text-2xl flex items-center gap-3">
                   <CalendarClock className="w-7 h-7 text-indigo-600" />
                   T+1 预判形态走势 (Next Day Forecast)
                </h3>
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-2xl shadow-lg">
                   <Sparkles className="w-4 h-4" />
                   <span className="text-xs font-black uppercase tracking-widest">胜率: {formatConfidence(d.t_plus_1_prediction.confidence)}%</span>
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-3xl border border-indigo-50 shadow-sm flex flex-col items-center text-center">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">预期走向 (Bias)</div>
                   {getDirectionIcon(d.t_plus_1_prediction.expected_direction)}
                   <div className={`text-2xl font-black mt-2 ${
                      d.t_plus_1_prediction.expected_direction === '看涨' ? 'text-rose-600' : 
                      d.t_plus_1_prediction.expected_direction === '看跌' ? 'text-emerald-600' : 'text-indigo-600'
                   }`}>{d.t_plus_1_prediction.expected_direction}</div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-indigo-50 shadow-sm">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">次日博弈策略 (Strategy)</div>
                   <p className="text-sm text-slate-700 font-bold leading-relaxed italic">"{d.t_plus_1_prediction.opening_strategy}"</p>
                   <div className="mt-4 pt-4 border-t border-slate-50 text-[10px] font-black text-indigo-500 uppercase">
                      波动空间：{d.t_plus_1_prediction.price_range}
                   </div>
                </div>

                <div className="bg-indigo-900 p-6 rounded-3xl shadow-xl flex flex-col justify-center">
                   <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-3">走势演化逻辑</div>
                   <p className="text-xs text-indigo-50 font-medium leading-relaxed italic">
                      {d.t_plus_1_prediction.logic}
                   </p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             {/* Left Column */}
             <div className="lg:col-span-8 space-y-8">
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                   <div className="bg-slate-50 px-10 py-5 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-black text-slate-800 text-xl flex items-center gap-3">
                         <Scale className="w-6 h-6 text-indigo-500" />
                         合力审计因子 (Synergy Factors)
                      </h3>
                   </div>
                   <div className="p-10 space-y-8">
                      {d.synergy_factors.map((factor, idx) => (
                         <div key={idx} className="space-y-3">
                            <div className="flex justify-between items-center">
                               <span className="font-black text-slate-700 flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                  {factor.label}
                               </span>
                               <span className="text-xs font-black text-indigo-600">{factor.score}/100</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                               <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{width: `${factor.score}%`}}></div>
                            </div>
                            <p className="text-xs text-slate-500 font-bold leading-relaxed">{factor.description}</p>
                         </div>
                      ))}
                   </div>
                </div>

                <div className="bg-indigo-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                   <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                      最终博弈审计结论
                   </h4>
                   <p className="text-2xl font-black italic leading-relaxed text-indigo-50 mb-8">
                      "{d.battle_verdict}"
                   </p>
                   <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                      <p className="font-black text-lg text-white leading-relaxed">{d.action_guide}</p>
                   </div>
                </div>
             </div>

             {/* Right Column */}
             <div className="lg:col-span-4 space-y-8">
                {/* Main Force Portrait */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                      主力资金画像
                   </h4>
                   <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                         <div className="text-[10px] font-black text-slate-400 mb-1">主导资金性质</div>
                         <div className="text-lg font-black text-slate-800">{d.main_force_portrait.lead_type}</div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 group relative">
                         <div className="text-[10px] font-black text-slate-400 mb-1 flex items-center gap-1">
                            预估主力持仓成本
                            <Info className="w-3 h-3 cursor-help" />
                            <div className="absolute z-20 bottom-full left-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[9px] rounded-lg shadow-xl font-bold hidden group-hover:block">
                               这是通过 L2 资金与龙虎榜测算的主力资金平均建仓位，非建议买入价。
                            </div>
                         </div>
                         <div className="text-lg font-black text-rose-600">{d.main_force_portrait.entry_cost_est}</div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                         <div className="text-[10px] font-black text-slate-400 mb-1">目前持筹状态</div>
                         <div className="text-lg font-black text-slate-800">{d.main_force_portrait.hold_status}</div>
                      </div>
                   </div>
                </div>

                {/* Chase Safety Card */}
                <div className={`rounded-[2.5rem] p-8 border shadow-xl flex flex-col items-center justify-center text-center ${
                  d.chase_safety_index > 60 ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-rose-50 border-rose-100 text-rose-900'
                }`}>
                   <div className="p-4 bg-white rounded-full shadow-lg mb-4">
                      {d.chase_safety_index > 60 ? <SafetyIcon className="w-10 h-10 text-emerald-600" /> : <AlertTriangle className="w-10 h-10 text-rose-600" />}
                   </div>
                   <div className="text-sm font-black uppercase tracking-[0.2em] mb-2">追涨安全性审计</div>
                   <div className="text-4xl font-black mb-2">{d.chase_safety_index}%</div>
                   <p className="text-xs font-bold opacity-70">
                      {d.chase_safety_index > 60 ? '当前处于主升加速段，具备博弈价值。' : '当前处于情绪高位分歧点，谨慎追涨。'}
                   </p>
                </div>

                {/* Risk Warning */}
                <div className="bg-amber-50 rounded-[2.5rem] border border-amber-100 p-8 shadow-sm">
                   <div className="flex items-center gap-3 mb-6 text-amber-700">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-black text-sm uppercase tracking-widest">审计警示</span>
                   </div>
                   <p className="text-sm text-amber-900 font-bold leading-relaxed">
                      AI 正在深度回溯其历史成长逻辑（参考中国卫星案例）。若当前价位较主力成本溢价超 50% 且缩量封板，请警惕缩量见顶风险。
                   </p>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
