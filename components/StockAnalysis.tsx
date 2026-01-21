
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { fetchStockDetailWithImage } from '../services/geminiService';
import { Search, Loader2, ArrowRightCircle, Target, ShieldAlert, Settings, FileText, ChevronRight, BarChart2, Activity, DollarSign, Camera, X, Image as ImageIcon, Layers, AlertCircle, TrendingUp, Compass } from 'lucide-react';
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
  const [currentPrice, setCurrentPrice] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const performAnalysis = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    onResultUpdate(null);
    setError(null);
    const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;
    try {
      let data: AnalysisResult;
      if (selectedImage && currentModel === ModelProvider.GEMINI_INTL) {
         if (!settings.geminiKey) throw new Error("图片分析需要 Gemini API Key");
         data = await fetchStockDetailWithImage(selectedImage, query, currentMarket, settings.geminiKey, currentPrice);
      } else {
         const prompt = `请对 ${marketLabel} 的股票 "${query}" 进行深度量化分析。要求包含：BIAS风险审计、行业Beta过滤、量价配合诊断。输出请使用标准 Markdown 标题 ## 或 ###。`;
         data = await analyzeWithLLM(currentModel, prompt, false, settings, false, 'day', currentPrice, currentMarket);
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

  // 核心优化：Markdown 解析与清洗函数
  const formatText = (text: string) => {
    if (!text) return "";
    let formatted = text.trim();
    
    // 1. 处理 *** 粗斜体 (Bold + Italic)
    formatted = formatted.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="text-slate-900 italic font-black bg-yellow-50 px-1 rounded">$1</strong>');
    
    // 2. 处理 ** 粗体
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-black">$1</strong>');
    
    // 3. 处理 * 列表项 或 斜体 (根据上下文)
    // 简单起见，这里将行首的 * 处理为圆点列表，其他的处理为斜体
    formatted = formatted.split('\n').map(line => {
      if (line.trim().startsWith('* ')) {
        return `<div class="flex gap-2 items-start mb-1.5"><span class="mt-2.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span><span>${line.trim().substring(2)}</span></div>`;
      }
      return line.replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>');
    }).join('\n');

    // 4. A 股关键词视觉增强
    const redKeywords = /(卖出|止损|跌破|风险|高位|放量滞涨|压力|清仓|追涨|正乖离过大|离场|空仓)/g;
    const greenKeywords = /(买入|止盈|支撑|反弹|底背离|缩量回调|启动|加仓|洗盘|Alpha走强|低吸|入场)/g; 
    
    formatted = formatted.replace(redKeywords, '<span class="text-emerald-700 font-black bg-emerald-50 px-1 border-b border-emerald-200">$1</span>'); 
    formatted = formatted.replace(greenKeywords, '<span class="text-rose-700 font-black bg-rose-50 px-1 border-b border-rose-200">$1</span>'); 
    
    return formatted;
  };

  const renderSectionContent = (body: string) => {
    return (
      <div className="text-base text-slate-700 leading-relaxed space-y-3">
        {body.split('\n').filter(l => l.trim()).map((line, i) => (
          <div key={i} dangerouslySetInnerHTML={{__html: formatText(line)}} />
        ))}
      </div>
    );
  };

  const renderAnalysisContent = (content: string) => {
    // 兼容多种标题层级
    const sections = content.split(/^(?:#+|####)\s+/gm).filter(Boolean);
    if (sections.length <= 1) {
       return <div className="p-8 text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">{content}</div>;
    }
    
    return (
      <div className="grid grid-cols-1 gap-8">
        {sections.map((sec, index) => {
          const lines = sec.trim().split('\n');
          const title = lines[0].replace(/[#*]/g, '').trim();
          const body = lines.slice(1).join('\n').trim();

          let Icon = FileText;
          let colorClass = "text-indigo-700";
          let bgClass = "bg-indigo-50/50";
          
          if (title.includes("数据") || title.includes("1")) Icon = Activity;
          else if (title.includes("价位") || title.includes("2")) Icon = Target;
          else if (title.includes("洗盘") || title.includes("3")) Icon = Compass;
          else if (title.includes("指令") || title.includes("4")) Icon = ArrowRightCircle;

          return (
            <div key={index} className="rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden bg-white hover:shadow-xl transition-all">
              <div className={`px-8 py-5 border-b border-slate-100 ${bgClass} flex items-center gap-3`}>
                <Icon className={`w-6 h-6 ${colorClass}`} />
                <h3 className={`font-black text-xl ${colorClass}`}>{title}</h3>
              </div>
              <div className="p-8">
                 {renderSectionContent(body)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-12">
        <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
            <Search className="w-8 h-8 text-blue-600"/>
            个股量化诊断报告
        </h2>
        
        <form onSubmit={handleSearch} className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <input type="text" value={savedQuery} onChange={(e) => onQueryUpdate(e.target.value)} placeholder="输入股票名称..." className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-lg" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
            </div>
            <div className="relative w-full sm:w-32">
              <input type="number" step="0.01" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} placeholder="现价" className="w-full h-14 pl-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
            </div>
            <div className="flex gap-2">
               <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageSelect} />
               <button type="button" onClick={() => fileInputRef.current?.click()} className={`h-14 w-14 flex items-center justify-center rounded-2xl border transition-all ${selectedImage ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
                 <Camera className="w-6 h-6" />
               </button>
               <button type="submit" disabled={loading || !savedQuery} className="h-14 px-8 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 disabled:opacity-50">
                 {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : '开始诊断'}
               </button>
            </div>
          </div>
          {selectedImage && (
             <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-indigo-200"><img src={`data:image/jpeg;base64,${selectedImage}`} className="w-full h-full object-cover" /></div>
                <div className="text-xs text-indigo-700 font-bold">视觉增强已开启：AI 将对齐 K 线形态。</div>
                <button type="button" onClick={() => setSelectedImage(null)} className="ml-auto p-2 text-rose-500"><X className="w-5 h-5" /></button>
             </div>
          )}
        </form>
      </div>

      {savedResult && (
        <div className="bg-slate-50 rounded-[3rem] overflow-hidden animate-slide-up border border-slate-200 pb-12">
          <div className="px-10 py-6 bg-white border-b border-slate-200 flex justify-between items-center mb-10">
             <h3 className="text-xl font-black text-slate-900">{savedQuery} 深度诊断报告</h3>
             <span className="text-xs font-black text-slate-400 uppercase tracking-widest">QuantMind Intelligence</span>
          </div>
          <div className="px-6 md:px-12">
             {renderAnalysisContent(savedResult.content)}
          </div>
        </div>
      )}
    </div>
  );
};
