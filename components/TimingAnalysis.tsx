
import React, { useState, useRef } from 'react';
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { fetchTimingAnalysis } from '../services/timingService';
import { Target, Camera, Loader2, Search, ArrowUpCircle, AlertCircle, ShieldAlert, TrendingUp, Info, ChevronRight, X, Image as ImageIcon } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';

export const TimingAnalysis: React.FC<{
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: any;
  onOpenSettings: () => void;
}> = ({ currentModel, currentMarket, settings, onOpenSettings }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!code) {
      setError("请输入股票代码");
      return;
    }
    if (!settings.geminiKey) {
      onOpenSettings();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTimingAnalysis(code, selectedImage, currentMarket, settings.geminiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const timing = result?.timingData;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-2">
          <div className="p-2 bg-rose-600 rounded-lg text-white">
            <Target className="w-6 h-6" />
          </div>
          择时大师 (Timing Master)
        </h2>
        <p className="text-slate-500 text-sm mb-8">AI 视觉诊断 K 线形态，识别支撑压力，评价进场胜率。提供截图可大幅提升准确度。</p>

        <div className="max-w-2xl mx-auto space-y-4">
          <div className="relative">
            <input 
              type="text" 
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="输入代码 (如 000001)..."
              className="w-full h-14 pl-12 pr-12 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none font-bold text-lg"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${selectedImage ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-rose-600'}`}
            >
              <Camera className="w-6 h-6" />
            </button>
          </div>

          {selectedImage && (
            <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-100 rounded-lg">
              <div className="relative w-16 h-16 rounded overflow-hidden border border-rose-200">
                <img src={`data:image/jpeg;base64,${selectedImage}`} className="w-full h-full object-cover" />
                <button onClick={() => setSelectedImage(null)} className="absolute top-0 right-0 p-0.5 bg-rose-600 text-white rounded-bl"><X className="w-3 h-3"/></button>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-rose-900 flex items-center gap-1"><ImageIcon className="w-3 h-3"/> 已上传形态截图</p>
                <p className="text-[10px] text-rose-700">AI 将扫描 K 线、均线、量能柱进行多维诊断。</p>
              </div>
            </div>
          )}

          <button 
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <TrendingUp className="w-6 h-6" />}
            开始择时研判
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {timing && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-slide-up">
          {/* 左侧：信号与评分 */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col items-center">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">位置评分</div>
              <div className="relative flex items-center justify-center">
                <svg className="w-40 h-40">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                  <circle cx="80" cy="80" r="70" fill="none" stroke="#e11d48" strokeWidth="12" strokeDasharray="440" strokeDashoffset={440 * (1 - timing.position_score/100)} className="transition-all duration-1000" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-black text-slate-800">{timing.position_score}</span>
                </div>
              </div>
              <div className={`mt-8 px-6 py-2 rounded-full font-black text-lg ${
                timing.action === 'Buy' ? 'bg-rose-500 text-white' : 
                timing.action === 'Wait' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-500 text-white'
              }`}>
                指令: {timing.action === 'Buy' ? '建议进场' : timing.action === 'Wait' ? '持币观望' : '分批离场'}
              </div>
            </div>
          </div>

          {/* 右侧：逻辑与点位 */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
              <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-500" /> 形态解读与逻辑
              </h3>
              <p className="text-slate-600 leading-relaxed italic border-l-4 border-slate-100 pl-4 mb-8">"{timing.kline_analysis}"</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest">进场逻辑</div>
                  <p className="text-sm text-slate-700 font-bold">{timing.entry_logic}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                  <div>
                    <div className="text-[10px] font-black text-slate-400 mb-1">参考买点</div>
                    <div className="text-lg font-black text-rose-600">{timing.entry_price_window}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-black text-slate-400 mb-1">止盈目标</div>
                      <div className="text-sm font-bold text-slate-800">{timing.target_profit}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-400 mb-1">风险止损</div>
                      <div className="text-sm font-bold text-emerald-600">{timing.stop_loss}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
