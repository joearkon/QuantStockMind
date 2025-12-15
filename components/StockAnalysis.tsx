import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { Search, Loader2, ArrowRightCircle, Target, ShieldAlert, TrendingUp, Settings, FileText, ChevronRight } from 'lucide-react';
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

  // Extract analysis logic for reuse
  const performAnalysis = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    onResultUpdate(null);
    setError(null);
    
    const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;

    try {
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
      const data = await analyzeWithLLM(currentModel, prompt, false, settings, false, 'day', currentPrice, currentMarket);
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

  // Auto-trigger analysis if 'q' param exists and is new
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== savedQuery) {
      onQueryUpdate(q);
      performAnalysis(q);
    }
  }, [searchParams]); // Depend on searchParams

  // Helper to render sections cleanly
  const renderAnalysisContent = (content: string) => {
    const sections = content.split(/^##\s+/gm).filter(Boolean);
    
    // Fallback if no ## headers found
    if (sections.length <= 1) {
       return (
         <div className="prose prose-slate max-w-none prose-p:text-slate-700 prose-headings:text-slate-900" dangerouslySetInnerHTML={{ 
           __html: content.replace(/\n/g, '<br/>') 
         }} />
       );
    }
    
    return (
      <div className="space-y-6">
        {sections.map((sec, index) => {
          const lines = sec.trim().split('\n');
          const title = lines[0];
          const body = lines.slice(1).join('\n');

          // Custom icons/colors for known sections
          let Icon = FileText;
          let colorClass = "text-slate-800";
          let bgClass = "bg-white";
          
          if (title.includes("基础数据")) { Icon = TrendingUp; colorClass = "text-blue-600"; }
          else if (title.includes("关键价位")) { Icon = Target; colorClass = "text-amber-600"; }
          else if (title.includes("量化评级") || title.includes("风险")) { Icon = ShieldAlert; colorClass = "text-rose-600"; }
          else if (title.includes("操作建议") || title.includes("核心逻辑")) { Icon = ArrowRightCircle; colorClass = "text-emerald-600"; }

          return (
            <div key={index} className={`rounded-xl border border-slate-200 shadow-sm overflow-hidden ${bgClass}`}>
              <div className="bg-slate-50/80 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                <Icon className={`w-5 h-5 ${colorClass}`} />
                <h3 className={`font-bold text-lg ${colorClass}`}>{title}</h3>
              </div>
              <div className="p-6 prose prose-slate max-w-none prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-strong:text-slate-900 prose-strong:font-bold">
                 {body.split('\n').map((line, i) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <div key={i} className="h-2"></div>;
                    
                    if (trimmed.startsWith('-') || trimmed.startsWith('* ')) {
                      return (
                        <div key={i} className="flex gap-2 mb-2 items-start">
                           <span className="text-slate-400 mt-1.5 w-1.5 h-1.5 bg-slate-400 rounded-full flex-shrink-0"></span>
                           <span className="flex-1 text-slate-700" dangerouslySetInnerHTML={{
                             __html: trimmed.replace(/^[-*]\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>')
                           }}></span>
                        </div>
                      );
                    }
                    if (trimmed.startsWith('###')) {
                       return <h4 key={i} className="text-md font-bold text-slate-800 mt-4 mb-2">{trimmed.replace(/###\s*/, '')}</h4>
                    }
                    return (
                      <p key={i} className="mb-2 text-slate-600" dangerouslySetInnerHTML={{
                          __html: trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>')
                      }}></p>
                    );
                 })}
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
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg shadow-inner font-bold text-slate-800 placeholder:font-normal"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
          </div>
          
          <div className="flex gap-4">
             <div className="relative flex-1">
                <input 
                  type="text"
                  placeholder="当前价格 (可选)"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                   防止数据延迟
                </div>
             </div>
             <button
              type="submit"
              disabled={loading || !savedQuery}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-blue-200"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '开始深度诊断'}
            </button>
          </div>
          <p className="text-sm text-slate-500 text-center pt-2">
             AI将结合最新互联网信息对 {marketLabel} 标的进行分析。
          </p>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between text-red-700">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            <div className="text-sm">
               <span className="font-semibold block">分析中断</span>
               {error}
            </div>
          </div>
          {onOpenSettings && (error.includes('Key') || error.includes('余额')) && (
            <button onClick={onOpenSettings} className="px-3 py-1 bg-white border border-red-200 text-red-600 text-sm rounded hover:bg-red-50 flex items-center gap-1">
              <Settings className="w-3 h-3" />
              检查配置
            </button>
          )}
        </div>
      )}

      {/* Results Display */}
      {savedResult && (
        <div className="bg-slate-50 rounded-xl overflow-hidden animate-slide-up border border-slate-200 shadow-sm">
          {/* Result Header */}
          <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200">
             <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                   {savedQuery}
                   <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-500 font-normal border border-slate-200">
                      个股诊断
                   </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                   生成时间: {new Date(savedResult.timestamp).toLocaleString()}
                </p>
             </div>
             <button onClick={() => window.print()} className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded text-xs font-medium hover:bg-slate-100">
               导出
             </button>
          </div>

          {/* Result Body */}
          <div className="p-6">
             {renderAnalysisContent(savedResult.content)}
          </div>

          {/* Sources Footer */}
          {savedResult.groundingSource && savedResult.groundingSource.length > 0 && (
             <div className="px-6 py-4 bg-slate-100/50 border-t border-slate-200 text-xs text-slate-500">
                <strong className="block mb-2 text-slate-700">参考数据来源：</strong>
                <div className="flex flex-wrap gap-2">
                   {savedResult.groundingSource.map((s, i) => (
                     <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="inline-flex items-center px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-blue-600 transition-colors">
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