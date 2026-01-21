import React, { useState, useEffect, useRef } from 'react';
// Fixed: Removed missing BatchStockScore export from the import list
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { fetchBatchTimingAnalysis } from '../services/timingService';
import { ListChecks, Loader2, Search, ArrowRight, TrendingUp, TrendingDown, Activity, Info, AlertTriangle, ShieldCheck, Zap, Gauge, Flame, Wallet, ChevronDown, ChevronUp, Camera, X, Image as ImageIcon, Eye } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';

export const BatchTimingAnalysis: React.FC<{
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: any;
  onOpenSettings: () => void;
}> = ({ currentModel, currentMarket, settings, onOpenSettings }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Image handling
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
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
    if (!input.trim() && !selectedImage) return;
    if (!settings.geminiKey) {
      onOpenSettings();
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchBatchTimingAnalysis(input, selectedImage, currentMarket, settings.geminiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "批量分析失败");
    } finally {
      setLoading(false);
    }
  };

  const data = result?.batchTimingData;

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'Immediate': return 'bg-rose-600 text-white border-rose-700 shadow-rose-100';
      case 'Pullback': return 'bg-amber-500 text-white border-amber-600 shadow-amber-100';
      case 'Wait': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-800 text-slate-400 border-slate-900';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Search Header */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 md:p-12 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-600 rounded-2xl text-white shadow-xl shadow-rose-100">
              <ListChecks className="w-8 h-8" />
            </div>
            多股择时打分榜
          </h2>
          <p className="text-slate-500 text-base max-w-2xl font-medium mb-10">
            支持 **文字列表** 或 **行情截图** 输入。AI 将强制以图中实时价为基准进行择时对齐，修正联网数据延迟。
          </p>

          <div className="flex flex-col gap-4">
            <div className="relative">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="请输入股票列表，或直接上传同花顺/东方财富截图..."
                className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-rose-50 outline-none font-bold text-lg transition-all resize-none"
              />
              <div className="absolute right-4 bottom-4">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${selectedImage ? 'bg-rose-600 text-white border-rose-700' : 'bg-white text-slate-500 border-slate-200 hover:border-rose-400 hover:text-rose-600'}`}
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-xs font-black">{selectedImage ? '更换截图' : '上传图片对齐价格'}</span>
                </button>
              </div>
            </div>

            {selectedImage && (
              <div className="flex items-center gap-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl animate-fade-in">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-rose-200 shrink-0">
                  <img src={`data:image/jpeg;base64,${selectedImage}`} className="w-full h-full object-cover" />
                  <button onClick={() => setSelectedImage(null)} className="absolute top-0 right-0 p-1 bg-rose-600 text-white rounded-bl-lg">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-rose-700 font-black mb-1">
                    <Eye className="w-4 h-4" /> 视觉辅助分析已就绪
                  </div>
                  <p className="text-xs text-rose-600 font-medium">AI 将自动识别图中的标的、最新实时价与量价形态，作为最高优先级研判基准。</p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                 <Info className="w-4 h-4" /> 如果联网搜索的价格滞后，请务必提供截图以获得更精准的建议位
              </div>
              <button 
                onClick={handleAnalyze}
                disabled={loading}
                className="px-12 h-14 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                {loading ? `视觉扫描研判中 (${elapsed}s)` : '开始量化评分'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 flex items-center gap-4 shadow-sm animate-fade-in">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {data && (
        <div className="space-y-8 animate-slide-up">
          {/* Summary Banner */}
          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
             <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                   <span className="px-3 py-1 bg-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest">行情研判快报</span>
                   <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                     {selectedImage && <ImageIcon className="w-3 h-3 text-rose-400" />}
                     {selectedImage ? "已结合截图视觉修正" : "基于纯文本/搜索数据"}
                   </span>
                </div>
                <p className="text-xl font-black italic leading-relaxed text-slate-200">"{data.market_context}"</p>
             </div>
             <div className="text-center bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 w-48">
                <div className="text-4xl font-black mb-1">{data.overall_risk_score}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">总体持仓风险</div>
             </div>
          </div>

          {/* Ranking List */}
          <div className="grid grid-cols-1 gap-4">
             {data.stocks.sort((a, b) => b.win_rate - a.win_rate).map((stock, idx) => (
                <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl transition-all group">
                   <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
                      {/* Score Gauge */}
                      <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                         <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                            <circle 
                              cx="48" cy="48" r="40" 
                              fill="none" 
                              stroke={stock.win_rate > 70 ? '#ef4444' : stock.win_rate > 40 ? '#f59e0b' : '#64748b'} 
                              strokeWidth="8" 
                              strokeDasharray="251.2" 
                              strokeDashoffset={251.2 * (1 - stock.win_rate / 100)} 
                              className="transition-all duration-1000"
                            />
                         </svg>
                         <div className="absolute flex flex-col items-center">
                            <span className="text-xl font-black text-slate-800">{stock.win_rate}%</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase">胜率</span>
                         </div>
                      </div>

                      {/* Stock Info */}
                      <div className="flex-1 text-center md:text-left">
                         <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                            <h3 className="text-2xl font-black text-slate-800">{stock.name}</h3>
                            <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{stock.code}</span>
                            <div className={`px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border-2 ${getVerdictStyle(stock.verdict)}`}>
                               {stock.verdict_label}
                            </div>
                         </div>
                         <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-4">
                            <div className="flex items-center gap-2">
                               <div className="p-1.5 bg-rose-50 rounded-lg"><Flame className="w-4 h-4 text-rose-500" /></div>
                               <div>
                                  <div className="text-[10px] font-black text-slate-400 uppercase">板块热度</div>
                                  <div className="text-sm font-black text-slate-700">{stock.sector_heat}</div>
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <div className="p-1.5 bg-indigo-50 rounded-lg"><Wallet className="w-4 h-4 text-indigo-500" /></div>
                               <div>
                                  <div className="text-[10px] font-black text-slate-400 uppercase">资金倾向</div>
                                  <div className={`text-sm font-black ${stock.capital_flow === 'Inflow' ? 'text-rose-600' : stock.capital_flow === 'Outflow' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                     {stock.capital_flow === 'Inflow' ? '主力净流入' : stock.capital_flow === 'Outflow' ? '主力净流出' : '资金博弈'}
                                  </div>
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <div className="p-1.5 bg-amber-50 rounded-lg"><Activity className="w-4 h-4 text-amber-500" /></div>
                               <div>
                                  <div className="text-[10px] font-black text-slate-400 uppercase">技术面</div>
                                  <div className="text-sm font-black text-slate-700">{stock.technical_score}</div>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Key Price & Logic Toggle */}
                      <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
                         <div className="text-center md:text-right">
                            <div className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1 justify-center md:justify-end">
                              {selectedImage && <ImageIcon className="w-2.5 h-2.5 text-rose-500" />}
                              视觉校准建议位
                            </div>
                            <div className="text-xl font-black text-rose-600 tracking-tighter">{stock.key_price}</div>
                         </div>
                         <button 
                            onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                            className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-100"
                         >
                            {expandedIndex === idx ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                         </button>
                      </div>
                   </div>

                   {/* Expandable Logic */}
                   {expandedIndex === idx && (
                      <div className="px-8 pb-8 pt-0 animate-slide-down">
                         <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                               <ShieldCheck className="w-4 h-4 text-indigo-500" /> 深度研判逻辑
                            </h4>
                            <p className="text-sm text-slate-600 font-bold leading-relaxed italic">
                               "{stock.logic_summary}"
                            </p>
                         </div>
                      </div>
                   )}
                </div>
             ))}
          </div>

          <div className="text-center py-10">
             <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-100 rounded-full text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                <Zap className="w-4 h-4 text-rose-500" /> 价格已通过截图视觉对齐，显著优于纯搜索结果
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
