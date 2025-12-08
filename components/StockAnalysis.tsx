
import React, { useState } from 'react';
import { ModelProvider, AnalysisResult, UserSettings } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { Search, Loader2, ArrowRightCircle, Target, ShieldAlert, TrendingUp, Settings } from 'lucide-react';

interface StockAnalysisProps {
  currentModel: ModelProvider;
  settings: UserSettings;
  onOpenSettings?: () => void;
}

export const StockAnalysis: React.FC<StockAnalysisProps> = ({ currentModel, settings, onOpenSettings }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      const prompt = `
        请对A股股票 "${query}" 进行深度量化分析。
        请搜索最新的股价数据和基本面信息。
        输出必须包含：
        1. **基础数据**：最新股价、PE(TTM)、PB、近期涨跌幅。
        2. **关键价位**：
           - 第一止盈价（说明逻辑）
           - 止损价（说明逻辑）
           - 压力位/支撑位
        3. **量化评级**：风险等级(低/中/高)，并列出3个核心风险点。
        4. **操作建议**：
           - 持仓者建议（止盈/加仓/减仓）
           - 观望者建议（买入时机/价格区间）
      `;
      // Pass settings so the adapter can find the API keys
      const data = await analyzeWithLLM(currentModel, prompt, false, settings);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "分析失败，请检查网络或更换模型");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search Input */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-600"/>
            个股量化诊断
        </h2>
        
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入股票代码 (如 600519) 或 名称 (如 贵州茅台)"
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg shadow-inner"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
            <button
              type="submit"
              disabled={loading || !query}
              className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '开始诊断'}
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-500 text-center">
            支持模糊搜索，自动匹配A股标的。AI将结合最新市场行情进行分析。
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
          {onOpenSettings && (
            error.includes('Key') || 
            error.includes('配置') || 
            error.includes('余额') ||
            error.includes('401') ||
            error.includes('402')
          ) && (
            <button 
              onClick={onOpenSettings}
              className="px-3 py-1 bg-white border border-red-200 text-red-600 text-sm rounded shadow-sm hover:bg-red-50 flex items-center gap-1 whitespace-nowrap"
            >
              <Settings className="w-3 h-3" />
              检查配置
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-100 flex justify-between items-center">
             <div>
                <h3 className="text-lg font-bold text-slate-800">分析报告: {query}</h3>
                <p className="text-xs text-slate-500 mt-1">
                   模型: {result.modelUsed} | 时间: {new Date(result.timestamp).toLocaleString()}
                </p>
             </div>
             <button onClick={() => window.print()} className="text-sm text-blue-600 hover:underline">
               导出报告
             </button>
          </div>

          <div className="p-8">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2 text-blue-700 font-semibold">
                        <TrendingUp className="w-4 h-4" /> 走势研判
                    </div>
                    <p className="text-sm text-blue-900 opacity-80">
                        AI正在根据技术指标(MACD/KDJ)分析短期与中期趋势...
                        <br/>
                        <span className="text-xs text-blue-500">(详见下方详细报告)</span>
                    </p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                    <div className="flex items-center gap-2 mb-2 text-amber-700 font-semibold">
                        <Target className="w-4 h-4" /> 关键点位
                    </div>
                    <p className="text-sm text-amber-900 opacity-80">
                        压力位与支撑位计算基于筹码分布与均线系统...
                         <br/>
                        <span className="text-xs text-amber-500">(详见下方详细报告)</span>
                    </p>
                </div>
                <div className="bg-rose-50 rounded-lg p-4 border border-rose-100">
                    <div className="flex items-center gap-2 mb-2 text-rose-700 font-semibold">
                        <ShieldAlert className="w-4 h-4" /> 风险评级
                    </div>
                    <p className="text-sm text-rose-900 opacity-80">
                        综合基本面与消息面评估持仓风险...
                         <br/>
                        <span className="text-xs text-rose-500">(详见下方详细报告)</span>
                    </p>
                </div>
             </div>

             <div className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-strong:text-slate-900">
                {/* Render content */}
                {result.content.split('\n').map((line, idx) => {
                  // Basic markdown rendering
                  if (line.trim().startsWith('###')) return <h3 key={idx} className="text-xl font-bold mt-6 mb-3 pb-2 border-b border-slate-100">{line.replace(/#/g, '')}</h3>;
                  if (line.trim().startsWith('####')) return <h4 key={idx} className="text-lg font-semibold mt-4 mb-2 text-indigo-700">{line.replace(/#/g, '')}</h4>;
                  if (line.trim().startsWith('-')) return <li key={idx} className="ml-4 list-disc text-slate-700 my-1">{line.replace('-', '')}</li>;
                  if (line.trim().match(/^\d\./)) return <li key={idx} className="ml-4 list-decimal text-slate-700 my-1 font-medium">{line}</li>;
                  return <p key={idx} className="text-slate-600 leading-relaxed mb-2">{line}</p>;
                })}
             </div>

             {result.groundingSource && result.groundingSource.length > 0 && (
                <div className="mt-8 p-4 bg-slate-50 rounded-lg text-xs text-slate-500">
                   <strong>数据来源：</strong>
                   <ul className="list-disc ml-4 mt-2">
                      {result.groundingSource.map((s, i) => (
                        <li key={i}><a href={s.uri} target="_blank" className="text-blue-500 hover:underline">{s.title || s.uri}</a></li>
                      ))}
                   </ul>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};
