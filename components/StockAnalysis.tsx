
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { fetchExternalAIStream } from '../services/externalLlmService';
import { fetchStockDetailWithImage } from '../services/geminiService';
import { Search, Loader2, Target, Activity, DollarSign, Camera, X, Compass, ShieldCheck, Zap, Info, ArrowUpCircle, ArrowDownCircle, TrendingUp, AlertCircle, FileText } from 'lucide-react';
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
  const [loadingPhase, setLoadingPhase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll for streaming
  const resultEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (loading && resultEndRef.current) {
      resultEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [savedResult?.content]);

  const performAnalysis = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    onResultUpdate(null);
    setLoadingPhase("正在唤醒 AI 投研大脑...");

    const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;

    try {
      if (currentModel === ModelProvider.HUNYUAN_CN) {
        // --- Hunyuan Streaming Path ---
        const apiKey = settings.hunyuanKey;
        if (!apiKey) throw new Error("未检测到 混元 API Key");
        
        const prompt = `分析 ${marketLabel} 股票 "${query}"。参考价: ${currentPrice || '自动'}. 输出包含: 1.均线/乖离诊断; 2.核心支撑压力位; 3.板块逻辑; 4.操作建议.`;
        
        let accumulatedText = "";
        onResultUpdate({ content: "", timestamp: Date.now(), modelUsed: currentModel, market: currentMarket });

        await fetchExternalAIStream(currentModel, apiKey, prompt, (chunk) => {
          accumulatedText += chunk;
          onResultUpdate({ content: accumulatedText, timestamp: Date.now(), modelUsed: currentModel, market: currentMarket });
          setLoadingPhase("AI 正在实时输出研判逻辑...");
        });

      } else {
        // --- Gemini Standard/Image Path ---
        let data: AnalysisResult;
        if (selectedImage && currentModel === ModelProvider.GEMINI_INTL) {
           data = await fetchStockDetailWithImage(selectedImage, query, currentMarket, settings.geminiKey!, currentPrice);
        } else {
           const prompt = `请对 ${marketLabel} 的股票 "${query}" 进行多维量化分析，包含：1.均线与乖离率；2.支撑与压力位；3.板块协同性；4.操作建议。`;
           data = await analyzeWithLLM(currentModel, prompt, false, settings, false, 'day', currentPrice, currentMarket);
        }
        onResultUpdate(data);
      }
    } catch (err: any) {
      setError(err.message || "分析中断，请重试");
    } finally {
      setLoading(false);
      setLoadingPhase("");
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

  const extractMetrics = (text: string) => {
    const lines = text.split('\n');
    const metrics: { label: string; value: string }[] = [];
    const others: string[] = [];
    lines.forEach(line => {
      const trimmed = line.trim().replace(/^[-*]\s*/, ''); 
      const match = trimmed.match(/^([^：:]+?)[:：]\s*(.+)$/);
      if (match && trimmed.length < 80) {
        metrics.push({ label: match[1].replace(/\*\*/g, ''), value: match[2].replace(/\*\*/g, '') });
      } else if (trimmed) others.push(line);
    });
    return { metrics, others };
  };

  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-bold">$1</strong>')
      .replace(/(卖出|止损|压力|风险|减仓|跌破)/g, '<span class="text-rose-600 font-bold">$1</span>')
      .replace(/(买入|止盈|支撑|机遇|加仓|金叉)/g, '<span class="text-emerald-600 font-bold">$1</span>');
  };

  const renderSectionContent = (title: string, body: string) => {
    if (title.includes("基础") || title.includes("指标") || title.includes("1.")) {
       const { metrics, others } = extractMetrics(body);
       return (
         <div className="space-y-6">
            {metrics.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {metrics.map((m, i) => (
                   <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <div className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">{m.label}</div>
                      <div className={`text-lg font-black text-slate-800`}>{m.value}</div>
                   </div>
                 ))}
              </div>
            )}
            <div className="space-y-2 border-t border-slate-50 pt-4">
               {others.map((line, i) => (
                  <p key={i} className="text-sm text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{__html: formatText(line)}}></p>
               ))}
            </div>
         </div>
       );
    }
    return <div className="space-y-3 prose prose-sm max-w-none text-slate-600 font-medium" dangerouslySetInnerHTML={{__html: formatText(body.replace(/\n/g, '<br/>'))}} />;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-12 relative overflow-hidden">
        <h2 className="text-3xl font-black text-slate-800 mb-8 flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-100"><TrendingUp className="w-8 h-8"/></div>
            个股多维量化诊断
        </h2>
        
        <form onSubmit={handleSearch} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={savedQuery}
                onChange={(e) => onQueryUpdate(e.target.value)}
                placeholder="代码/名称..."
                className="w-full h-16 pl-14 pr-6 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-blue-50 outline-none transition-all text-xl font-black text-slate-800"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
            </div>
            <div className="relative w-full md:w-40">
              <input
                type="number"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="参考价"
                className="w-full h-16 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none text-lg font-black text-slate-800"
              />
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            </div>
            <div className="flex gap-2">
               <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageSelect} />
               <button type="button" onClick={() => fileInputRef.current?.click()} className={`h-16 w-16 flex items-center justify-center rounded-[1.5rem] border transition-all ${selectedImage ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-slate-400 border-slate-200'}`}><Camera className="w-8 h-8" /></button>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !savedQuery} 
            className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.5rem] font-black text-xl shadow-2xl transition-all flex flex-col items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="flex items-center gap-2"><Loader2 className="w-6 h-6 animate-spin" /> <span>正在为您研判...</span></div>
                <div className="text-xs font-medium text-slate-400 animate-pulse">{loadingPhase}</div>
              </>
            ) : (
              <div className="flex items-center gap-3"><Zap className="w-6 h-6" /> 启动深度研判</div>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 font-bold shadow-sm">
           <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {savedResult && (
        <div className="animate-slide-up space-y-8 pb-20">
          <div className="flex justify-between items-center px-8">
             <h3 className="text-2xl font-black text-slate-900">{savedQuery} 诊断报告</h3>
             <div className="px-4 py-1.5 bg-amber-50 text-amber-700 text-xs font-black rounded-full border border-amber-100 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" /> {loading ? '分析生成中...' : '研判已就绪'}
             </div>
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            {savedResult.content.split(/^#+\s+/gm).filter(Boolean).length > 1 ? (
              savedResult.content.split(/^#+\s+/gm).filter(Boolean).map((sec, index) => {
                const lines = sec.trim().split('\n');
                const title = lines[0].trim();
                const body = lines.slice(1).join('\n').trim();
                return (
                  <div key={index} className="rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden bg-white">
                    <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                      <FileText className="w-5 h-5 text-indigo-500" />
                      <h3 className="font-black text-lg text-slate-800">{title}</h3>
                    </div>
                    <div className="p-8">{renderSectionContent(title, body)}</div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[2.5rem] border border-slate-200 shadow-sm bg-white p-10 min-h-[300px] leading-relaxed">
                <div dangerouslySetInnerHTML={{__html: formatText(savedResult.content.replace(/\n/g, '<br/>'))}} />
                {loading && <div className="inline-block w-2 h-5 bg-indigo-500 animate-pulse ml-1 align-middle"></div>}
              </div>
            )}
          </div>
          <div ref={resultEndRef} />
        </div>
      )}
    </div>
  );
};
