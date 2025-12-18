
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { fetchStockDetailWithImage } from '../services/geminiService'; // New Service
import { Search, Loader2, ArrowRightCircle, Target, ShieldAlert, Settings, FileText, ChevronRight, BarChart2, Activity, DollarSign, Camera, X, Image as ImageIcon } from 'lucide-react';
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
         // Fix: API key is handled internally via process.env.API_KEY, removed from fetchStockDetailWithImage call
         data = await fetchStockDetailWithImage(selectedImage, query, currentMarket);
      } else {
         // --- Text Only Analysis ---
         const prompt = `
            请对 ${marketLabel} 的股票 "${query}" 进行深度量化分析。
            请搜索最新的股价数据和基本面信息。
            输出必须包含以下章节（请使用 Markdown H2 标题）：
            ## 1. 基础数据与成交量
            ## 2. 关键价位
            ## 3. 量化评级
            ## 4. 操作建议
            ## 5. 核心逻辑

            内容要求：
            - **基础数据**：最新股价、PE(TTM)/Forward PE、PB、近期涨跌幅。
            - **成交量分析 (Volume)**：【重要】请对比今日成交量与近期均量（如5日均量），明确指出是“放量” (Volume Surge) 还是“缩量” (Volume Contraction)。结合股价位置，分析其技术含义（如：高位放量滞涨、缩量回调支撑、底部放量启动等）。
            - **关键价位**：第一止盈价（说明逻辑）、止损价（说明逻辑）、压力位/支撑位。
            - **量化评级**：风险等级(低/中/高)，并列出3个核心风险点。
            - **操作建议**：针对持仓者（止盈/加仓/减仓）和观望者（买入时机）的具体建议。
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
    const redKeywords = /(卖出|止损|跌破|风险|高位|放量滞涨|压力)/g;
    const greenKeywords = /(买入|止盈|支撑|反弹|底背离|缩量回调|启动)/g; // Note: In CN stocks, Red is Up, Green is Down usually, but logic words vary. Let's use neutral colors or standard bullish/bearish.
    
    formatted = formatted.replace(redKeywords, '<span class="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">$1</span>'); // Bearish/Risk
    formatted = formatted.replace(greenKeywords, '<span class="text-rose-600 font-bold bg-rose-50 px-1 rounded">$1</span>'); // Bullish/Opportunity
    
    return formatted;
  };

  const renderSectionContent = (title: string, body: string) => {
    // Strategy: Different layout based on Title

    // 1. Base Data & Volume (Grid Layout)
    if (title.includes("基础数据") || title.includes("成交量") || title.includes("盘口") || title.includes("量价")) {
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
            
            {/* Remaining text (Volume analysis usually) */}
            <div className="space-y-2">
               {others.map((line, i) => {
                  if (!line.trim()) return null;
                  // Highlight Volume specific logic
                  if (line.includes("成交量") || line.includes("放量") || line.includes("缩量") || line.includes("换手")) {
                     return (
                        <div key={i} className="flex gap-2 items-start bg-blue-50/50 p-2 rounded-lg">
                           <BarChart2 className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                           <div className="text-sm text-slate-700" dangerouslySetInnerHTML={{__html: formatText(line.replace(/^[-*]\s*/, ''))}}></div>
                        </div>
                     )
                  }
                  return (
                     <div key={i} className="flex gap-2 items-start">
                        <span className="mt-2 w-1.5 h-1.5 bg-slate-300 rounded-full shrink-0"></span>
                        <div className="text-sm text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{__html: formatText(line.replace(/^[-*]\s*/, ''))}}></div>
                     </div>
                  );
               })}
            </div>
         </div>
       );
    }

    // 2. Key Levels (Target/Stop)
    if (title.includes("关键价位") || title.includes("技术")) {
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
                     <div className="text-sm text-slate-800" dangerouslySetInnerHTML={{__html: formatText(cleanLine)}}></div>
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
                   <div className="text-sm text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{__html: formatText(line.replace(/^[-*]\s*/, ''))}}></div>
                )}
             </div>
          ))}
       </div>
    );
  };

  // Main Render Logic for Sections
  const renderAnalysisContent = (content: string) => {
    const sections = content.split(/^##\s+/gm).filter(Boolean);
    
    // Fallback if no ## headers found
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

          // Custom icons/colors for known sections
          let Icon = FileText;
          let colorClass = "text-slate-700";
          let borderClass = "border-slate-200";
          
          if (title.includes("基础数据") || title.includes("成交量") || title.includes("盘口")) { 
             Icon = Activity; colorClass = "text-blue-700"; borderClass = "border-blue-100";
          }
          else if (title.includes("关键价位") || title.includes("技术")) { 
             Icon = Target; colorClass = "text-amber-700"; borderClass = "border-amber-100";
          }
          else if (title.includes("量化评级") || title.includes("风险") || title.includes("基本面")) { 
             Icon = ShieldAlert; colorClass = "text-rose-700"; borderClass = "border-rose-100";
          }
          else if (title.includes("操作建议")) { 
             Icon = ArrowRightCircle; colorClass = "text-emerald-700"; borderClass = "border-emerald-100";
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
          
          {/* Main Input + Camera Button */}
          <div className="relative">
            <input
              type="text"
              value={savedQuery}
              onChange={(e) => onQueryUpdate(e.target.value)}
              placeholder={`输入${marketLabel}代码或名称...`}
              className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-5