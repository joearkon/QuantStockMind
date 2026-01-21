
import React, { useState, useEffect, useRef } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HoldingsSnapshot, HoldingItemDetailed, JournalEntry, DailyTradingPlan, PlanItem } from '../types';
import { analyzeWithLLM, extractPlanWithLLM } from '../services/llmAdapter';
import { parseBrokerageScreenshot } from '../services/geminiService';
import { analyzeImageWithExternal } from '../services/externalLlmService';
import { 
  Loader2, Camera, X, Layers, ShieldAlert, Zap, Target, Microscope, 
  TrendingUp, Download, Upload, Trash2, History, Info, ChevronRight, Activity, Globe
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
    const saved = localStorage.getItem('qm_journal_pro');
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
  
  useEffect(() => { localStorage.setItem('qm_journal_pro', JSON.stringify(journal)); }, [journal]);
  useEffect(() => { localStorage.setItem('qm_trading_plans', JSON.stringify(tradingPlans)); }, [tradingPlans]);

  const handleImportJournal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          setJournal(data);
          alert("导入成功！");
        }
      } catch (err) { alert("文件格式错误，请确保是导出的 JSON 日志文件。"); }
    };
    reader.readAsText(file);
  };

  const handleExportJournal = () => {
    const blob = new Blob([JSON.stringify(journal, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QuantMind_Journal_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    if (snapshot.holdings.length === 0) { setError("请先上传持仓截图或手动添加标的。"); return; }
    setLoading(true);
    setAnalysisResult(null);
    setError(null);

    // 提取昨日日志作为历史背景
    const lastJournal = journal[0]; 
    const historyData = lastJournal ? `日期: ${new Date(lastJournal.timestamp).toLocaleDateString()}\n昨日复盘核心结论: ${lastJournal.analysis?.content?.substring(0, 500)}...` : undefined;

    const holdingsStr = snapshot.holdings.map((h, i) => 
      `${i+1}. ${h.name}(${h.code}): 成本${h.costPrice}, 现价${h.currentPrice}, 盈亏率${h.profitRate}`
    ).join('\n');

    const prompt = `
      请对以下持仓执行【CQO级量化连续性复盘】。
      昨日计划如上所述，请对比偏差并执行今日审计。
      
      今日持仓状态:
      ${holdingsStr}
      
      要求输出分为：
      ## 1. 连续性对比审计
      分析昨日计划的执行力，今日持仓风险暴露，Beta收益情况。
      ## 2. 大盘趋势概率推演
      给出明日大盘关键的三个阻力位和三个支撑位，以及情绪冰点/高潮预判。
      ## 3. 明日实战作战指令
      具体的个股操作计划，必须有具体的【加仓/减仓价位】。
    `;

    try {
      const result = await analyzeWithLLM(currentModel, prompt, true, settings, false, 'day', undefined, currentMarket, historyData);
      setAnalysisResult(result);
      
      // 提取计划
      const planData = await extractPlanWithLLM(currentModel, result.content, settings);
      const newPlan: DailyTradingPlan = {
        id: crypto.randomUUID(),
        target_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        created_at: Date.now(),
        items: planData.items,
        strategy_summary: planData.summary
      };
      setTradingPlans(prev => [newPlan, ...prev]);

      // 自动保存到日志
      setJournal(prev => [{
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        snapshot: { ...snapshot },
        analysis: result
      }, ...prev]);

    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const sections = analysisResult?.content.split('##').filter(Boolean) || [];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* 1. 量化终端控制台 */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-10 no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4">
              <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-xl">
                <Layers className="w-8 h-8" />
              </div>
              CQO 量化复盘终端
            </h2>
            <p className="text-slate-500 mt-2 font-medium">连续性复盘模式已激活。系统将自动对齐昨日计划并推演明日大盘走势。</p>
          </div>
          <div className="flex flex-wrap gap-2">
             <input type="file" className="hidden" id="journal-import" onChange={handleImportJournal} />
             <label htmlFor="journal-import" className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-all">
                <Upload className="w-4 h-4" /> 导入日志
             </label>
             <button onClick={handleExportJournal} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all">
                <Download className="w-4 h-4" /> 导出
             </button>
             <button 
               onClick={handleDeepReview} 
               disabled={loading || snapshot.holdings.length === 0}
               className="flex items-center gap-3 px-8 py-2 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
             >
               {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldAlert className="w-5 h-5" />}
               {loading ? '专家推演中...' : '开始连续性复盘'}
             </button>
          </div>
        </div>

        {/* 持仓矩阵 */}
        <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-slate-50/50 mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-4">资产标的</th><th className="px-6 py-4 text-right">成本/现价</th><th className="px-6 py-4 text-right">实时盈亏%</th><th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {snapshot.holdings.map((h, i) => (
                <tr key={i} className="hover:bg-white transition-colors group">
                  <td className="px-8 py-4"><div className="font-black text-slate-800">{h.name}</div><div className="text-[10px] text-slate-400 font-mono">{h.code}</div></td>
                  <td className="px-6 py-4 text-right font-bold text-slate-500">¥{h.costPrice}<div className="text-indigo-600">¥{h.currentPrice}</div></td>
                  <td className={`px-6 py-4 text-right font-black ${h.profitRate.includes('-') ? 'text-emerald-500' : 'text-rose-500'}`}>{h.profitRate}</td>
                  <td className="px-6 py-4 text-right"><button onClick={() => setSnapshot(p => ({...p, holdings: p.holdings.filter((_, idx) => idx !== i)}))} className="text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button></td>
                </tr>
              ))}
              {snapshot.holdings.length === 0 && (<tr><td colSpan={4} className="py-12 text-center text-slate-300 font-bold italic">暂无数据，请同步截图或手动添加</td></tr>)}
            </tbody>
          </table>
        </div>
        
        <div className="flex justify-between items-center gap-4 px-4">
           <div className="flex items-center gap-4">
              <input type="file" className="hidden" id="screenshot-up" onChange={handleImageUpload} />
              <label htmlFor="screenshot-up" className="flex items-center gap-2 text-xs font-black text-indigo-600 hover:underline cursor-pointer">
                 {parsing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />} AI 视觉识别截图
              </label>
              <button onClick={() => setSnapshot({...snapshot, holdings: [...snapshot.holdings, { name: "新标的", code: "000000", volume: 0, costPrice: 0, currentPrice: 0, profit: 0, profitRate: "0%", marketValue: 0 }]})} className="text-xs font-black text-slate-400 hover:text-slate-600 transition-colors">+ 手动新增</button>
           </div>
           <div className="text-xs font-black text-slate-400 uppercase">资产总额: ¥{snapshot.totalAssets.toLocaleString()}</div>
        </div>
      </div>

      {/* 复盘报告与昨日对比 */}
      {analysisResult && (
        <div className="space-y-6 animate-slide-up">
           <div className="flex bg-slate-200 p-1 rounded-2xl w-fit">
              <button onClick={() => setActiveTab('audit')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'audit' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>审计与偏差对比</button>
              <button onClick={() => setActiveTab('forecast')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'forecast' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500'}`}>大盘趋势预判</button>
              <button onClick={() => setActiveTab('plan')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'plan' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}>作战实战计划</button>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 md:p-10 min-h-[400px]">
              {activeTab === 'audit' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-indigo-600 mb-4"><Microscope className="w-6 h-6" /><h3 className="text-xl font-black">Audit & Deviation Review</h3></div>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">{sections[0]?.replace(/^.*审计\n/, '')}</div>
                </div>
              )}
              {activeTab === 'forecast' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-rose-600 mb-4"><Globe className="w-6 h-6" /><h3 className="text-xl font-black">Market Forecasting</h3></div>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">{sections[1]?.replace(/^.*推演\n/, '')}</div>
                </div>
              )}
              {activeTab === 'plan' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 text-emerald-600 mb-4"><Target className="w-6 h-6" /><h3 className="text-xl font-black">Tactical Execution</h3></div>
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

      {/* 历史日志快照区 */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white no-print">
         <h3 className="text-xl font-black mb-6 flex items-center gap-3"><History className="w-6 h-6 text-indigo-400" /> 复盘历史日志</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {journal.slice(0, 6).map((entry, idx) => (
               <div key={entry.id} className="p-6 bg-slate-800 rounded-2xl border border-slate-700 hover:border-indigo-500 transition-all cursor-pointer group">
                  <div className="flex justify-between items-center mb-3">
                     <div className="text-xs font-black text-indigo-400">{new Date(entry.timestamp).toLocaleDateString()}</div>
                     <button onClick={(e) => { e.stopPropagation(); setJournal(prev => prev.filter(j => j.id !== entry.id)); }} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="text-sm font-bold text-slate-200 line-clamp-2 mb-4">"{entry.analysis?.content?.substring(0, 100)}..."</div>
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] text-slate-500">资产: ¥{entry.snapshot?.totalAssets?.toLocaleString()}</span>
                     <button onClick={() => { setSnapshot(entry.snapshot); setAnalysisResult(entry.analysis); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-xs text-indigo-400 font-black hover:underline">加载此记录</button>
                  </div>
               </div>
            ))}
            {journal.length === 0 && <div className="md:col-span-3 py-10 text-center text-slate-500 italic">暂无复盘历史</div>}
         </div>
      </div>
    </div>
  );
};
