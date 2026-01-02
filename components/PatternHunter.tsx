
import React, { useState, useEffect, useRef } from 'react';
import { ModelProvider, MarketType, AnalysisResult, PatternStockItem } from '../types';
import { fetchNanxingPattern, fetchPatternVerification } from '../services/geminiService';
import { Target, Loader2, Search, Zap, Flame, ShieldAlert, TrendingUp, Info, Activity, MousePointer2, Sparkles, BarChart3, Fingerprint, Radar, ChevronRight, AlertTriangle, Camera, X, ImageIcon, Eye, Crosshair, ShieldCheck, Gauge, RefreshCw } from 'lucide-react';

export const PatternHunter: React.FC<{
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

  // Deep Dive State
  const [selectedForDeepDive, setSelectedForDeepDive] = useState<PatternStockItem | null>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveResult, setDeepDiveResult] = useState<AnalysisResult | null>(null);
  const [volumeRatio, setVolumeRatio] = useState('1.0'); 
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (loading || deepDiveLoading) {
      setElapsed(0);
      interval = setInterval(() => setElapsed(p => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading, deepDiveLoading]);

  const handleScan = async () => {
    if (!settings.geminiKey) {
      onOpenSettings();
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedForDeepDive(null);
    setDeepDiveResult(null);
    try {
      const data = await fetchNanxingPattern(query, settings.geminiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "猎手探测失败，请检查网络或 API 配置");
    } finally {
      setLoading(false);
    }
  };

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

  const handleDeepVerify = async () => {
    if (!selectedForDeepDive) return;
    setDeepDiveLoading(true);
    setDeepDiveResult(null);
    try {
      const data = await fetchPatternVerification(
        `${selectedForDeepDive.name} (${selectedForDeepDive.code})`,
        volumeRatio,
        selectedImage,
        settings.geminiKey
      );
      setDeepDiveResult(data);
      setTimeout(() => {
        document.getElementById('deep-dive-result')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setError("验证失败: " + err.message);
    } finally {
      setDeepDiveLoading(false);
    }
  };

  const d = result?.patternHunterData;
  const dv = deepDiveResult?.patternVerificationData;

  // Ultra-robust display logic to prevent "0.65%" 
  const getDisplayConfidence = (score: any) => {
    if (score === undefined || score === null) return 0;
    const num = parseFloat(score);
    if (isNaN(num)) return 0;
    // If num is 0.65, return 65. If num is 65, return 65.
    if (num > 0 && num < 1.0) return Math.round(num * 100);
    return Math.round(num);
  };

  const getVacuumColor = (score: number) => {
    if (score >= 85) return 'text-rose-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-indigo-600';
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Header Panel */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
            <div>
              <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 mb-3">
                <div className="p-3 bg-gradient-to-br from-rose-600 to-rose-800 rounded-2xl text-white shadow-xl shadow-rose-100">
                  <Target className="w-8 h-8" />
                </div>
                二三梯队 · 地量猎手 (Pattern Hunter)
              </h2>
              <p className="text-slate-500 text-base max-w-2xl font-medium">
                专项审计 **“南兴股份模式”**：排除ST与弱流动性，聚焦极致缩量真空期标的。AI 强力对齐截图实时股价。
              </p>
            </div>
            
            <div className="flex flex-col gap-4 w-full md:w-auto">
               <div className="flex gap-3 p-2 bg-slate-100 rounded-[2rem] border border-slate-200 w-full md:min-w-[400px]">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="指定板块 (如: 商业航天)..."
                      className="w-full h-14 pl-12 pr-4 bg-white rounded-[1.5rem] border border-slate-200 focus:ring-4 focus:ring-rose-50 outline-none font-bold text-lg transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
                  </div>
                  <button 
                    onClick={handleScan}
                    disabled={loading}
                    className="px-10 h-14 bg-rose-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-rose-700 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 whitespace-nowrap"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radar className="w-5 h-5" />}
                    探测埋伏点
                  </button>
               </div>
               <p className="text-[10px] text-slate-400 font-bold px-4 flex items-center gap-2">
                 <Info className="w-3 h-3" /> 自动排除 ST 股与低位僵尸股
               </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
             <div className="px-5 py-2.5 bg-rose-50 rounded-2xl border border-rose-100 text-rose-700 text-xs font-black flex items-center gap-2 shadow-sm">
                <Flame className="w-4 h-4" /> 排除 ST 黑名单
             </div>
             <div className="px-5 py-2.5 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-700 text-xs font-black flex items-center gap-2 shadow-sm">
                <BarChart3 className="w-4 h-4" /> 视觉股价校准优先
             </div>
             <div className="px-5 py-2.5 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-xs font-black flex items-center gap-2 shadow-sm">
                <Sparkles className="w-4 h-4" /> 补涨 Alpha 信号
             </div>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 w-64 h-64 bg-rose-500/5 rounded-full -mr-32 -mb-32 blur-3xl pointer-events-none"></div>
      </div>

      {loading && (
        <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200">
           <Radar className="w-20 h-20 text-rose-500 animate-spin-slow mb-6" />
           <p className="text-slate-500 font-black text-xl tracking-tight">正在探测缩量极值点与排除黑名单标的... ({elapsed}s)</p>
        </div>
      )}

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] text-rose-700 flex items-center gap-4 shadow-sm">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {d && !selectedForDeepDive && (
        <div className="space-y-10 animate-slide-up">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-10">
             <div className="relative z-10 flex-1">
                <div className="flex items-center gap-3 mb-4">
                   <span className="px-3 py-1 bg-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest">题材审计报告 (无 ST)</span>
                   <span className="text-sm font-bold opacity-60">| {d.market_stage}</span>
                </div>
                <h3 className="text-3xl font-black mb-6">主攻标杆：{d.sector_leader}</h3>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 italic">
                   <p className="text-lg font-bold text-slate-300 leading-relaxed">"{d.sector_context}"</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {d.stocks.map((stock, idx) => (
                <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-2xl transition-all group flex flex-col h-full border-b-8 border-rose-50">
                   <div className="p-8 pb-4 flex-1">
                      <div className="flex justify-between items-start mb-8">
                         <div>
                            <div className="flex items-center gap-2 mb-2">
                               <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500 border border-slate-200">{stock.current_tier}</span>
                               <span className="px-2 py-0.5 bg-indigo-50 rounded text-[9px] font-black text-indigo-600 border border-indigo-100">高流动性</span>
                            </div>
                            <h4 className="text-3xl font-black text-slate-800">{stock.name}</h4>
                            <div className="text-xs font-mono text-slate-400 mt-1">{stock.code}</div>
                         </div>
                         <div className="text-right">
                            <div className={`text-4xl font-black tracking-tighter ${getVacuumColor(stock.vacuum_score)}`}>{stock.vacuum_score}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">地量系数</div>
                         </div>
                      </div>

                      <div className="space-y-6 mb-8">
                         <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                               <Activity className="w-3.5 h-3.5 text-rose-500" /> 洗盘诊断 (修正滞后价)
                            </div>
                            <p className="text-sm text-slate-700 font-bold leading-relaxed">{stock.volume_ratio_desc}</p>
                            <p className="text-xs text-slate-500 mt-2 font-medium italic opacity-80">{stock.technical_setup}</p>
                         </div>
                      </div>
                   </div>

                   <div className="px-8 py-6 bg-rose-950 text-white flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                         <div className="flex items-center gap-2 text-rose-400">
                            <MousePointer2 className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">第一点火信号位 (Signal)</span>
                         </div>
                         <button 
                            onClick={() => setSelectedForDeepDive(stock)}
                            className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg active:scale-95"
                         >
                            <Crosshair className="w-3.5 h-3.5" /> 视觉价格对齐
                         </button>
                      </div>
                      <p className="text-lg font-black italic">"{stock.entry_signal_trigger}"</p>
                   </div>
                </div>
             ))}
          </div>
        </div>
      )}

      {selectedForDeepDive && (
        <div className="space-y-8 animate-slide-up">
           <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl p-10">
              <button 
                onClick={() => {setSelectedForDeepDive(null); setDeepDiveResult(null);}}
                className="text-slate-400 hover:text-rose-600 flex items-center gap-1 text-xs font-black uppercase tracking-widest mb-4 transition-colors"
              >
                 <X className="w-4 h-4" /> 取消并返回
              </button>
              <h3 className="text-4xl font-black text-slate-800 flex items-center gap-4 mb-10">
                 终极验证：{selectedForDeepDive.name}
                 <span className="text-lg font-mono text-slate-400 px-3 py-1 bg-slate-100 rounded-xl">{selectedForDeepDive.code}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-80 rounded-[2.5rem] border-4 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${imagePreview ? 'border-rose-200' : 'border-slate-200 bg-slate-50 hover:border-rose-400'}`}
                 >
                    {imagePreview ? (
                       <img src={imagePreview} className="w-full h-full object-contain p-4 rounded-2xl" />
                    ) : (
                       <div className="text-center">
                          <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="font-black text-slate-400">点击上传包含最新股价的截图</p>
                          <p className="text-[10px] text-slate-300 uppercase mt-1">强制 AI 废弃陈旧价格数据</p>
                       </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                 </div>

                 <div className="space-y-6">
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200">
                       <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">实时量比 (必填)</label>
                       <input 
                         type="number" step="0.01" value={volumeRatio}
                         onChange={e => setVolumeRatio(e.target.value)}
                         className="w-full h-16 px-6 bg-white border border-slate-300 rounded-2xl font-black text-2xl text-rose-600 outline-none"
                       />
                    </div>
                    <button 
                       onClick={handleDeepVerify}
                       disabled={deepDiveLoading}
                       className="w-full h-20 bg-rose-600 text-white rounded-[1.5rem] font-black text-xl shadow-2xl hover:bg-rose-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                       {deepDiveLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : <ShieldCheck className="w-7 h-7" />}
                       执行终极审计 (视觉对齐)
                    </button>
                 </div>
              </div>
           </div>

           {dv && (
              <div id="deep-dive-result" className="space-y-8 animate-slide-up pb-20">
                 <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl flex flex-col md:flex-row items-center gap-10 border-b-8 border-rose-500 overflow-hidden relative">
                    <div className="relative z-10 flex-1">
                       <div className="flex items-center gap-3 mb-4">
                          <span className="px-3 py-1 bg-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest">SNIPER VERDICT</span>
                          <span className="text-sm font-bold opacity-60">| 拒绝数据延迟</span>
                       </div>
                       <h3 className="text-5xl font-black mb-6">{dv.verdict}</h3>
                       <div className="bg-white/10 p-6 rounded-3xl border border-white/10">
                          <p className="text-xl font-bold text-slate-200 leading-relaxed italic">"{dv.battle_logic}"</p>
                       </div>
                    </div>
                    <div className="bg-rose-600/20 border-2 border-rose-500/30 p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center w-64 h-64 shadow-2xl">
                       <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">爆发确定性</div>
                       <div className="text-7xl font-black">{getDisplayConfidence(dv.confidence_score)}<span className="text-2xl opacity-40">%</span></div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                       <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2"><Eye className="w-5 h-5 text-indigo-500" /> 视觉与量比校准分析</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-4">
                                <div className="text-sm font-black text-slate-800 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-rose-500" /> 视觉形态 (已对齐股价)</div>
                                <p className="text-sm text-slate-600 font-bold leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100 italic">{dv.visual_diagnostic}</p>
                             </div>
                             <div className="space-y-4">
                                <div className="text-sm font-black text-slate-800 flex items-center gap-2"><Gauge className="w-4 h-4 text-indigo-500" /> 实时量比研判</div>
                                <p className="text-sm text-slate-600 font-bold leading-relaxed bg-indigo-50 p-6 rounded-3xl border border-indigo-100 italic">{dv.volume_ratio_verdict}</p>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="lg:col-span-4 space-y-8">
                       <div className="bg-rose-50 rounded-[2.5rem] border border-rose-100 p-8 shadow-sm">
                          <h4 className="text-[11px] font-black text-rose-700 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><Target className="w-5 h-5" /> 操作建议 (修正后)</h4>
                          <div className="space-y-6">
                             <div className="bg-white p-6 rounded-3xl border border-rose-100">
                                <div className="text-[10px] font-black text-slate-400 mb-1">入场触发价 (基于截图)</div>
                                <div className="text-2xl font-black text-rose-600 tracking-tight">{dv.trigger_condition}</div>
                             </div>
                             <div className="bg-white p-6 rounded-3xl border border-rose-100">
                                <div className="text-[10px] font-black text-slate-400 mb-1">止损位</div>
                                <div className="text-2xl font-black text-slate-800 tracking-tight">{dv.stop_loss_point}</div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           )}
        </div>
      )}

      {!result && !loading && (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200">
           <div className="p-8 bg-rose-50 rounded-full mb-10">
              <Target className="w-16 h-16 text-rose-200" />
           </div>
           <p className="text-slate-400 font-black text-2xl tracking-tight">扫射板块盲区 · 排除 ST · 猎取极致地量</p>
        </div>
      )}
    </div>
  );
};
