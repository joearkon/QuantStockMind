
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { fetchStockDetailWithImage } from '../services/geminiService'; // New Service
// Added missing Layers import to fix line 280 error
import { Search, Loader2, ArrowRightCircle, Target, ShieldAlert, Settings, FileText, ChevronRight, BarChart2, Activity, DollarSign, Camera, X, Image as ImageIcon, Layers } from 'lucide-react';
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
            请搜索最新的股价数据和基本面信息。
            输出必须包含以下章节（请务必使用 H2 或 H3 Markdown 标题，如 ## 或 ###）:
            1. 基础数据与成交量 (包含实时价、PE、成交放量/缩量状态)
            2. 关键价位 (支撑、压力、止盈、止损)
            3. 量化评级与风险
            4. 操作建议 (加减仓指令)
            5. 核心逻辑

            内容要求：
            - **成交量分析**：必须明确指出“放量”或“缩量”及其技术含义。
            - **操作建议**：必须包含具体的加仓/减仓价格参考。
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

  // --- Render Helpers ---

  // Helper: Try to parse key-value lines for metrics grid
  const extractMetrics = (text: string) => {
    const lines = text.split('\n');
    const metrics: { label: string; value: string }[] = [];
    const others: string[] = [];

    lines.forEach(line => {
      const trimmed = line.trim().replace(/^[-*]\s*/, ''); // remove bullet
      // Regex for "Key: Value" or "**Key**: Value"
      const match = trimmed.match(/^(\*\*.*?\*\*|[^：:]+?)[:：]\s*(.+)$/);
      
      if (match && trimmed.length < 60) { // Limit length to avoid long sentences being treated as metrics
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
    // 1. Bold Keywords
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-bold">$1</strong>');
    
    // 2. Highlight Sentiment/Action words
    const redKeywords = /(卖出|止损|跌破|风险|高位|放量滞涨|压力|清仓)/g;
    const greenKeywords = /(买入|止盈|支撑|反弹|底背离|缩量回调|启动|加仓)/g; 
    
    formatted = formatted.replace(redKeywords, '<span class="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">$1</span>'); 
    formatted = formatted.replace(greenKeywords, '<span class="text-rose-600 font-bold bg-rose-50 px-1 rounded">$1</span>'); 
    
    return formatted;
  };

  const renderSectionContent = (title: string, body: string) => {
    // 1. Base Data & Volume (Grid Layout)
    if (title.includes("基础数据") || title.includes("成交量") || title.includes("盘口") || title.includes("量价") || title.includes("1.")) {
       const { metrics, others } = extractMetrics(body);
       
       return (
         <div className="space-y-4">
            {metrics.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {metrics.map((m, i) => (
                   <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="text-xs text-slate-500 mb-1 truncate" title={m.label}>{m.label}</div>
                      <div className="text-sm font-bold text-slate-800 break-words">{m.value}</div>
                   </div>
                 ))}
              </div>
            )}
            
            <div className="space-y-2">
               {others.map((line, i) => {
                  if (!line.trim()) return null;
                  if (line.includes("成交量") || line.includes("放量") || line.includes("缩量") || line.includes("换手")) {
                     return (
                        <div key={i} className="flex gap-2 items-start bg-blue-50/50 p-2 rounded-lg">
                           <BarChart2 className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                           <p className="text-sm text-slate-700" dangerouslySetInnerHTML={{__html: formatText(line.replace(/^[-*]\s*/, ''))}}></p>
                        </div>
                     )
                  }
                  return (
                     <div key={i} className="flex gap-2 items-start">
                        <span className="mt-2 w-1.5 h-1.5 bg-slate-300 rounded-full shrink-0"></span>
                        <p className="text-sm text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{__html: formatText(line.replace(/^[-*]\s*/, ''))}}></p>
                     </div>
                  );
               })}
            </div>
         </div>
       );
    }

    // 2. Key Levels (Target/Stop)
    if (title.includes("关键价位") || title.includes("技术") || title.includes("2.")) {
       return (
         <div className="space-y-3">
            {body.split('\n').filter(l => l.trim()).map((line, i) => {
               const cleanLine = line.replace(/^[-*]\s*/, '');
               let styleClass = "border-l-4 border-slate-300 bg-slate-50";
               let Icon = Target;
               
               if (cleanLine.includes("支撑")) { styleClass = "border-l-4 border-rose-400 bg-rose-50"; Icon = ArrowRightCircle; }
               if (cleanLine.includes("压力") || cleanLine.includes("阻力")) { styleClass = "border-l-4 border-emerald-400 bg-emerald-50"; Icon = ShieldAlert; }
               if (cleanLine.includes("止损")) { styleClass = "border-l-4 border-slate-500 bg-slate-100"; Icon = ShieldAlert; }
               if (cleanLine.includes("止盈")) { styleClass = "border-l-4 border-rose-500 bg-rose-100"; Icon = DollarSign; }

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

    // Default Render
    return (
       <div className="space-y-2">
          {body.split('\n').filter(l => l.trim()).map((line, i) => (
             <div key={i} className={`flex gap-3 items-start ${line.startsWith('###') ? 'mt-4 mb-2' : ''}`}>
                {!line.startsWith('###') && <span className="mt-2 w-1.5 h-1.5 bg-slate-300 rounded-full shrink-0"></span>}
                {line.startsWith('###') ? (
                   <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                      {line.replace(/###\s*/, '')}
                   </h4>
                ) : (
                   <p className="text-sm text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{__html: formatText(line.replace(/^[-*]\s*/, ''))}}></p>
                )}
             </div>
          ))}
       </div>
    );
  };

  // Main Render Logic for Sections
  const renderAnalysisContent = (content: string) => {
    // 支持 #, ##, ### 等各种 Markdown 标题
    const sections = content.split(/^#+\s+/gm).filter(Boolean);
    
    if (sections.length <= 1) {
       return (
         <div className="prose prose-slate max-w-none p-6" dangerouslySetInnerHTML={{ 
           __html: formatText(content.replace(/\n/g, '<br/>')) 
         }} />
       );
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
          
          if (title.includes("基础数据") || title.includes("成交量") || title.includes("盘口") || title.includes("1.")) { 
             Icon = Activity; colorClass = "text-blue-700"; borderClass = "border-blue-100";
          }
          else if (title.includes("关键价位") || title.includes("技术") || title.includes("2.")) { 
             Icon = Target; colorClass = "text-amber-700"; borderClass = "border-amber-100";
          }
          else if (title.includes("量化评级") || title.includes("风险") || title.includes("基本面") || title.includes("3.")) { 
             Icon = ShieldAlert; colorClass = "text-rose-700"; borderClass = "border-rose-100";
          }
          else if (title.includes("操作建议") || title.includes("4.")) { 
             Icon = ArrowRightCircle; colorClass = "text-emerald-700"; borderClass = "border-emerald-100";
          }
          else if (title.includes("核心逻辑") || title.includes("5.")) {
             Icon = Layers; colorClass = "text-indigo-700"; borderClass = "border-indigo-100";
          }

          return (
            <div key={index} className={`rounded-xl border ${borderClass} shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow`}>
              <div className={`px-6 py-4 border-b ${borderClass} bg-opacity-30 bg-slate-50 flex items-center gap-2`}>
                <div className={`p-1.5 rounded-lg ${borderClass.replace('border', 'bg').replace('100', '50')}`}>
                   <Icon className={`w-5 h-5 ${colorClass}`} />
                </div>
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

  const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* --- SINGLE STOCK VIEW --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Search className="w-6 h-6 text-blue-600"/>
            个股量化诊断 <span className="text-slate-400 text-sm font-normal ml-2">({marketLabel})</span>
        </h2>
        
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto space-y-4">
          <div className="relative">
            <input
              type="text"
              value={savedQuery}
              onChange={(e) => onQueryUpdate(e.target.value)}
              placeholder={`输入${marketLabel}代码或名称...`}
              className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg shadow-inner font-bold text-slate-800 placeholder:font-normal"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
            
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleImageSelect} 
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${selectedImage ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
              title="上传截图以增强分析"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>

          {selectedImage && (
             <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg animate-fade-in">
                <div className="relative w-16 h-16 shrink-0 rounded overflow-hidden border border-indigo-200">
                   <img src={`data:image/jpeg;base64,${selectedImage}`} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                   <p className="text-sm font-bold text-indigo-900 flex items-center gap-1">
                     <ImageIcon className="w-3 h-3" /> 已启用视觉增强分析
                   </p>
                   <p className="text-xs text-indigo-700 mt-0.5">
                     AI 将自动识别图中的形态与量价细节。
                   </p>
                </div>
                <button 
                  type="button" 
                  onClick={clearImage}
                  className="p-1.5 text-indigo-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                   <X className="w-4 h-4" />
                </button>
             </div>
          )}
          
          <div className="flex gap-4">
             <div className="relative flex-1">
                <input 
                  type="text"
                  placeholder="当前参考价 (可选)"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
             </div>
             <button
              type="submit"
              disabled={loading || !savedQuery}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-blue-200"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '开始量化诊断'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {savedResult && (
        <div className="bg-slate-50 rounded-xl overflow-hidden animate-slide-up border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200">
             <div>
                <h3 className="text-lg font-bold text-slate-900">{savedQuery} 诊断报告</h3>
                <p className="text-xs text-slate-400 mt-1">
                   数据由 {savedResult.modelUsed} 生成于 {new Date(savedResult.timestamp).toLocaleTimeString()}
                </p>
             </div>
             <button onClick={() => window.print()} className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded text-xs font-medium hover:bg-slate-100">
               打印报告
             </button>
          </div>

          <div className="p-6 bg-slate-50/50">
             {renderAnalysisContent(savedResult.content)}
          </div>

          {savedResult.groundingSource && savedResult.groundingSource.length > 0 && (
             <div className="px-6 py-4 bg-slate-100/50 border-t border-slate-200 text-xs text-slate-500">
                <strong className="block mb-2 text-slate-700">联网搜索数据源：</strong>
                <div className="flex flex-wrap gap-2">
                   {savedResult.groundingSource.map((s, i) => (
                     <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="inline-flex items-center px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-blue-600">
                        {s.title || "网页来源"} <ChevronRight className="w-3 h-3 ml-1" />
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
