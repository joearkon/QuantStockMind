
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { fetchStockDetailWithImage } from '../services/geminiService';
import { Search, Loader2, ArrowRightCircle, Target, ShieldAlert, FileText, ChevronRight, BarChart2, Activity, DollarSign, Camera, X, Image as ImageIcon } from 'lucide-react';
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
         data = await fetchStockDetailWithImage(selectedImage, query, currentMarket);
      } else {
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
            - **成交量分析 (Volume)**：必须对比今日成交量与近期均量，指出是“放量”还是“缩量”。
            - **关键价位**：第一止盈价、止损价、压力位/支撑位。
            - **量化评级**：风险等级(低/中/高)，列出3个核心风险点。
            - **操作建议**：针对持仓者和观望者的具体建议。
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
    const redKeywords = /(卖出|止损|跌破|风险|高位|放量滞涨|压力)/g;
    const greenKeywords = /(买入|止盈|支撑|反弹|底背离|缩量回调|启动)/g;
    formatted = formatted.replace(redKeywords, '<span class="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">$1</span>');
    formatted = formatted.replace(greenKeywords, '<span class="text-rose-600 font-bold bg-rose-50 px-1 rounded">$1</span>');
    return formatted;
  };

  const renderSectionContent = (title: string, body: string) => {
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
            <div className="space-y-2">
               {others.map((line, i) => {
                  if (!line.trim()) return null;
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

  const renderAnalysisContent = (content: string) => {
    const sections = content.split(/^##\s+/gm).filter(Boolean);
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
          if (title.includes("基础数据") || title.includes("成交量") || title.includes("盘口")) { Icon = Activity; colorClass = "text-blue-700"; borderClass = "border-blue-100"; }
          else if (title.includes("关键价位") || title.includes("技术")) { Icon = Target; colorClass = "text-amber-700"; borderClass = "border-amber-100"; }
          else if (title.includes("量化评级") || title.includes("风险") || title.includes("基本面")) { Icon = ShieldAlert; colorClass = "text-rose-700"; borderClass = "border-rose-100"; }
          else if (title.includes("操作建议")) { Icon = ArrowRightCircle; colorClass = "text-emerald-700"; borderClass = "border-emerald-100"; }
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
              className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-inner"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${selectedImage ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:bg-slate-100'}`}
              title="上传K线图进行视觉分析 (仅限Gemini)"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
          </div>

          {selectedImage && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100 animate-fade-in">
              <ImageIcon className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-blue-700 font-medium truncate flex-1">已加载K线图截图</span>
              <button type="button" onClick={clearImage} className="p-1 hover:bg-blue-100 rounded text-blue-500"><X className="w-4 h-4" /></button>
            </div>
          )}

          <div className="flex gap-3">
             <div className="relative flex-1">
                <input
                  type="number"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  placeholder="当前价格 (可选)"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
             </div>
             <button
              type="submit"
              disabled={loading || !savedQuery}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-50 min-w-[140px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {loading ? '分析中...' : '深度诊断'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-700 animate-fade-in">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {savedResult && (
        <div className="animate-slide-up pb-12">
          {renderAnalysisContent(savedResult.content)}
        </div>
      )}
    </div>
  );
};
