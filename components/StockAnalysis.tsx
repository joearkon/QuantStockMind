
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { fetchStockDetailWithImage } from '../services/geminiService'; // New Service
import { Search, Loader2, ArrowRightCircle, Target, ShieldAlert, Settings, FileText, ChevronRight, BarChart2, Activity, DollarSign, Camera, X, Image as ImageIcon, Layers, AlertCircle, TrendingUp, Compass } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';

interface StockAnalysisProps {
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: UserSettings;
  onOpenSettings?: () => void;
  // Props for state persistence (Single Stock)
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
  
  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // base64 string
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract analysis logic for reuse
  const performAnalysis = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    onResultUpdate(null);
    setError(null);
    
    const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;

    try {
      let data: AnalysisResult;

      if (selectedImage && currentModel === ModelProvider.GEMINI_INTL) {
         // --- Multimodal Analysis (Image + Text) ---
         if (!settings.geminiKey) {
            throw new Error("图片分析需要 Gemini API Key，请先在设置中配置。");
         }
         data = await fetchStockDetailWithImage(selectedImage, query, currentMarket, settings.geminiKey);
      } else {
         // --- Text Only Analysis ---
         const prompt = `
            请对 ${marketLabel} 的股票 "${query}" 进行深度量化分析。
            特别包含以下深度量化过滤逻辑：
            1. **乖离率 (BIAS) 风险审计**: 请检索该标的的最新 20/60 日均线。如果当前价正乖离过大，请在“风险”部分明确提示追涨风险。
            2. **行业 Beta 过滤**: 分析该股与所属板块的同步性。如果是板块同步回调，请评估支撑位力度，判断是否为“良性洗盘”。
            3. **量量价配合**: 识别是“缩量洗盘”还是“放量派发”。
            
            输出必须包含以下章节（请务必使用 Markdown 标题）:
            1. 基础数据与量化指标 (BIAS/均线)
            2. 关键价位 (支撑、压力、止盈、止损)
            3. 板块 Beta 与洗盘诊断
            4. 量化评级与操作指令
            5. 核心逻辑
         `;
         data = await analyzeWithLLM(currentModel, prompt, false, settings, false, 'day', currentPrice, currentMarket);
      }

      onResultUpdate(data);
    } catch (err: any) {
      setError(err.message || "分析失败，请检查网络或更换模型");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    performAnalysis(savedQuery);
  };

