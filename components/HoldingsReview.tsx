
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HoldingsSnapshot, HoldingItemDetailed, JournalEntry, DailyTradingPlan, PlanItem, PeriodicReviewData } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { parseBrokerageScreenshot, extractTradingPlan, fetchPeriodicReview } from '../services/geminiService';
import { Upload, Loader2, Save, Download, UploadCloud, History, Trash2, Camera, Edit2, Check, X, TrendingUp, AlertTriangle, Activity, Target, ClipboardList, Calendar, ChevronLeft, ChevronRight, Filter, ListTodo, Clock, FileText, FileDown, Share2, Printer, CheckCircle2, ArrowRightLeft, MoveRight, BarChart3, ShieldCheck, Zap, AlertCircle } from 'lucide-react';

const ITEMS_PER_PAGE_JOURNAL = 5;
const ITEMS_PER_PAGE_PLAN = 3;

export const HoldingsReview: React.FC<{
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: UserSettings;
  onOpenSettings?: () => void;
}> = ({ currentModel, currentMarket, settings, onOpenSettings }) => {
  // --- States ---
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
  const [periodicReview, setPeriodicReview] = useState<PeriodicReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [periodicLoading, setPeriodicLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [journalPage, setJournalPage] = useState(1);
  const [journalDateFilter, setJournalDateFilter] = useState('');
  const [planPage, setPlanPage] = useState(1);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence ---
  useEffect(() => { localStorage.setItem('qm_journal', JSON.stringify(journal)); }, [journal]);
  useEffect(() => { localStorage.setItem('qm_trading_plans', JSON.stringify(tradingPlans)); }, [tradingPlans]);

  // --- Derived Data ---
  const filteredJournal = useMemo(() => {
    let result = [...journal];
    if (journalDateFilter) {
      result = result.filter(entry => new Date(entry.timestamp).toISOString().split('T')[0] === journalDateFilter);
    }
    return result;
  }, [journal, journalDateFilter]);

  const totalJournalPages = Math.ceil(filteredJournal.length / ITEMS_PER_PAGE_JOURNAL);
  const currentJournalItems = filteredJournal.slice((journalPage - 1) * ITEMS_PER_PAGE_JOURNAL, journalPage * ITEMS_PER_PAGE_JOURNAL);

  const totalPlanPages = Math.ceil(tradingPlans.length / ITEMS_PER_PAGE_PLAN);
  const currentPlanItems = tradingPlans.slice((planPage - 1) * ITEMS_PER_PAGE_PLAN, planPage * ITEMS_PER_PAGE_PLAN);

  // --- Handlers ---
  const handlePeriodicReview = async (type: 'week' | 'month') => {
    const days = type === 'week' ? 7 : 30;
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentLogs = journal.filter(entry => entry.timestamp >= cutoff);

    if (recentLogs.length < 2) {
      alert(`历史记录不足（当前仅 ${recentLogs.length} 条），无法进行周期性趋势分析。请先进行更多日常复盘并存档。`);
      return;
    }

    setPeriodicLoading(true);
    setPeriodicReview(null);
    try {
      const result = await fetchPeriodicReview(recentLogs, type === 'week' ? '周度' : '月度', currentMarket, settings.geminiKey);
      if (result.periodicData) {
        setPeriodicReview(result.periodicData);
        // Scroll to results
        setTimeout(() => {
          document.getElementById('periodic-review-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err: any) {
      setError("周期性总结失败: " + err.message);
    } finally {
      setPeriodicLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        try {
          const parsedData = await parseBrokerageScreenshot(base64String, settings.geminiKey);
          setSnapshot({ ...parsedData, date: new Date().toISOString().split('T')[0] });
        } catch (err: any) { setError("截图解析失败，请检查配置。"); }
        finally { setParsing(false); }
      };
      reader.readAsDataURL(file);
    } catch (err) { setParsing(false); setError("文件读取失败"); }
  };

  const handleAnalyze = async () => {
    if (snapshot.holdings.length === 0) { setError("持仓列表为空"); return; }
    setLoading(true);
    setAnalysisResult(null);
    setError(null);
    try {
      const prompt = `请深度复盘我的 A 股持仓：${JSON.stringify(snapshot.holdings)}。资产：${snapshot.totalAssets}。
      [要求]: 使用 Markdown H2 标题分段。重点词汇请加粗。给出具体的止盈止损和调仓逻辑。`;
      const result = await analyzeWithLLM(currentModel, prompt, true, settings, false, 'day', undefined, currentMarket);
      setAnalysisResult(result);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleGeneratePlan = async () => {
    if (!analysisResult) return;
    setGeneratingPlan(true);
    try {
      const { items, summary } = await extractTradingPlan(analysisResult.content, settings.geminiKey);
      const newPlan: DailyTradingPlan = {
        id: crypto.randomUUID(),
        target_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        created_at: Date.now(),
        items,
        strategy_summary: summary
      };
      setTradingPlans(prev => [newPlan, ...prev]);
      setPlanPage(1);
      setIsPlanOpen(true);
    } catch (err: any) { setError("交易计划生成失败"); }
    finally { setGeneratingPlan(false); }
  };

  const saveToJournal = () => {
    if (!analysisResult) return;
    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      snapshot: { ...snapshot },
      analysis: analysisResult
    };
    setJournal(prev => [newEntry, ...prev]);
    alert("已成功存档至复盘历史库！");
  };

  // --- Export Logic ---
  const exportPlanMD = (plan: DailyTradingPlan) => {
    let md = `# QuantMind 交易执行计划 (${plan.target_date})\n\n`;
    md += `> **核心策略总结**: ${plan.strategy_summary}\n\n`;
    md += `| 股票标的 | 操作指令 | 目标价格 | 核心理由 | 状态 |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    plan.items.forEach(item => {
      md += `| ${item.symbol} | ${item.action.toUpperCase()} | ${item.price_target || '--'} | ${item.reason || '--'} | ${item.status} |\n`;
    });
    md += `\n---\n*报告生成时间: ${new Date(plan.created_at).toLocaleString()}*`;
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TradingPlan_${plan.target_date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPlanDoc = (plan: DailyTradingPlan) => {
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>交易计划</title><style>
        body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style></head>
      <body>
        <h1>明日交易执行计划 - ${plan.target_date}</h1>
        <p><strong>策略摘要：</strong>${plan.strategy_summary}</p>
        <table>
          <thead><tr><th>标的</th><th>动作</th><th>目标价</th><th>理由</th></tr></thead>
          <tbody>
            ${plan.items.map(i => `<tr><td>${i.symbol}</td><td>${i.action}</td><td>${i.price_target}</td><td>${i.reason}</td></tr>`).join('')}
          </tbody>
        </table>
      </body></html>
    `;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TradingPlan_${plan.target_date}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJournalJSON = () => {
    const dataStr = JSON.stringify(journal, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MarketJournal_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importJournalJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) { setJournal(imported); alert("导入成功！"); }
      } catch (e) { alert("文件解析失败"); }
    };
    reader.readAsText(file);
  };

  const deletePlan = (id: string) => { setTradingPlans(prev => prev.filter(p => p.id !== id)); };

  // --- Render Helpers ---
  const renderAnalysisReport = (content: string) => {
    const sections = content.split(/^##\s+/gm).filter(Boolean);
    return (
      <div className="space-y-6 p-8 bg-slate-50/30">
        {sections.map((sec, idx) => {
          const lines = sec.trim().split('\n');
          const title = lines[0].trim();
          const body = lines.slice(1).join('\n').trim();
          return (
            <div key={idx} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 group hover:shadow-md transition-shadow">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                {title}
              </h3>
              <div className="space-y-3">
                {body.split('\n').map((line, i) => {
                   const trimmed = line.trim();
                   if (!trimmed) return <div key={i} className="h-2" />;
                   let formattedLine = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-bold">$1</strong>');
                   const upWords = /(买入|支撑|放量|拉升|突破|反弹|加仓|多头|机会)/g;
                   const downWords = /(卖出|压力|缩量|回踩|跌破|回调|减仓|空头|风险)/g;
                   formattedLine = formattedLine.replace(upWords, '<span class="text-rose-600 font-bold">$1</span>');
                   formattedLine = formattedLine.replace(downWords, '<span class="text-emerald-600 font-bold">$1</span>');
                   return (
                     <div key={i} className="flex gap-3 items-start">
                        <span className="mt-2 w-1.5 h-1.5 bg-blue-200 rounded-full shrink-0" />
                        <p className="text-slate-600 leading-relaxed text-sm flex-1" dangerouslySetInnerHTML={{ __html: formattedLine }} />
                     </div>
                   );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* --- Main Dashboard --- */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tighter">
              <UploadCloud className="w-8 h-8 text-blue-600" />
              智能持仓诊断系统
            </h2>
            <p className="text-slate-400 text-xs mt-2 uppercase font-black tracking-widest">A-Share Portfolio Diagnostic & Strategy Engine</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
              <button onClick={() => handlePeriodicReview('week')} disabled={periodicLoading} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 rounded-lg flex items-center gap-2">
                {periodicLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                周度复盘
              </button>
              <button onClick={() => handlePeriodicReview('month')} disabled={periodicLoading} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 rounded-lg flex items-center gap-2 border-l border-slate-200">
                月度复盘
              </button>
            </div>
            <button onClick={() => setIsPlanOpen(!isPlanOpen)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all">
              <ListTodo className="w-4 h-4" /> 策略指令库
            </button>
            <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all">
              <History className="w-4 h-4" /> 历史存档
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-100 transition-all active:scale-95">
              {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {parsing ? '正在解析' : '识别持仓'}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>
        </div>

        {/* --- History Library (Journal Drawer) --- */}
        {isHistoryOpen && (
          <div className="mb-10 p-8 bg-slate-50 rounded-[2rem] border border-slate-200 animate-slide-down shadow-inner">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
              <h3 className="font-black text-slate-700 flex items-center gap-2 uppercase tracking-widest text-xs">
                <Clock className="w-4 h-4 text-slate-400" /> 复盘历史存档
              </h3>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <input type="date" value={journalDateFilter} onChange={e => {setJournalDateFilter(e.target.value); setJournalPage(1);}} className="text-xs bg-transparent border-none focus:ring-0 text-slate-600" />
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => importInputRef.current?.click()} className="text-[10px] font-black uppercase tracking-widest px-3 py-2 bg-white border rounded-lg">Import</button>
                    <button onClick={exportJournalJSON} className="text-[10px] font-black uppercase tracking-widest px-3 py-2 bg-white border rounded-lg">Export</button>
                    <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={importJournalJSON} />
                 </div>
              </div>
            </div>
            
            <div className="space-y-3">
              {currentJournalItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm border-2 border-dashed rounded-3xl">无记录</div>
              ) : (
                currentJournalItems.map(entry => (
                  <div key={entry.id} onClick={() => { setSnapshot(entry.snapshot); setAnalysisResult(entry.analysis); setIsHistoryOpen(false); }} className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 cursor-pointer transition-all flex justify-between items-center group shadow-sm">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all"><Calendar className="w-5 h-5" /></div>
                      <div>
                        <div className="text-sm font-black text-slate-800">{new Date(entry.timestamp).toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400 font-bold">¥{entry.snapshot.totalAssets.toLocaleString()} | {entry.snapshot.holdings.length}标的</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-blue-500" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- Snapshot Input --- */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm mb-8 bg-slate-50/20">
          <div className="bg-slate-50/50 px-8 py-5 border-b flex justify-between items-center">
             <div className="flex gap-10">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Account Balance</span>
                  <input type="number" value={snapshot.totalAssets} onChange={e => setSnapshot({...snapshot, totalAssets: Number(e.target.value)})} className="bg-transparent text-2xl font-black text-slate-800 w-40 outline-none border-b-2 border-dashed border-slate-200 focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Exposure (%)</span>
                  <div className="flex items-center gap-1">
                    <input type="number" value={snapshot.positionRatio || 0} onChange={e => setSnapshot({...snapshot, positionRatio: Number(e.target.value)})} className="bg-transparent text-2xl font-black text-slate-800 w-20 outline-none border-b-2 border-dashed border-slate-200 focus:border-blue-500 transition-all" /><span className="text-slate-400 font-black">%</span>
                  </div>
                </div>
             </div>
             <button onClick={() => setSnapshot({...snapshot, holdings: [...snapshot.holdings, { name: "新标的", code: "000000", volume: 0, costPrice: 0, currentPrice: 0, profit: 0, profitRate: "0%", marketValue: 0 }]})} className="text-xs font-black text-blue-600 bg-blue-50 px-5 py-2 rounded-xl hover:bg-blue-100 transition-colors uppercase tracking-widest">Add Item</button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
              <tr><th className="px-8 py-4 text-left">标的/代码</th><th className="px-8 py-4 text-left">数量/成本</th><th className="px-8 py-4 text-left">盈亏</th><th className="px-8 py-4 text-right">管理</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {snapshot.holdings.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-4"><div className="font-black text-slate-800">{item.name}</div><div className="text-[10px] font-mono text-slate-400">{item.code}</div></td>
                  <td className="px-8 py-4"><div className="text-slate-600 font-bold">{item.volume.toLocaleString()}</div><div className="text-xs text-slate-400">@ {item.costPrice}</div></td>
                  <td className="px-8 py-4"><div className={`font-black ${item.profit >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{item.profitRate}</div><div className="text-[10px] text-slate-400">¥{item.profit.toLocaleString()}</div></td>
                  <td className="px-8 py-4 text-right"><button onClick={() => setSnapshot({...snapshot, holdings: snapshot.holdings.filter((_, i) => i !== idx)})} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <button onClick={handleAnalyze} disabled={loading || snapshot.holdings.length === 0} className="flex items-center gap-3 px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black shadow-2xl transition-all active:scale-95 disabled:opacity-50">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <TrendingUp className="w-6 h-6" />}
            {loading ? 'AI 正在深度复盘' : '生成智能复盘报告'}
          </button>
        </div>
      </div>

      {/* --- Periodic Strategic Review Section --- */}
      {periodicReview && (
        <div id="periodic-review-section" className="bg-slate-900 rounded-[3.5rem] p-10 shadow-3xl animate-slide-up text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 blur-[120px] pointer-events-none" />
          
          <div className="flex justify-between items-center mb-10 relative z-10 px-4">
            <h3 className="text-3xl font-black flex items-center gap-5">
              <div className="p-4 bg-blue-600 rounded-3xl shadow-[0_0_30px_rgba(37,99,235,0.3)]"><ShieldCheck className="w-10 h-10 text-white" /></div>
              交易行为周期战略审计
            </h3>
            <div className="flex flex-col items-end">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Execution Score</div>
              <div className={`text-4xl font-black ${periodicReview.score >= 80 ? 'text-rose-500' : periodicReview.score >= 60 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {periodicReview.score}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
            {/* Highlights - Good Behaviors */}
            <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-8 hover:bg-white/10 transition-all group">
              <div className="flex items-center gap-3 text-rose-500 mb-6 font-black uppercase tracking-widest text-xs">
                <CheckCircle2 className="w-5 h-5" /> 策略执行红榜 (好的)
              </div>
              <h4 className="text-xl font-black mb-4 group-hover:text-rose-400 transition-colors">{periodicReview.highlight.title}</h4>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 italic">{periodicReview.highlight.description}</p>
              <div className="space-y-3">
                {periodicReview.execution.good_behaviors.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-center text-sm font-medium text-slate-200 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                    <Zap className="w-4 h-4 text-rose-500 shrink-0" /> {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Lowlights - Bad Behaviors & Action Instructions */}
            <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-8 hover:bg-white/10 transition-all group">
              <div className="flex items-center gap-3 text-emerald-500 mb-6 font-black uppercase tracking-widest text-xs">
                <AlertCircle className="w-5 h-5" /> 策略执行黑榜 (坏的)
              </div>
              <h4 className="text-xl font-black mb-4 group-hover:text-emerald-400 transition-colors">{periodicReview.lowlight.title}</h4>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 italic">{periodicReview.lowlight.description}</p>
              <div className="space-y-4">
                {periodicReview.execution.bad_behaviors.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-800 border-l-4 border-emerald-500">
                    <div className="text-xs font-black text-emerald-500 uppercase mb-2">识别到风险行为:</div>
                    <div className="text-sm font-bold text-slate-200 mb-3">{item}</div>
                    <div className="pt-3 border-t border-white/5">
                      <div className="text-[10px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1">
                        <MoveRight className="w-3 h-3" /> 行动指令 (Action Plan)
                      </div>
                      <p className="text-xs text-indigo-300 font-medium">下次执行需强制触发：针对此类行为，必须在操作前进行 15 分钟情绪冷却或强制减仓。</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Next Period Focus */}
          <div className="mt-8 bg-indigo-600/20 border border-indigo-600/30 rounded-3xl p-8 relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="shrink-0">
               <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Next Period Core Focus</div>
               <div className="text-2xl font-black">下阶段核心课题</div>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
               {periodicReview.next_period_focus.map((focus, idx) => (
                 <div key={idx} className="flex items-center gap-3 text-sm font-bold text-indigo-100 bg-white/5 px-5 py-3 rounded-2xl border border-white/5">
                    <Target className="w-5 h-5 text-indigo-400" /> {focus}
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* --- Daily Analysis Result --- */}
      {analysisResult && (
        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden animate-slide-up">
          <div className="bg-slate-50 px-10 py-6 border-b flex justify-between items-center">
            <h3 className="font-black text-slate-900 flex items-center gap-4 text-xl"><Activity className="w-6 h-6 text-blue-600" /> 复盘诊断报告</h3>
            <div className="flex gap-3">
              <button onClick={handleGeneratePlan} disabled={generatingPlan} className="text-xs font-black bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all active:scale-95 uppercase tracking-widest">
                {generatingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListTodo className="w-4 h-4" />} 生成执行计划
              </button>
              <button onClick={saveToJournal} className="text-xs font-black bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl hover:bg-slate-50 flex items-center gap-2 transition-all">
                <Save className="w-4 h-4" /> 存档
              </button>
            </div>
          </div>
          <div className="p-1 min-h-[400px]">
             {renderAnalysisReport(analysisResult.content)}
          </div>
        </div>
      )}

      {/* --- Trading Execution Plan (Redesigned Horizontal Style) --- */}
      {isPlanOpen && (
        <div className="mt-12 bg-slate-900 text-white rounded-[3.5rem] p-10 shadow-3xl animate-slide-up relative overflow-hidden">
           <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] pointer-events-none" />
           
           <div className="flex justify-between items-center mb-10 relative z-10 px-4">
              <h3 className="text-3xl font-black flex items-center gap-4">
                <div className="p-4 bg-emerald-500 rounded-3xl shadow-lg"><ListTodo className="w-10 h-10 text-white" /></div>
                次日交易指令执行库
              </h3>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800 px-4 py-2 rounded-full border border-slate-700">Total Archive: {tradingPlans.length} Sets</div>
           </div>
           
           <div className="space-y-12 relative z-10">
              {currentPlanItems.length === 0 ? (
                <div className="text-center py-20 text-slate-700 font-black uppercase tracking-widest border-2 border-dashed border-slate-800 rounded-[3rem]">No Active Strategy</div>
              ) : (
                currentPlanItems.map(plan => (
                  <div key={plan.id} className="bg-slate-800/40 rounded-[3rem] border border-slate-700/50 overflow-hidden backdrop-blur-xl group hover:border-emerald-500/50 transition-all duration-500">
                    <div className="bg-slate-800/60 px-8 py-5 flex justify-between items-center border-b border-slate-700/50">
                       <div className="flex items-center gap-6">
                          <span className="text-2xl font-black text-emerald-400 tracking-tighter">{plan.target_date}</span>
                          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-emerald-500/20">
                             <CheckCircle2 className="w-3 h-3" /> Execution Ready
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <button onClick={() => exportPlanMD(plan)} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-slate-400 hover:text-white bg-slate-900/50 rounded-xl border border-slate-700 uppercase tracking-widest transition-all">
                            <FileText className="w-4 h-4" /> Export MD
                          </button>
                          <button onClick={() => exportPlanDoc(plan)} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-slate-400 hover:text-white bg-slate-900/50 rounded-xl border border-slate-700 uppercase tracking-widest transition-all">
                            <FileDown className="w-4 h-4" /> Export Word
                          </button>
                          <button onClick={() => deletePlan(plan.id)} className="p-2 text-slate-700 hover:text-rose-500 transition-all">
                            <Trash2 className="w-5 h-5" />
                          </button>
                       </div>
                    </div>
                    
                    <div className="p-8 space-y-8">
                       {/* Strategic Summary */}
                       <div className="relative p-8 bg-slate-900/50 rounded-[2.5rem] border border-slate-700/30">
                          <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <Target className="w-4 h-4" /> Strategic Core Logic
                          </div>
                          <p className="text-slate-200 text-lg font-bold leading-relaxed italic border-l-4 border-emerald-500/40 pl-6">
                            "{plan.strategy_summary}"
                          </p>
                       </div>

                       {/* Flat Horizontal Instructions */}
                       <div className="space-y-3">
                          {plan.items.map(item => (
                            <div key={item.id} className="bg-slate-900/80 hover:bg-slate-900 p-4 rounded-3xl border border-slate-800 hover:border-emerald-500/30 transition-all flex flex-col md:flex-row items-center gap-6 group/item">
                               {/* Action Badge */}
                               <div className={`shrink-0 w-24 h-12 rounded-2xl flex items-center justify-center font-black text-lg uppercase tracking-widest ${
                                 item.action === 'buy' ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 
                                 item.action === 'sell' ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 
                                 'bg-slate-800 text-slate-400'
                               }`}>
                                 {item.action === 'buy' ? '买入' : item.action === 'sell' ? '卖出' : item.action === 'hold' ? '持有' : item.action.toUpperCase()}
                               </div>

                               {/* Stock Info */}
                               <div className="shrink-0 w-40 text-center md:text-left">
                                  <div className="text-xl font-black group-hover/item:text-emerald-400 transition-colors">{item.symbol}</div>
                                  <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Instrument Ticket</div>
                               </div>

                               {/* Reasoning - The core of the ticket */}
                               <div className="flex-1 px-4 border-x border-slate-800">
                                  <p className="text-sm text-slate-400 line-clamp-2 italic leading-relaxed font-medium">
                                     {item.reason}
                                  </p>
                               </div>

                               {/* Price & Status */}
                               <div className="shrink-0 flex items-center gap-8 pl-4">
                                  <div className="text-right">
                                     <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Target Price</div>
                                     <div className="text-lg font-black text-white">¥ {item.price_target || '--'}</div>
                                  </div>
                                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center group-hover/item:border-emerald-500 transition-colors">
                                     <Check className="w-6 h-6 text-slate-600 group-hover/item:text-emerald-500" />
                                  </div>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                ))
              )}
           </div>

           {/* --- Pagination --- */}
           {totalPlanPages > 1 && (
             <div className="flex items-center justify-center gap-10 mt-12 relative z-10">
                <button disabled={planPage === 1} onClick={() => setPlanPage(p => p - 1)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-10 border border-slate-700 transition-all">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex gap-4">
                   {Array.from({length: totalPlanPages}).map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${planPage === i + 1 ? 'w-12 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'w-2 bg-slate-800'}`} />
                   ))}
                </div>
                <button disabled={planPage === totalPlanPages} onClick={() => setPlanPage(p => p + 1)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-10 border border-slate-700 transition-all">
                  <ChevronRight className="w-6 h-6" />
                </button>
             </div>
           )}
        </div>
      )}
    </div>
  );
};
