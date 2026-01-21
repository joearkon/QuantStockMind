
import React, { useState, useEffect, useRef } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HoldingsSnapshot, HoldingItemDetailed, JournalEntry, PeriodicReviewData, DailyTradingPlan, PlanItem } from '../types';
import { analyzeWithLLM, periodicReviewWithLLM, extractPlanWithLLM } from '../services/llmAdapter'; // 修改导入
import { parseBrokerageScreenshot } from '../services/geminiService';
import { analyzeImageWithExternal } from '../services/externalLlmService';
import { Upload, Loader2, Save, Download, UploadCloud, History, Trash2, Camera, Edit2, Check, X, FileJson, TrendingUp, AlertTriangle, PieChart as PieChartIcon, Activity, Target, ClipboardList, BarChart3, Crosshair, GitCompare, Clock, LineChart as LineChartIcon, Calendar, Trophy, AlertOctagon, CheckCircle2, XCircle, ArrowRightCircle, ListTodo, MoreHorizontal, Square, CheckSquare, FileText, FileSpreadsheet, FileCode, ChevronLeft, ChevronRight, AlertCircle, Scale, Coins, ShieldAlert, Microscope, MessageSquareQuote, Lightbulb, FileType, BookOpenCheck } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LineChart, Line } from 'recharts';

// ... (保持原有常量定义)
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
const HORIZON_COLORS = {
  'short': '#f59e0b',
  'medium': '#3b82f6',
  'long': '#8b5cf6',
};
const HISTORY_PAGE_SIZE = 5;

