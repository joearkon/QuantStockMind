
import React, { useState, useRef, useEffect } from 'react';
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { fetchKLineSynergyAnalysis, fetchChiNextMarketScan } from '../services/geminiService';
import { Wand2, Camera, Loader2, Search, ArrowRight, Activity, Zap, Target, Info, Flame, History, X, LineChart, TrendingUp, Compass, MessageSquareCode, CalendarDays, ArrowUpRight, ArrowDownRight, Crosshair, Quote, List, Sparkles } from 'lucide-react';

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
  const [isScanMode, setIsScanMode] = useState(false);
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
    setIsScanMode(false);
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

  const handleChiNextScan = async () => {
    if (!settings.geminiKey) {
      onOpenSettings();
      return;
    }
    setIsScanMode(true);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchChiNextMarketScan(settings.geminiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "扫盘失败");
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 mb-2">
                <div className="p-3 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl text-white shadow-xl">
                  <Wand2 className="w-8 h-8" />
                </div>
                K线合力大师 (3-5日战法)
              </h2>
              <p className="text-slate-500 text-sm font-medium">
                推演明后两日股价博弈区间。支持单股深度分析与创业板全市场扫盘。
              </p>
            </div>
            
            <button 
              onClick={handleChiNextScan}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {loading && isScanMode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              创业板今日合力扫盘
            </button>
          </div>

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

            <button 
              onClick={handleAnalyze}
              disabled={loading || (!query && !selectedImage)}
              className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading && !isScanMode ? <Loader2 className="w-6 h-6 animate-spin" /> : <TrendingUp className="w-6 h-6" />}
              {loading && !isScanMode ? `单股深度分析中 (${elapsed}s)...` : '开始明后日股价预判'}
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

      {/* 扫盘结果展示列表 - 极简打分表 */}
      {isScanMode && kdata?.scan_results && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden animate-slide-up">
           <div className="bg-slate-900 px-10 py-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <div className="p-2 bg-indigo-500 rounded-lg text-white">
                    <List className="w-5 h-5" />
                 </div>
                 <h3 className="text-xl font-black text-white">创业板今日合力扫盘打分表</h3>
              </div>
              <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">{new Date().toLocaleDateString()}</span>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-100">
                    <tr>
                       <th className="px-10 py-4">代码/名称</th>
                       <th className="px-6 py-4">合力强度 (0-100)</th>
                       <th className="px-6 py-4">预判形态</th>
                       <th className="px-6 py-4">明日波动区间</th>
                       <th className="px-10 py-4 text-right">操盘指令</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {kdata.scan_results.map((item, idx) => (
                       <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-10 py-5">
                             <div className="font-black text-slate-800">{item.name}</div>
                             <div className="text-[10px] font-mono text-slate-400">{item.code}</div>
                          </td>
                          <td className="px-6 py-5">
                             <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm border-2 ${
                                   item.synergy_score > 80 ? 'bg-rose-50 border-rose-200 text-rose-600' : 
                                   item.synergy_score > 50 ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400'
                                }`}>
                                   {item.synergy_score}
                                </div>
                                <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                                   <div className={`h-full ${item.synergy_score > 80 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{width: `${item.synergy_score}%`}}></div>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-5">
                             <span className="text-sm font-bold text-slate-600">{item.verdict}</span>
                          </td>
                          <td className="px-6 py-5">
                             <span className="text-sm font-black text-slate-800">{item.tomorrow_range}</span>
                          </td>
                          <td className="px-10 py-5 text-right">
                             <div className={`inline-block px-4 py-1.5 rounded-xl text-xs font-black shadow-sm ${
                                item.synergy_score > 80 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                             }`}>
                                {item.action_hint}
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
           <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-start gap-4">
              <Quote className="w-10 h-10 text-slate-200 shrink-0" />
              <p className="text-sm text-slate-500 font-bold italic leading-relaxed">
                 "{kdata.battle_summary || '扫盘已完成，结果基于今日成交量异常标的推演。'}"
              </p>
           </div>
        </div>
      )}

      {/* 原有的单股分析结果保持展示逻辑，但在扫盘模式下隐藏 */}
      {!isScanMode && kdata && !kdata.scan_results && (
        <div className="space-y-8 animate-slide-up">
          {/* ... 此处保持原有的股价路线图、合力指数等 UI 组件即可 ... */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl relative group hover:border-indigo-500 transition-all overflow-hidden">
                <div className="relative z-10">
                   <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg"><Target className="w-5 h-5" /></div>
                         <h3 className="text-xl font-black text-slate-800">明日股价路线 (T+1)</h3>
                      </div>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">{kdata.prediction?.probability} 胜率</span>
                   </div>
                   <div className="text-center py-6 bg-slate-50 rounded-3xl mb-6">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">预期运行区间</div>
                      <div className="text-4xl font-black text-slate-900">{kdata.prediction?.price_roadmap?.tomorrow?.range}</div>
                   </div>
                   <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center gap-4">
                      <Zap className="w-5 h-5 text-amber-400" />
                      <div className="text-sm font-bold">{kdata.prediction?.price_roadmap?.tomorrow?.action_hint}</div>
                   </div>
                </div>
             </div>
             {/* ... 后日卡片逻辑同上 ... */}
          </div>
        </div>
      )}
    </div>
  );
};
