
import React, { useState, useEffect, useRef } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HoldingsSnapshot, HoldingItemDetailed, JournalEntry, PeriodicReviewData, DailyTradingPlan, PlanItem } from '../types';
import { analyzeWithLLM, extractPlanWithLLM } from '../services/llmAdapter';
import { parseBrokerageScreenshot } from '../services/geminiService';
import { analyzeImageWithExternal } from '../services/externalLlmService';
import { 
  Loader2, Camera, X, Layers, ShieldAlert, Zap, Target, Microscope, 
  TrendingUp, Activity, ArrowRight, Gauge, Lock, Info, CheckCircle2, History
} from 'lucide-react';

interface HoldingsReviewProps {
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: UserSettings;
  onOpenSettings?: () => void;
}

export const HoldingsReview: React.FC<HoldingsReviewProps> = ({
  currentModel,
  currentMarket,
  settings,
  onOpenSettings
}) => {
  const [snapshot, setSnapshot] = useState<HoldingsSnapshot>({
    totalAssets: 0,
    positionRatio: 0, 
    date: new Date().toISOString().split('T')[0],
    holdings: []
  });
  
  const [journal, setJournal] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem('qm_journal');
    return saved ? JSON.parse(saved) : [];
  });

  const [tradingPlans, setTradingPlans] = useState<DailyTradingPlan[]>(() => {
    const saved = localStorage.getItem('qm_trading_plans');
    return saved ? JSON.parse(saved) : [];
  });

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'audit' | 'forecast' | 'plan'>('audit');
  
  useEffect(() => { localStorage.setItem('qm_journal', JSON.stringify(journal)); }, [journal]);
  useEffect(() => { localStorage.setItem('qm_trading_plans', JSON.stringify(tradingPlans)); }, [tradingPlans]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        let parsedData = currentModel === ModelProvider.HUNYUAN_CN 
          ? await analyzeImageWithExternal(ModelProvider.HUNYUAN_CN, base64, settings.hunyuanKey!)
          : await parseBrokerageScreenshot(base64, settings.geminiKey);
        setSnapshot({ ...parsedData, holdings: parsedData.holdings.map(h => ({ ...h, horizon: 'medium' })) });
        setParsing(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) { setError(err.message); setParsing(false); }
  };

  const handleDeepReview = async () => {
    if (snapshot.holdings.length === 0) { setError("持仓列表为空，请先添加标的或上传截图。"); return; }
    setLoading(true);
    setAnalysisResult(null);
    setError(null);

    const holdingsStr = snapshot.holdings.map((h, i) => 
      `${i+1}. ${h.name}(${h.code}): 成本${h.costPrice}, 现价${h.currentPrice}, 盈亏率${h.profitRate}`
    ).join('\n');

    const prompt = `
      作为首席量化投资官，请对以下持仓执行【专业复盘推演】。
      
      当前持仓快照:
      ${holdingsStr}
      
      报告结构要求 (必须包含以下三部分，用 ## 分隔)：
      ## 1. 量化风险审计
      分析持仓的盈亏质量、风险集中度、个股量价是否产生严重背离。
      ## 2. 大盘走势推演
      结合当前标的所属板块，推演明日大盘的关键压力与支撑位。
      ## 3. 明日作战计划
      给出具体的加减仓建议，并列出每一只标的的【触发价位】。
    `;

    try {
      const result = await analyzeWithLLM(currentModel, prompt, true, settings, false, 'day', undefined, currentMarket);
      setAnalysisResult(result);
      
      // 联动：自动提取明日计划
      const planData = await extractPlanWithLLM(currentModel, result.content, settings);
      const newPlan: DailyTradingPlan = {
        id: crypto.randomUUID(),
        target_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        created_at: Date.now(),
        items: planData.items,
        strategy_summary: planData.summary
      };
      setTradingPlans(prev => [newPlan, ...prev]);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const sections = analysisResult?.content.split('##').filter(Boolean) || [];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* 1. 量化终端控制台 */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100">
                <Layers className="w-8 h-8" />
              </div>
              专业持仓复盘终端
            </h2>
            <p className="text-slate-500 mt-2 font-medium">QuantMind CQO 模式已启用。支持 AI 视觉对齐与大盘走势概率推演。</p>
          </div>
          <div className="flex gap-3">
             <input type="file" className="hidden" id="review-upload" onChange={handleImageUpload} />
             <label htmlFor="review-upload" className="flex items-center gap-3 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black cursor-pointer transition-all active:scale-95">
               {parsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
               {parsing ? '智能提取中...' : '同步持仓截图'}
             </label>
             <button 
               onClick={handleDeepReview} 
               disabled={loading || snapshot.holdings.length === 0}
               className="flex items-center gap-3 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
             >
               {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldAlert className="w-5 h-5" />}
               开始深度推演
             </button>
          </div>
        </div>

        {/* 2. 实时持仓矩阵 */}
        <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-slate-50/50 mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-4">标的资产</th><th className="px-6 py-4 text-right">预估成本</th><th className="px-6 py-4 text-right">实时现价</th><th className="px-6 py-4 text-right">盈亏效率</th><th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {snapshot.holdings.map((h, i) => (
                <tr key={i} className="hover:bg-white transition-colors group">
                  <td className="px-8 py-4">
                    <div className="font-black text-slate-800">{h.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{h.code}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-500">¥{h.costPrice}</td>
                  <td className="px-6 py-4 text-right font-black text-indigo-600">¥{h.currentPrice}</td>
                  <td className={`px-6 py-4 text-right font-black ${h.profitRate.includes('-') ? 'text-emerald-500' : 'text-rose-500'}`}>{h.profitRate}</td>
                  <td className="px-6 py-4 text-right"><button onClick={() => setSnapshot(p => ({...p, holdings: p.holdings.filter((_, idx) => idx !== i)}))} className="text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button></td>
                </tr>
              ))}
              {snapshot.holdings.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-slate-300 font-bold italic">暂无资产数据，请同步截图或手动添加</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center px-4">
           <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
              <Info className="w-4 h-4" /> 资产总计: ¥{snapshot.totalAssets.toLocaleString()} | 仓位: {snapshot.positionRatio}%
           </div>
           <button onClick={() => setSnapshot({...snapshot, holdings: [...snapshot.holdings, { name: "新标的", code: "000000", volume: 0, costPrice: 0, currentPrice: 0, profit: 0, profitRate: "0%", marketValue: 0 }]})} className="text-xs font-black text-indigo-600 hover:underline">+ 增补标的</button>
        </div>
      </div>

      {/* 3. 复盘结果展示面板 */}
      {analysisResult && (
        <div className="space-y-6 animate-slide-up">
           <div className="flex bg-slate-200 p-1 rounded-2xl w-fit">
              <button onClick={() => setActiveTab('audit')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'audit' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>量化风险审计</button>
              <button onClick={() => setActiveTab('forecast')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'forecast' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500'}`}>大盘走势预判</button>
              <button onClick={() => setActiveTab('plan')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'plan' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}>结构化实战计划</button>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 md:p-10 min-h-[400px]">
              {activeTab === 'audit' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-indigo-600 mb-4"><Microscope className="w-6 h-6" /><h3 className="text-xl font-black">Quantitative Audit</h3></div>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">{sections[0]?.replace(/^.*审计\n/, '')}</div>
                </div>
              )}
              {activeTab === 'forecast' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-rose-600 mb-4"><TrendingUp className="w-6 h-6" /><h3 className="text-xl font-black">Market Forecast</h3></div>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">{sections[1]?.replace(/^.*推演\n/, '')}</div>
                </div>
              )}
              {activeTab === 'plan' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 text-emerald-600 mb-4"><Target className="w-6 h-6" /><h3 className="text-xl font-black">Tactical Plan</h3></div>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-wrap font-medium mb-8">{sections[2]?.replace(/^.*计划\n/, '')}</div>
                  
                  {tradingPlans[0] && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8 border-t border-slate-100">
                      {tradingPlans[0].items.map((it, idx) => (
                        <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-emerald-300 transition-all">
                          <div>
                            <div className="font-black text-slate-800 text-lg">{it.symbol}</div>
                            <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded inline-block mt-1 ${
                              it.action === 'buy' ? 'bg-rose-100 text-rose-600' : it.action === 'sell' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                            }`}>{it.action} @ {it.price_target || '实价'}</div>
                          </div>
                          <div className="text-xs text-slate-500 font-bold max-w-[180px] text-right italic">"{it.reason}"</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
           </div>
        </div>
      )}

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 font-bold flex items-center gap-3">
          <ShieldAlert className="w-6 h-6" /> {error}
        </div>
      )}
    </div>
  );
};