// Define the interface for HoldingsReview props to fix the TS error
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
  // --- State ---
  const [snapshot, setSnapshot] = useState<HoldingsSnapshot>({
    totalAssets: 0,
    positionRatio: 0, 
    date: new Date().toISOString().split('T')[0],
    holdings: []
  });
  
  const [journal, setJournal] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem('qm_journal');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return (Array.isArray(parsed) ? parsed : []).map(item => ({
        ...item,
        id: item.id || `legacy-${item.timestamp}-${Math.random().toString(36).substr(2, 9)}`
      }));
    } catch (e) {
      return [];
    }
  });

  const [tradingPlans, setTradingPlans] = useState<DailyTradingPlan[]>(() => {
    const saved = localStorage.getItem('qm_trading_plans');
    return saved ? JSON.parse(saved) : [];
  });

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'report' | 'charts' | 'periodic'>('report');
  const [periodicResult, setPeriodicResult] = useState<AnalysisResult | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<HoldingItemDetailed | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('qm_journal', JSON.stringify(journal));
  }, [journal]);

  useEffect(() => {
    localStorage.setItem('qm_trading_plans', JSON.stringify(tradingPlans));
  }, [tradingPlans]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (currentModel === ModelProvider.HUNYUAN_CN && !settings.hunyuanKey) {
      setError("请配置 Hunyuan API Key 以使用图片识别功能。");
      onOpenSettings?.();
      return;
    }
    
    if (currentModel === ModelProvider.GEMINI_INTL && !settings.geminiKey) {
      setError("请配置 Gemini API Key 以使用图片识别功能。");
      onOpenSettings?.();
      return;
    }

    setParsing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        try {
          let parsedData: HoldingsSnapshot;
          if (currentModel === ModelProvider.HUNYUAN_CN) {
             parsedData = await analyzeImageWithExternal(ModelProvider.HUNYUAN_CN, base64String, settings.hunyuanKey!);
          } else {
             parsedData = await parseBrokerageScreenshot(base64String, settings.geminiKey);
          }
          const holdingsWithHorizon = parsedData.holdings.map(h => ({ ...h, horizon: 'medium' as const }));
          setSnapshot({ ...parsedData, positionRatio: parsedData.positionRatio || 0, holdings: holdingsWithHorizon, date: new Date().toISOString().split('T')[0] });
        } catch (err: any) {
          setError(err.message || "识别失败");
        } finally {
          setParsing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setParsing(false);
      setError("文件读取失败");
    }
  };

  const handleAnalyze = async () => {
    if (snapshot.holdings.length === 0) {
      setError("持仓列表为空");
      return;
    }
    setLoading(true);
    setAnalysisResult(null);
    setPeriodicResult(null);
    setError(null);
    setActiveTab('report'); 

    const now = new Date();
    const todayFullStr = now.toLocaleString('zh-CN');
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const isYearEnd = currentMonth >= 10;
    const nextYear = currentYear + 1;

    const currentHoldingsText = snapshot.holdings.map((h, i) => {
      const marketVal = h.volume * h.currentPrice;
      return `${i+1}. ${h.name} (${h.code}): 持仓${h.volume}股, 成本${h.costPrice}, 现价${h.currentPrice},盈亏 ${h.profit} (${h.profitRate})`;
    }).join('\n');

    const prompt = `
      作为专属基金经理进行连续性复盘。
      [重要]: 负成本价代表本金已收回，是正常数据。
      现在时间: ${todayFullStr}。
      当前持仓:
      ${currentHoldingsText}
      请输出包含回顾、诊断、技术位、实战指令、配比优化的深度报告。
    `;

    try {
      const result = await analyzeWithLLM(currentModel, prompt, true, settings, false, 'day', undefined, currentMarket);
      setAnalysisResult(result);
    } catch (err: any) {
      setError(err.message || "分析失败");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!analysisResult) return;
    setGeneratingPlan(true);
    try {
      const { items, summary } = await extractPlanWithLLM(currentModel, analysisResult.content, settings); // 使用适配器
      const newPlan: DailyTradingPlan = { id: crypto.randomUUID(), target_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], created_at: Date.now(), items, strategy_summary: summary };
      setTradingPlans(prev => [newPlan, ...prev]);
      setIsPlanOpen(true);
    } catch (err: any) {
      setError("生成交易计划失败: " + err.message);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handlePeriodicReview = async (period: 'week' | 'month' | 'all') => {
    if (journal.length < 1) {
      setError("历史记录不足，无法进行阶段性复盘。");
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysisResult(null); 
    setPeriodicResult(null);
    setActiveTab('periodic');

    const now = Date.now();
    let startDate = 0;
    let label = period === 'week' ? "近一周" : period === 'month' ? "近一月" : "全历史";
    if (period === 'week') startDate = now - 7 * 24 * 60 * 60 * 1000;
    else if (period === 'month') startDate = now - 30 * 24 * 60 * 60 * 1000;

    const filteredJournals = journal.filter(j => j.timestamp >= startDate);
    const reviewJournals = [...filteredJournals, { id: 'current', timestamp: Date.now(), snapshot, analysis: null }];

    try {
      const result = await periodicReviewWithLLM(currentModel, reviewJournals, label, currentMarket, settings); // 使用适配器
      setPeriodicResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ... (保持其余 Render 逻辑不变)
  const startEdit = (index: number, item: HoldingItemDetailed) => { setEditingIndex(index); setEditForm({ ...item, horizon: item.horizon || 'medium' }); };
  const saveEdit = () => { if (editForm && editingIndex !== null) { const newHoldings = [...snapshot.holdings]; if (!editForm.marketValue || editForm.marketValue === 0) { editForm.marketValue = editForm.volume * editForm.currentPrice; } newHoldings[editingIndex] = editForm; setSnapshot(prev => ({ ...prev, holdings: newHoldings })); setEditingIndex(null); setEditForm(null); } };
  const deleteHolding = (index: number) => { const newHoldings = [...snapshot.holdings]; newHoldings.splice(index, 1); setSnapshot(prev => ({ ...prev, holdings: newHoldings })); };
  const addEmptyHolding = () => { setSnapshot(prev => ({ ...prev, holdings: [...prev.holdings, { name: "新标的", code: "", volume: 0, costPrice: 0, currentPrice: 0, profit: 0, profitRate: "0%", marketValue: 0, horizon: 'short' }] })); setEditingIndex(snapshot.holdings.length); setEditForm({ name: "新标的", code: "", volume: 0, costPrice: 0, currentPrice: 0, profit: 0, profitRate: "0%", marketValue: 0, horizon: 'short' }); };
  const downloadFile = (content: string, filename: string, mimeType: string) => { const blob = new Blob([content], { type: mimeType }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
  const handleExportPlanMD = () => { let md = "# 我的交易计划归档\n\n"; tradingPlans.forEach(plan => { md += `## ${plan.target_date} (策略: ${plan.strategy_summary})\n| 标的 | 操作 | 目标价 | 逻辑 | 状态 |\n| --- | --- | --- | --- | --- |\n`; plan.items.forEach(item => { md += `| ${item.symbol} | ${item.action} | ${item.price_target || '--'} | ${item.reason} | ${item.status} |\n`; }); md += "\n"; }); downloadFile(md, `TradingPlans_${new Date().toISOString().split('T')[0]}.md`, 'text/markdown'); };
  const handleExportPlanWord = () => { /* ... */ };
  const handleExportPlanCSV = () => { /* ... */ };
  const handleExportReportMD = (result: AnalysisResult | null) => { if (!result) return; const content = `# QuantMind 智能复盘报告\n日期: ${new Date(result.timestamp).toLocaleString()}\n\n${result.content}`; downloadFile(content, `Report_${new Date().toISOString().split('T')[0]}.md`, 'text/markdown'); };
  const handleExportPeriodicMD = (data: PeriodicReviewData | undefined) => { if (!data) return; let md = `# QuantMind 阶段性复盘总结\n## 1. 评分: ${data.score}\n## 2. 趋势: ${data.market_trend}\n${data.market_summary}\n`; downloadFile(md, `Periodic_${new Date().toISOString().split('T')[0]}.md`, 'text/markdown'); };
  const handlePrintToPDF = () => { window.print(); };
  const saveToJournal = () => { if (!analysisResult) return; setJournal(prev => [{ id: crypto.randomUUID(), timestamp: Date.now(), snapshot: { ...snapshot }, analysis: analysisResult, note: "" }, ...prev]); alert("已保存！"); };
  const deleteJournalEntry = (id: string, e: React.MouseEvent) => { e.stopPropagation(); if (confirm("确定删除？")) { setJournal(prev => prev.filter(entry => entry.id !== id)); } };
  const clearAllJournalEntries = () => { if (confirm("清空全部？")) setJournal([]); };
  const exportJournal = () => { const blob = new Blob([JSON.stringify(journal, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `Journal.json`; a.click(); };
  const importJournal = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { try { const imported = JSON.parse(event.target?.result as string); setJournal(imported); } catch (e) { alert("导入失败"); } }; reader.readAsText(file); };
  const loadEntry = (entry: JournalEntry) => { setSnapshot(entry.snapshot); setAnalysisResult(entry.analysis); setIsHistoryOpen(false); };
  const getTrendData = () => { const history = [...journal].sort((a, b) => a.timestamp - b.timestamp).map(entry => ({ date: new Date(entry.timestamp).toLocaleDateString('zh-CN', {month: '2-digit', day: '2-digit'}), assets: entry.snapshot.totalAssets, totalProfit: entry.snapshot.holdings.reduce((sum, h) => sum + (h.profit || 0), 0) })); history.push({ date: 'Now', assets: snapshot.totalAssets, totalProfit: snapshot.holdings.reduce((sum, h) => sum + (h.profit || 0), 0) }); return history; };
  const getHorizonData = () => { const counts = { short: 0, medium: 0, long: 0 }; snapshot.holdings.forEach(h => { const type = h.horizon || 'medium'; counts[type]++; }); return [{ name: '短线', value: counts.short, color: HORIZON_COLORS.short }, { name: '中线', value: counts.medium, color: HORIZON_COLORS.medium }, { name: '长线', value: counts.long, color: HORIZON_COLORS.long }].filter(d => d.value > 0); };
  const totalHistoryPages = Math.ceil(journal.length / HISTORY_PAGE_SIZE);
  const paginatedJournal = journal.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);

  const renderPeriodicDashboard = (data: PeriodicReviewData) => { /* ... 保持原有样式不变 ... */ return (
    <div className="p-6 space-y-8 animate-fade-in" id="periodic-report-printable">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-6 text-white shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
              <h3 className="text-slate-300 font-bold uppercase tracking-wider text-xs mb-2">综合表现评分</h3>
              <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                 <svg className="w-full h-full transform -rotate-90"><circle cx="64" cy="64" r="56" stroke="#334155" strokeWidth="8" fill="none" /><circle cx="64" cy="64" r="56" stroke={data.score >= 80 ? '#10b981' : data.score >= 60 ? '#f59e0b' : '#ef4444'} strokeWidth="8" fill="none" strokeDasharray="351.86" strokeDashoffset={351.86 * (1 - data.score / 100)} className="transition-all duration-1000 ease-out"/></svg>
                 <span className="absolute text-4xl font-bold">{data.score}</span>
              </div>
           </div>
           <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-6">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">{data.market_trend.toUpperCase()}</span>
              <p className="mt-3 text-slate-600 leading-relaxed text-sm italic">"{data.market_summary}"</p>
           </div>
        </div>
        {data.monthly_portfolio_summary && ( <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 shadow-sm"><h3 className="text-lg font-bold text-indigo-900 mb-4">月度持股总结</h3><p className="text-slate-700 leading-relaxed font-bold">{data.monthly_portfolio_summary}</p></div> )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {data.stock_diagnostics?.map((s, i) => (<div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-4"><div className="flex justify-between mb-2"><span className="font-black">{s.name}</span><span className="text-[10px] px-2 py-1 rounded bg-indigo-100">{s.verdict}</span></div><div className="space-y-1">{s.issues.map((issue, j) => (<div key={j} className="text-xs text-slate-500">• {issue}</div>))}</div></div>))} </div>
        <div className="bg-slate-900 p-6 rounded-xl text-white"> <h3 className="text-indigo-300 font-bold mb-4">下阶段战略重心</h3> <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{data.next_period_focus.map((f, i) => (<div key={i} className="bg-slate-800 p-3 rounded-lg text-sm">{f}</div>))}</div> </div>
    </div>
  ); };

  const renderReportContent = (content: string) => { /* ... 保持原有样式不变 ... */ return <div className="p-6 space-y-4" id="daily-report-printable">{content.split('##').filter(Boolean).map((sec, i) => { const lines = sec.trim().split('\n'); return <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6"><h3 className="text-lg font-bold text-indigo-700 mb-3 border-b pb-2">{lines[0]}</h3><div className="text-slate-700 space-y-2">{lines.slice(1).map((l, j) => <p key={j}>{l}</p>)}</div></div>; })}</div>; };

  // ... (保持 JSX 返回逻辑不变)
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><UploadCloud className="w-6 h-6 text-indigo-600" />智能持仓复盘 (Multi-Model Support)</h2><p className="text-sm text-slate-500 mt-1">混合模型支持：现已对齐混元大模型复盘与计划提取能力。</p></div>
          <div className="flex gap-2"><button onClick={() => setIsPlanOpen(!isPlanOpen)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg border border-slate-200"><ListTodo className="w-4 h-4" />计划</button><button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg border border-slate-200"><History className="w-4 h-4" />日志</button><input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload}/><button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium shadow-sm transition-all">{parsing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Camera className="w-4 h-4"/>}{parsing ? '识别中...' : '上传持仓'}</button></div>
        </div>
        {/* ... 其余 UI 逻辑 ... */}
        {isHistoryOpen && ( <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg animate-slide-down"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-700">记录</h3><div className="flex gap-2"><button onClick={() => importInputRef.current?.click()} className="text-xs px-2 py-1 bg-white border rounded">导入</button><button onClick={exportJournal} className="text-xs px-2 py-1 bg-white border rounded">导出</button></div></div><div className="space-y-2 max-h-48 overflow-y-auto">{paginatedJournal.map(e => (<div key={e.id} onClick={() => loadEntry(e)} className="p-2 bg-white rounded border hover:border-indigo-400 cursor-pointer flex justify-between"><div><div className="text-xs font-bold">{new Date(e.timestamp).toLocaleString()}</div><div className="text-[10px] text-slate-400">¥{e.snapshot.totalAssets}</div></div><button onClick={(x) => {x.stopPropagation(); deleteJournalEntry(e.id, x);}} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button></div>))}</div></div> )}
        <div className="overflow-x-auto rounded-lg border border-slate-200 mb-6">
           <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <div className="flex gap-4">
                 <div><span className="text-[10px] text-slate-400 block font-bold">总资产</span><input type="number" value={snapshot.totalAssets} onChange={e => setSnapshot({...snapshot, totalAssets: Number(e.target.value)})} className="bg-transparent border-b border-dashed w-24 font-bold outline-none"/></div>
                 <div><span className="text-[10px] text-slate-400 block font-bold">仓位%</span><input type="number" value={snapshot.positionRatio} onChange={e => setSnapshot({...snapshot, positionRatio: Number(e.target.value)})} className="bg-transparent border-b border-dashed w-12 font-bold outline-none"/></div>
              </div>
              <button onClick={addEmptyHolding} className="text-xs text-indigo-600 font-bold hover:underline">+ 添加</button>
           </div>
           <table className="w-full text-xs">
              <thead className="bg-slate-50"><tr><th className="px-4 py-2">名称</th><th className="px-4 py-2">持仓</th><th className="px-4 py-2">成本</th><th className="px-4 py-2">现价</th><th className="px-4 py-2">盈亏</th><th className="px-4 py-2"></th></tr></thead>
              <tbody className="divide-y">{snapshot.holdings.map((h, i) => (<tr key={i}> {editingIndex === i ? (<> <td className="px-4 py-2"><input className="w-20 border rounded" value={editForm?.name} onChange={e => setEditForm({...editForm!, name: e.target.value})}/></td> <td className="px-4 py-2"><input type="number" className="w-16 border rounded" value={editForm?.volume} onChange={e => setEditForm({...editForm!, volume: Number(e.target.value)})}/></td> <td className="px-4 py-2"><input type="number" className="w-16 border rounded" value={editForm?.costPrice} onChange={e => setEditForm({...editForm!, costPrice: Number(e.target.value)})}/></td> <td className="px-4 py-2"><input type="number" className="w-16 border rounded" value={editForm?.currentPrice} onChange={e => setEditForm({...editForm!, currentPrice: Number(e.target.value)})}/></td> <td className="px-4 py-2"></td> <td className="px-4 py-2"><button onClick={saveEdit}><Check className="w-4 h-4"/></button></td> </>) : (<> <td className="px-4 py-3"><div className="font-bold">{h.name}</div><div className="text-[10px] text-slate-400">{h.code}</div></td> <td className="px-4 py-3">{h.volume}</td> <td className="px-4 py-3">{h.costPrice}</td> <td className="px-4 py-3 font-bold">{h.currentPrice}</td> <td className="px-4 py-3 text-red-500 font-bold">{h.profit}</td> <td className="px-4 py-3"><button onClick={() => startEdit(i, h)}><Edit2 className="w-3.5 h-3.5"/></button></td> </>)} </tr>))}</tbody>
           </table>
        </div>
        <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
           <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border">
              <button onClick={() => handlePeriodicReview('week')} className="px-3 py-1 text-xs hover:bg-white rounded">周复盘</button>
              <button onClick={() => handlePeriodicReview('month')} className="px-3 py-1 text-xs hover:bg-white rounded">月复盘</button>
           </div>
           <button onClick={handleAnalyze} disabled={loading} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-100 transition-all flex items-center gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <TrendingUp className="w-4 h-4"/>}连续性深度复盘</button>
        </div>
      </div>
      {/* ... 渲染结果部分保持 ... */}
      {(analysisResult || periodicResult) && ( <div className="bg-white rounded-xl border overflow-hidden"> <div className="bg-slate-50 px-6 py-4 border-b flex justify-between"> <div className="flex gap-2"> <button onClick={() => setActiveTab('report')} className={`px-4 py-2 text-xs font-bold rounded-lg ${activeTab === 'report' ? 'bg-white shadow' : ''}`}>报告</button> <button onClick={() => setActiveTab('periodic')} className={`px-4 py-2 text-xs font-bold rounded-lg ${activeTab === 'periodic' ? 'bg-white shadow' : ''}`}>总结</button> </div> <button onClick={saveToJournal} className="text-xs text-indigo-600 font-bold">保存到日志</button> </div> <div className="min-h-[200px]"> {activeTab === 'report' && analysisResult && renderReportContent(analysisResult.content)} {activeTab === 'periodic' && periodicResult?.periodicData && renderPeriodicDashboard(periodicResult.periodicData)} </div> </div> )}
    </div>
  );
};