  // Handle Image Selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setSelectedImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Auto-trigger analysis if 'q' param exists and is new
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== savedQuery) {
      onQueryUpdate(q);
      performAnalysis(q);
    }
  }, [searchParams]);

  const extractMetrics = (text: string) => {
    const lines = text.split('\n');
    const metrics: { label: string; value: string }[] = [];
    const others: string[] = [];

    lines.forEach(line => {
      const trimmed = line.trim().replace(/^[-*]\s*/, ''); 
      const match = trimmed.match(/^(\*\*.*?\*\*|[^：:]+?)[:：]\s*(.+)$/);
      
      if (match && trimmed.length < 60) { 
         const rawLabel = match[1].replace(/\*\*/g, '');
         const rawValue = match[2].replace(/\*\*/g, '');
         metrics.push({ label: rawLabel, value: rawValue });
      } else {
         if (trimmed) others.push(line);
      }
    });
    return { metrics, others };
  };

  const formatText = (text: string) => {
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-bold">$1</strong>');
    
    const redKeywords = /(卖出|止损|跌破|风险|高位|放量滞涨|压力|清仓|追涨|正乖离过大|离场)/g;
    const greenKeywords = /(买入|止盈|支撑|反弹|底背离|缩量回调|启动|加仓|洗盘|Alpha走强|低吸)/g; 
    
    formatted = formatted.replace(redKeywords, '<span class="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">$1</span>'); 
    formatted = formatted.replace(greenKeywords, '<span class="text-rose-600 font-bold bg-rose-50 px-1 rounded">$1</span>'); 
    
    return formatted;
  };

  const renderSectionContent = (title: string, body: string) => {
    if (title.includes("基础数据") || title.includes("指标") || title.includes("1.")) {
       const { metrics, others } = extractMetrics(body);
       return (
         <div className="space-y-4">
            {metrics.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {metrics.map((m, i) => (
                   <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="text-xs text-slate-500 mb-1 truncate">{m.label}</div>
                      <div className="text-sm font-bold text-slate-800">{m.value}</div>
                   </div>
                 ))}
              </div>
            )}
            <div className="space-y-2">
               {others.map((line, i) => (
                  <div key={i} className="flex gap-2 items-start">
                     <span className="mt-2 w-1.5 h-1.5 bg-slate-300 rounded-full shrink-0"></span>
                     <p className="text-sm text-slate-600" dangerouslySetInnerHTML={{__html: formatText(line.replace(/^[-*]\s*/, ''))}}></p>
                  </div>
               ))}
            </div>
         </div>
       );
    }

    if (title.includes("Beta") || title.includes("洗盘") || title.includes("诊断") || title.includes("3.")) {
       return (
         <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
            {body.split('\n').filter(l => l.trim()).map((line, i) => (
               <div key={i} className="flex gap-3 items-start">
                  <Compass className="w-4 h-4 text-indigo-500 mt-1 shrink-0" />
                  <p className="text-sm text-slate-700 font-medium" dangerouslySetInnerHTML={{__html: formatText(line.replace(/^[-*]\s*/, ''))}}></p>
               </div>
            ))}
         </div>
       );
    }

    if (title.includes("关键价位") || title.includes("2.")) {
       return (
         <div className="space-y-3">
            {body.split('\n').filter(l => l.trim()).map((line, i) => {
               const cleanLine = line.replace(/^[-*]\s*/, '');
               let Icon = Target;
               let styleClass = "border-l-4 border-slate-300 bg-slate-50";
               if (cleanLine.includes("支撑")) { styleClass = "border-l-4 border-rose-400 bg-rose-50"; Icon = ArrowRightCircle; }
               if (cleanLine.includes("压力") || cleanLine.includes("阻力")) { styleClass = "border-l-4 border-emerald-400 bg-emerald-50"; Icon = ShieldAlert; }
               return (
                  <div key={i} className={`p-3 rounded-r-lg ${styleClass} flex items-start gap-3`}>
                     <Icon className="w-4 h-4 mt-0.5 opacity-70" />
                     <p className="text-sm text-slate-800" dangerouslySetInnerHTML={{__html: formatText(cleanLine)}}></p>
                  </div>
               );
            })}
         </div>
       )
    }

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
    if (sections.length <= 1) {
       return <div className="p-6 text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatText(content.replace(/\n/g, '<br/>')) }} />;
    }
    
    return (
      <div className="grid grid-cols-1 gap-6">
        {sections.map((sec, index) => {
          const lines = sec.trim().split('\n');
          const title = lines[0].trim();
          const body = lines.slice(1).join('\n').trim();

          let Icon = FileText;
          let colorClass = "text-slate-700";
          let borderClass = "border-slate-200";
          
          if (title.includes("基础数据") || title.includes("1.")) { Icon = Activity; colorClass = "text-blue-700"; borderClass = "border-blue-100"; }
          else if (title.includes("关键价位") || title.includes("2.")) { Icon = Target; colorClass = "text-amber-700"; borderClass = "border-amber-100"; }
          else if (title.includes("Beta") || title.includes("洗盘") || title.includes("3.")) { Icon = Compass; colorClass = "text-indigo-700"; borderClass = "border-indigo-100"; }
          else if (title.includes("指令") || title.includes("操作") || title.includes("4.")) { Icon = ArrowRightCircle; colorClass = "text-emerald-700"; borderClass = "border-emerald-100"; }

          return (
            <div key={index} className={`rounded-xl border ${borderClass} shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow`}>
              <div className={`px-6 py-4 border-b ${borderClass} bg-opacity-30 bg-slate-50 flex items-center gap-2`}>
                <Icon className={`w-5 h-5 ${colorClass}`} />
                <h3 className={`font-bold text-lg ${colorClass}`}>{title}</h3>
              </div>
              <div className="p-6">
                 {renderSectionContent(title, body)}
              </div>
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
              placeholder={`输入股票代码或名称...`}
              className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg font-bold"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
            
            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageSelect} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg ${selectedImage ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:bg-slate-100'}`}>
              <Camera className="w-5 h-5" />
            </button>
          </div>

          {selectedImage && (
             <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <div className="relative w-12 h-12 shrink-0 rounded overflow-hidden border">
                   <img src={`data:image/jpeg;base64,${selectedImage}`} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-xs text-indigo-700 font-bold">已启用 K 线形态视觉识别 (自动对齐均线与乖离率)</div>
                <button type="button" onClick={clearImage} className="p-1 hover:bg-red-50 text-red-500 rounded"><X className="w-4 h-4" /></button>
             </div>
          )}
          
          <button type="submit" disabled={loading || !savedQuery} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-md">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '开始深度量化诊断'}
          </button>
        </form>
      </div>

      {savedResult && (
        <div className="bg-slate-50 rounded-xl overflow-hidden animate-slide-up border border-slate-200">
          <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200">
             <h3 className="text-lg font-bold text-slate-900">{savedQuery} 诊断报告</h3>
             <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">
                <AlertCircle className="w-3 h-3" /> 已集成行业 Beta 过滤
             </div>
          </div>
          <div className="p-6 bg-slate-50/50">
             {renderAnalysisContent(savedResult.content)}
          </div>
        </div>
      )}
    </div>
  );
};
