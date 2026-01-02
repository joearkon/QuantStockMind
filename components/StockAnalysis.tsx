
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { fetchStockDetailWithImage } from '../services/geminiService';
import { Search, Loader2, ArrowRightCircle, Target, ShieldAlert, FileText, Activity, Camera, X, Compass, AlertCircle, Globe, Link as LinkIcon } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';

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
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const performAnalysis = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    onResultUpdate(null);
    setError(null);
    
    try {
      let data: AnalysisResult;
      if (selectedImage && currentModel === ModelProvider.GEMINI_INTL) {
         if (!settings.geminiKey) throw new Error("图片分析需要 Gemini API Key");
         data = await fetchStockDetailWithImage(selectedImage, query, currentMarket, settings.geminiKey);
      } else {
         const prompt = `对股票 "${query}" 进行深度诊断，包含 BIAS 风险审计、行业 Beta 过滤及量价配合分析。`;
         data = await analyzeWithLLM(currentModel, prompt, true, settings, false, 'day', undefined, currentMarket);
      }
      onResultUpdate(data);
    } catch (err: any) {
      setError(err.message || "分析失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performAnalysis(savedQuery);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== savedQuery) {
      onQueryUpdate(q);
      performAnalysis(q);
    }
  }, [searchParams]);

  const formatText = (text: string) => {
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-bold">$1</strong>');
    const redKeywords = /(卖出|止损|跌破|风险|高位|放量滞涨|压力|清仓|追涨|正乖离过大|离场)/g;
    const greenKeywords = /(买入|止盈|支撑|反弹|底背离|缩量回调|启动|加仓|洗盘|Alpha走强|低吸)/g; 
    formatted = formatted.replace(redKeywords, '<span class="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">$1</span>'); 
    formatted = formatted.replace(greenKeywords, '<span class="text-rose-600 font-bold bg-rose-50 px-1 rounded">$1</span>'); 
    return formatted;
  };

  const renderSectionContent = (title: string, body: string) => {
    return (
       <div className="space-y-2">
          {body.split('\n').filter(l => l.trim()).map((line, i) => (
             <div key={i} className={`flex gap-3 items-start ${line.startsWith('###') ? 'mt-4 mb-2' : ''}`}>
                {!line.startsWith('###') && <span className="mt-2 w-1.5 h-1.5 bg-slate-300 rounded-full shrink-0"></span>}
                <p className="text-sm text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{__html: formatText(line.replace(/^[-*]\s*/, ''))}}></p>
             </div>
          ))}
       </div>
    );
  };

  const renderAnalysisContent = (content: string) => {
    const sections = content.split(/^#+\s+/gm).filter(Boolean);
    if (sections.length <= 1) return <div className="p-6 text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatText(content.replace(/\n/g, '<br/>')) }} />;
    
    return (
      <div className="grid grid-cols-1 gap-6">
        {sections.map((sec, index) => {
          const lines = sec.trim().split('\n');
          const title = lines[0].trim();
          const body = lines.slice(1).join('\n').trim();
          return (
            <div key={index} className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-lg text-slate-800">{title}</h3>
              </div>
              <div className="p-6">{renderSectionContent(title, body)}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Search className="w-6 h-6 text-blue-600"/>
            个股量化诊断 (Beta+BIAS 增强版)
        </h2>
        
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto space-y-4">
          <div className="relative">
            <input
              type="text"
              value={savedQuery}
              onChange={(e) => onQueryUpdate(e.target.value)}
              placeholder="输入股票代码或名称..."
              className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-lg"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageSelect} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg ${selectedImage ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:bg-slate-100'}`}>
              <Camera className="w-5 h-5" />
            </button>
          </div>

          {selectedImage && (
             <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <div className="relative w-12 h-12 shrink-0 rounded overflow-hidden border border-indigo-200">
                   <img src={`data:image/jpeg;base64,${selectedImage}`} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-xs text-indigo-700 font-bold">已启用 K 线视觉校准 (Auto-Align)</div>
                <button type="button" onClick={() => setSelectedImage(null)} className="p-1 hover:bg-red-50 text-red-500 rounded"><X className="w-4 h-4" /></button>
             </div>
          )}
          
          <button type="submit" disabled={loading || !savedQuery} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />}
            开始深度量化诊断
          </button>
        </form>
      </div>

      {error && <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 font-bold animate-fade-in">{error}</div>}

      {savedResult && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-slide-up shadow-sm">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white">
               <h3 className="text-lg font-bold text-slate-900">{savedQuery} 诊断结果</h3>
               <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">
                  <AlertCircle className="w-3 h-3" /> 已集成行业 Beta 过滤
               </div>
            </div>
            <div className="p-6 bg-slate-50/30">{renderAnalysisContent(savedResult.content)}</div>
          </div>

          {savedResult.groundingSource && savedResult.groundingSource.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
               <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> 联网审计数据源 (Reference)
               </h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {savedResult.groundingSource.map((source, idx) => (
                    <a key={idx} href={source.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-indigo-300 hover:bg-white transition-all group">
                       <LinkIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500" />
                       <span className="text-xs text-slate-600 font-medium truncate">{source.title}</span>
                    </a>
                  ))}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
