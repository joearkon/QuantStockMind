
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { stockDiagnosisWithLLM } from '../services/llmAdapter'; // 修改导入
import { Search, Loader2, ArrowRightCircle, Target, ShieldAlert, Settings, FileText, ChevronRight, BarChart2, Activity, DollarSign, Camera, X, Image as ImageIcon, Layers, AlertCircle, TrendingUp, Compass } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';

// Define the interface for StockAnalysis props to fix the TS error
interface StockAnalysisProps {
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: UserSettings;
  onOpenSettings?: () => void;
  savedResult: AnalysisResult | null;
  onResultUpdate: (result: AnalysisResult | null) => void;
  savedQuery: string;
  onQueryUpdate: (query: string) => void;
}

export const StockAnalysis: React.FC<StockAnalysisProps> = ({ 
  currentModel, 
  currentMarket,
  settings, 
  onOpenSettings,
  savedResult,
  onResultUpdate,
  savedQuery,
  onQueryUpdate
}) => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  const performAnalysis = async (query: string) => {
    if (!query.trim()) return;
    
    if (currentModel === ModelProvider.GEMINI_INTL && !settings.geminiKey) {
      onOpenSettings?.(); return;
    }
    if (currentModel === ModelProvider.HUNYUAN_CN && !settings.hunyuanKey) {
      onOpenSettings?.(); return;
    }

    setLoading(true);
    onResultUpdate(null);
    setError(null);

    try {
      const data = await stockDiagnosisWithLLM(currentModel, query, currentMarket, selectedImage, currentPrice, settings);
      onResultUpdate(data);
    } catch (err: any) {
      setError(err.message || "分析失败，请检查网络或更换模型");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => { e.preventDefault(); performAnalysis(savedQuery); };
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setSelectedImage((reader.result as string).split(',')[1]); };
      reader.readAsDataURL(file);
    }
  };

  // ... (保持其余格式化逻辑和 JSX 结构不变，但确保 handleSearch 使用新的 performAnalysis)
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Search className="w-6 h-6 text-blue-600"/>个股量化诊断 (Multi-Model Support)</h2>
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input type="text" value={savedQuery} onChange={(e) => onQueryUpdate(e.target.value)} placeholder={`输入股票代码或名称...`} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg font-bold" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
            </div>
            <div className="relative w-full sm:w-32">
              <input type="number" step="0.01" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} placeholder="现价" className="w-full pl-9 pr-2 py-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold" />
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            </div>
            <div className="flex gap-2 shrink-0">
               <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageSelect} />
               <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-4 rounded-xl border transition-all ${selectedImage ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-slate-400 border-slate-300 hover:bg-slate-100'}`}><Camera className="w-6 h-6" /></button>
            </div>
          </div>
          {selectedImage && ( <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg"><div className="relative w-12 h-12 shrink-0 rounded overflow-hidden border"><img src={`data:image/jpeg;base64,${selectedImage}`} className="w-full h-full object-cover" /></div><div className="flex-1 text-xs text-indigo-700 font-bold">已开启视觉对齐：支持 Gemini 3 和 混元双模型识别 K 线。</div><button type="button" onClick={() => setSelectedImage(null)} className="p-1 hover:bg-red-50 text-red-500 rounded"><X className="w-4 h-4" /></button></div> )}
          <button type="submit" disabled={loading || !savedQuery} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-md">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '开始多维深度诊断'}</button>
        </form>
      </div>
      {/* ... 其余结果渲染逻辑保持不变 ... */}
      {savedResult && ( <div className="bg-slate-50 rounded-xl overflow-hidden animate-slide-up border border-slate-200"> <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200"> <h3 className="text-lg font-bold text-slate-900">{savedQuery} 诊断报告 ({savedResult.modelUsed})</h3> </div> <div className="p-6"> <div className="p-6 text-slate-700 leading-relaxed whitespace-pre-wrap">{savedResult.content}</div> </div> </div> )}
    </div>
  );
};
