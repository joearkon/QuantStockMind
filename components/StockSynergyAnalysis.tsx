
import React, { useState, useEffect, useRef } from 'react';
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { fetchStockSynergy } from '../services/geminiService';
import { UsersRound, Loader2, Search, Zap, ShieldAlert, Target, Activity, Flame, ArrowRight, ShieldCheck, TrendingUp, Info, UserCheck, Scale, AlertTriangle, Fingerprint, Camera, X, ImageIcon, Eye, CalendarClock, Sparkles, TrendingDown } from 'lucide-react';

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
      setError(err.message || "合力审计失败");
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

  // Helper to format confidence reliably
  const formatConfidence = (val: number) => {
    if (val === undefined || val === null) return "--";
    // If val is a decimal like 0.85, convert to 85. If it's already 85, keep it.
    const normalized = val <= 1 && val > 0 ? val * 100 : val;
    return normalized.toFixed(0);
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
            标的合力与分歧审计 (Synergy Audit)
          </h2>
          <p className="text-slate-500 text-base max-w-2xl font-medium mb-10">
            深度识别当前标的是 **主力共识合力** 还是 **诱多派发陷阱**。结合全网龙虎榜、L2 资金流向及 K 线形态交叉审计。
          </p>

          <div className="max-w-2xl flex flex-col gap-4">
            <div className="flex gap-3 p-2 bg-slate-100 rounded-[2rem] border border-slate-200">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="输入股票代码或名称 (如: 000001)..."
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
                开始审计
              </button>
            </div>

            {selectedImage && (
              <div className="flex items-center gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl animate-fade-in max-w-xl">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-indigo-200 shrink-0 shadow-sm">
                  <img src={`data:image/jpeg;base64,${selectedImage}`} className="w-full h-full object-cover" />
                  <button onClick={() => setSelectedImage(null)} className="absolute top-0 right-0 p-1 bg-indigo-600 text-white rounded-bl-lg">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-indigo-700 font-black mb-1">
                    <Eye className="w-4 h-4" /> 多模态视觉审计已开启
                  </div>
                  <p className="text-xs text-indigo-600 font-medium">AI 将深度扫描截图中的形态信号，并与全网龙虎榜数据进行实时对齐。</p>
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
             正在执行全网合力审计... ({elapsed}s)
           </p>
           {selectedImage && <p className="text-indigo-400 text-sm mt-2 font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4"/> 正在识别 K 线形态与主力成本分布</p>}
        </div>
      )}

      {d && (
        <div className="space-y-8 animate-slide-up">
          {/* Audit Status Banner */}
          <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl flex justify-between items-center overflow-hidden relative">
             <div className="absolute right-0 top-0 p-4 opacity-10 pointer-events-none">
                <ShieldCheck className="w-32 h-32" />
             </div>
             <div className="relative z-10">
                <div className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-1">审计状态 (Audit Status)</div>
                <div className="text-xl font-black flex items-center gap-3">
                   {d.name} <span className="text-sm font-mono opacity-50">{d.code}</span>
                   <span className="text-xs bg-indigo-500 px-2 py-1 rounded-lg">多维审计完成</span>
                </div>
             </div>
             {selectedImage && (
                <div className="px-4 py-2 bg-indigo-500/30 rounded-2xl border border-white/10 text-xs font-black flex items-center gap-2">
                   <Eye className="w-4 h-4 text-indigo-300" /> 已结合视觉形态校准
                </div>
             )}
          </div>

          {/* New T+1 Prediction Section */}
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-[2.5rem] border border-indigo-100 p-8 shadow-sm">
             <div className="flex justify-between items-start mb-8">
                <h3 className="font-black text-indigo-900 text-2xl flex items-center gap-3">
                   <CalendarClock className="w-7 h-7 text-indigo-600" />
                   T+1 预判形态走势 (Next Day Forecast)
                </h3>
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-2xl shadow-lg">
                   <Sparkles className="w-4 h-4" />
                   <span className="text-xs font-black uppercase tracking-widest">
                     胜率预估: {formatConfidence(d.t_plus_1_prediction.confidence)}%
                   </span>
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
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">次日波弈策略 (Opening Strategy)</div>
                   <p className="text-sm text-slate-700 font-bold leading-relaxed italic">"{d.t_plus_1_prediction.opening_strategy}"</p>
                   <div className="mt-4 pt-4 border-t border-slate-50 text-[10px] font-black text-indigo-500 uppercase">
                      波动空间：{d.t_plus_1_prediction.price_range}
                   </div>
                </div>

                <div className="bg-indigo-900 p-6 rounded-3xl shadow-xl flex flex-col justify-center">
                   <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-3">走势演化逻辑 (Logic)</div>
                   <p className="text-xs text-indigo-50 font-medium leading-relaxed">
                      {d.t_plus_1_prediction.logic}
                   </p>
                </div>
             </div>
          </div>

          {/* Main Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm flex flex-col items-center group hover:shadow-lg transition-shadow">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">主力一致性合力分 (Consensus)</div>
                <div className="relative w-48 h-48 flex items-center justify-center">
                   <svg className="w-full h-full transform -rotate-90">
                      <circle cx="96" cy="96" r="80" fill="none" stroke="#f1f5f9" strokeWidth="16" />
                      <circle 
                        cx="96" cy="96" r="80" 
                        fill="none" 
                        stroke={d.synergy_score > 70 ? '#6366f1' : '#94a3b8'} 
                        strokeWidth="16" 
                        strokeDasharray="502.65" 
                        strokeDashoffset={502.65 * (1 - d.synergy_score / 100)} 
                        className="transition-all duration-1000 ease-out"
                      />
                   </svg>
                   <div className="absolute flex flex-col items-center">
                      <span className="text-5xl font-black text-slate-800">{d.synergy_score}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">SYNERGY</span>
                   </div>
                </div>
                <div className="mt-8 px-6 py-2 bg-indigo-50 text-indigo-700 rounded-full font-black text-sm border border-indigo-100 uppercase tracking-widest">
                   状态：{d.capital_consistency}
                </div>
             </div>

             <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-xl flex flex-col items-center text-white group hover:shadow-2xl transition-all">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">诱多/陷阱风险指数 (Trap Index)</div>
                <div className="relative w-48 h-48 flex items-center justify-center">
                   <svg className="w-full h-full transform -rotate-90">
                      <circle cx="96" cy="96" r="80" fill="none" stroke="#1e293b" strokeWidth="16" />
                      <circle 
                        cx="96" cy="96" r="80" 
                        fill="none" 
                        stroke={d.trap_risk_score > 60 ? '#ef4444' : '#10b981'} 
                        strokeWidth="16" 
                        strokeDasharray="502.65" 
                        strokeDashoffset={502.65 * (1 - d.trap_risk_score / 100)} 
                        className="transition-all duration-1000 ease-out"
                      />
                   </svg>
                   <div className="absolute flex flex-col items-center">
                      <span className="text-5xl font-black text-white">{d.trap_risk_score}</span>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">TRAP RISK</span>
                   </div>
                </div>
                <div className={`mt-8 px-6 py-2 rounded-full font-black text-sm border uppercase tracking-widest ${
                  d.trap_risk_score > 60 ? 'bg-rose-600 border-rose-500 text-white' : 'bg-emerald-600 border-emerald-500 text-white'
                }`}>
                   风险判定：{d.trap_risk_score > 60 ? '极高陷阱可能' : '低诱多概率'}
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             {/* Left Column: Detail Factors */}
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

                {/* Verdict Box */}
                <div className="bg-indigo-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                   <div className="absolute right-0 top-0 p-6 opacity-10 pointer-events-none">
                      <ShieldCheck className="w-32 h-32" />
                   </div>
                   <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                      <Fingerprint className="w-5 h-5" /> 最终博弈审计结论 (Battle Verdict)
                   </h4>
                   <p className="text-2xl font-black italic leading-relaxed text-indigo-50 mb-8">
                      "{d.battle_verdict}"
                   </p>
                   <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                      <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <Target className="w-4 h-4" /> 操作指令提示 (Action Guide)
                      </div>
                      <p className="font-black text-lg text-white leading-relaxed">{d.action_guide}</p>
                   </div>
                </div>
             </div>

             {/* Right Column: Metrics & Portrait */}
             <div className="lg:col-span-4 space-y-8">
                {/* Main Force Portrait */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-indigo-500" /> 主力资金画像审计
                   </h4>
                   <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                         <div className="text-[10px] font-black text-slate-400 uppercase mb-1">主导资金性质</div>
                         <div className="text-lg font-black text-slate-800">{d.main_force_portrait.lead_type}</div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative group/cost">
                         <div className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                            预估主力持仓成本
                            <div className="group-hover/cost:block hidden absolute z-20 bottom-full left-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[9px] rounded-lg shadow-xl font-bold">
                               这是通过 L2 资金与龙虎榜测算的主力资金平均建仓位，非建议买入价。
                            </div>
                         </div>
                         <div className="text-lg font-black text-rose-600">{d.main_force_portrait.entry_cost_est}</div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                         <div className="text-[10px] font-black text-slate-400 uppercase mb-1">目前持筹状态</div>
                         <div className="text-lg font-black text-slate-800">{d.main_force_portrait.hold_status}</div>
                      </div>
                   </div>
                </div>

                {/* Turnover Evaluation */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-500" /> 换手充分度审计
                   </h4>
                   <div className="text-center space-y-6">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-lg font-black text-slate-800">
                         换手率：{d.turnover_eval.current_rate}
                      </div>
                      <div className={`p-6 rounded-[2rem] border shadow-sm ${d.turnover_eval.is_sufficient ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                         <div className="text-[10px] font-black uppercase mb-1">{d.turnover_eval.is_sufficient ? '换手充分' : '换手存疑'}</div>
                         <p className="text-sm font-black italic">"{d.turnover_eval.verdict}"</p>
                      </div>
                   </div>
                </div>

                {/* Risk Warning */}
                <div className="bg-amber-50 rounded-[2.5rem] border border-amber-100 p-8 shadow-sm">
                   <div className="flex items-center gap-3 mb-6 text-amber-700">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-black text-sm uppercase tracking-widest">审计警示</span>
                   </div>
                   <p className="text-sm text-amber-900 font-bold leading-relaxed">
                      {selectedImage ? "AI 已成功对齐视觉形态数据。" : "建议上传 K 线截图以激活视觉识别。"} 龙虎榜数据基于交易所最新披露，若 L2 出现“大单对敲”行为，风险指数将自动加权。
                   </p>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Placeholder State */}
      {!result && !loading && (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200">
           <div className="p-6 bg-indigo-50 rounded-full mb-8">
              <Fingerprint className="w-16 h-16 text-indigo-200" />
           </div>
           <p className="text-slate-400 font-black text-2xl tracking-tight">输入标的，启动多维博弈审计</p>
           <p className="text-slate-300 text-sm mt-4 max-w-md mx-auto leading-relaxed">
              支持 **纯文本** 或 **K线截图** 审计。AI 将深度判别标的是“合力锁筹”还是“诱多出货”。
           </p>
        </div>
      )}
    </div>
  );
};
