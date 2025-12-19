
import React, { useState, useEffect, useRef } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HoldingsSnapshot, HoldingItemDetailed, JournalEntry, PeriodicReviewData, DailyTradingPlan, PlanItem } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { parseBrokerageScreenshot, fetchPeriodicReview, extractTradingPlan } from '../services/geminiService';
import { analyzeImageWithExternal } from '../services/externalLlmService';
// Fix: Added missing 'Zap' import from lucide-react to resolve the reference error on line 365.
import { Upload, Loader2, Save, Download, UploadCloud, History, Trash2, Camera, Edit2, Check, X, FileJson, TrendingUp, AlertTriangle, PieChart as PieChartIcon, Activity, Target, ClipboardList, BarChart3, Crosshair, GitCompare, Clock, LineChart as LineChartIcon, Calendar, Trophy, AlertOctagon, CheckCircle2, XCircle, ArrowRightCircle, ListTodo, MoreHorizontal, FileText, FileSpreadsheet, Printer, Share2, Zap } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LineChart, Line } from 'recharts';

interface HoldingsReviewProps {
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: UserSettings;
  onOpenSettings?: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
const HORIZON_COLORS = {
  'short': '#f59e0b',
  'medium': '#3b82f6',
  'long': '#8b5cf6',
};

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
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'report' | 'charts' | 'periodic'>('report');
  
  const [periodicResult, setPeriodicResult] = useState<AnalysisResult | null>(null);
  const [periodicRange, setPeriodicRange] = useState<{start: string, end: string, label: string} | null>(null);
  
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

  // --- Handlers ---
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
          let parsedData: HoldingsSnapshot;
          if (currentModel === ModelProvider.HUNYUAN_CN) {
             parsedData = await analyzeImageWithExternal(ModelProvider.HUNYUAN_CN, base64String, settings.hunyuanKey!);
          } else {
             parsedData = await parseBrokerageScreenshot(base64String, settings.geminiKey);
          }
          const holdingsWithHorizon = parsedData.holdings.map(h => ({ ...h, horizon: 'medium' as const }));
          setSnapshot({
            ...parsedData,
            positionRatio: parsedData.positionRatio || 0,
            holdings: holdingsWithHorizon,
            date: new Date().toISOString().split('T')[0]
          });
        } catch (err: any) { setError(err.message || "识别失败"); }
        finally { setParsing(false); }
      };
      reader.readAsDataURL(file);
    } catch (err) { setParsing(false); setError("文件读取失败"); }
  };

  const handleAnalyze = async () => {
    if (snapshot.holdings.length === 0) { setError("持仓列表为空"); return; }
    setLoading(true);
    setAnalysisResult(null);
    setPeriodicResult(null);
    setError(null);
    setActiveTab('report');
    try {
      const result = await analyzeWithLLM(currentModel, "请深度分析我的持仓...", true, settings, false, 'day', undefined, currentMarket);
      setAnalysisResult(result);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handlePeriodicReview = async (period: 'week' | 'month' | 'all') => {
    if (journal.length < 1) { setError("历史记录不足，无法复盘。"); return; }
    setLoading(true);
    setError(null);
    setActiveTab('periodic');
    const now = Date.now();
    let startTs = 0;
    let label = "";
    if (period === 'week') { startTs = now - 7 * 24 * 60 * 60 * 1000; label = "最近一周"; }
    else if (period === 'month') { startTs = now - 30 * 24 * 60 * 60 * 1000; label = "最近一月"; }
    else { startTs = 0; label = "全历史记录"; }
    const filtered = journal.filter(j => j.timestamp >= startTs);
    const startDate = filtered.length > 0 ? new Date(filtered[filtered.length-1].timestamp).toLocaleDateString() : '起初';
    const endDate = new Date().toLocaleDateString();
    setPeriodicRange({ start: startDate, end: endDate, label });
    try {
      const result = await fetchPeriodicReview([...filtered, {id:'cur', timestamp:now, snapshot, analysis:null}], label, currentMarket, settings.geminiKey);
      setPeriodicResult(result);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleExportPeriodicMD = () => {
    if (!periodicResult?.periodicData || !periodicRange) return;
    const d = periodicResult.periodicData as PeriodicReviewData;
    let md = `# QuantMind 阶段性复盘报告 - ${periodicRange.label}\n\n`;
    md += `> **复盘区间**: ${periodicRange.start} 至 ${periodicRange.end}\n`;
    md += `> **综合评分**: ${d.score}/100\n`;
    md += `> **市场定调**: ${d.market_trend.toUpperCase()}\n\n`;
    md += `## 1. 市场阶段总结\n${d.market_summary}\n\n`;
    md += `## 2. 核心表现\n`;
    md += `### 🌟 高光时刻: ${d.highlight.title}\n${d.highlight.description}\n\n`;
    md += `### ⚠️ 至暗时刻: ${d.lowlight.title}\n${d.lowlight.description}\n\n`;
    md += `## 3. 知行合一审计 (执行力评分: ${d.execution.score})\n`;
    md += `> ${d.execution.details}\n\n`;
    md += `### ✅ 优秀行为\n${d.execution.good_behaviors.map(b => `- ${b}`).join('\n')}\n\n`;
    md += `### ❌ 待改进项\n${d.execution.bad_behaviors.map(b => `- ${b}`).join('\n')}\n\n`;
    md += `## 4. 下阶段战略重心\n${d.next_period_focus.map((f, i) => `${i+1}. ${f}`).join('\n')}\n\n`;
    md += `---\n*报告由 QuantMind AI 自动生成*`;
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Periodic_Review_${periodicRange.start.replace(/\//g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGeneratePlan = async () => {
    if (!analysisResult) return;
    setGeneratingPlan(true);
    try {
      const { items, summary } = await extractTradingPlan(analysisResult.content, settings.geminiKey);
      setTradingPlans(prev => [{ id: crypto.randomUUID(), target_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], created_at: Date.now(), items, strategy_summary: summary }, ...prev]);
      setIsPlanOpen(true);
    } catch (err: any) { setError("生成失败: " + err.message); }
    finally { setGeneratingPlan(false); }
  };

  // --- Rendering Helpers ---
  const renderPeriodicDashboard = (data: PeriodicReviewData) => {
    return (
      <div className="p-6 space-y-8 animate-fade-in print:p-0">
        {/* Header with Export Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6 print:border-none">
           <div>
              <div className="flex items-center gap-2 mb-1">
                 <h3 className="text-2xl font-black text-slate-800 tracking-tight">阶段性复盘报告</h3>
                 <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">{periodicRange?.label}</span>
              </div>
              <p className="text-sm font-bold text-slate-400 flex items-center gap-1">
                 <Calendar className="w-3.5 h-3.5" />
                 复盘区间: <span className="text-slate-600">{periodicRange?.start}</span> — <span className="text-slate-600">{periodicRange?.end}</span>
              </p>
           </div>
           <div className="flex gap-2 print:hidden">
              <button onClick={handleExportPeriodicMD} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
                 <FileText className="w-3.5 h-3.5" /> 导出 MD
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
                 <Printer className="w-3.5 h-3.5" /> 打印 PDF 留档
              </button>
           </div>
        </div>

        {/* Row 1: Score & Market Context */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col items-center justify-center">
              <h3 className="text-slate-400 font-black uppercase tracking-widest text-[10px] mb-4">综合表现评分</h3>
              <div className="relative w-28 h-28 flex items-center justify-center">
                 <svg className="w-full h-full transform -rotate-90">
                    <circle cx="56" cy="56" r="48" stroke="#1e293b" strokeWidth="8" fill="none" />
                    <circle cx="56" cy="56" r="48" stroke={data.score >= 80 ? '#10b981' : data.score >= 60 ? '#f59e0b' : '#ef4444'} strokeWidth="8" fill="none" strokeDasharray="301.6" strokeDashoffset={301.6 * (1 - data.score / 100)} className="transition-all duration-1000" />
                 </svg>
                 <span className="absolute text-3xl font-black">{data.score}</span>
              </div>
           </div>
           <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                 <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border bg-white border-slate-200 text-slate-500">{data.market_trend}趋势</span>
                 <h4 className="text-slate-800 font-black">市场阶段定调</h4>
              </div>
              <p className="text-slate-600 leading-relaxed text-sm font-medium">{data.market_summary}</p>
           </div>
        </div>

        {/* Row 2: Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-2xl">
              <div className="text-emerald-700 font-black text-xs uppercase mb-3 flex items-center gap-2"><Trophy className="w-4 h-4"/> 高光时刻 (Highlight)</div>
              <h5 className="font-black text-slate-800 mb-2">{data.highlight.title}</h5>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{data.highlight.description}</p>
           </div>
           <div className="bg-rose-50/50 border border-rose-100 p-6 rounded-2xl">
              <div className="text-rose-700 font-black text-xs uppercase mb-3 flex items-center gap-2"><AlertOctagon className="w-4 h-4"/> 至暗时刻 (Lowlight)</div>
              <h5 className="font-black text-slate-800 mb-2">{data.lowlight.title}</h5>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{data.lowlight.description}</p>
           </div>
        </div>

        {/* Row 3: Audit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
           <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">知行合一审计</h3>
           <p className="text-xs text-slate-500 italic mb-6">"{data.execution.details}"</p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <div className="text-[10px] font-black text-emerald-600 uppercase">优秀行为</div>
                 {data.execution.good_behaviors.map((b, i) => <div key={i} className="p-2 bg-emerald-50 text-[11px] font-bold text-emerald-800 rounded-lg flex gap-2"><Check className="w-3 h-3 shrink-0"/>{b}</div>)}
              </div>
              <div className="space-y-2">
                 <div className="text-[10px] font-black text-rose-600 uppercase">待改进项</div>
                 {data.execution.bad_behaviors.map((b, i) => <div key={i} className="p-2 bg-rose-50 text-[11px] font-bold text-rose-800 rounded-lg flex gap-2"><X className="w-3 h-3 shrink-0"/>{b}</div>)}
              </div>
           </div>
        </div>

        {/* Row 4: Focus */}
        <div className="bg-indigo-600 rounded-3xl p-8 text-white">
           <h3 className="font-black mb-6 flex items-center gap-2 text-lg"><ArrowRightCircle className="w-6 h-6"/> 下阶段战略重心</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.next_period_focus.map((f, i) => (
                 <div key={i} className="bg-white/10 p-4 rounded-2xl border border-white/20 text-sm font-bold flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px]">{i+1}</span>
                    {f}
                 </div>
              ))}
           </div>
        </div>
      </div>
    );
  };

  const renderReportContent = (content: string) => {
    const sections = content.split(/^##\s+/gm).filter(Boolean);
    if (sections.length === 0) return <div className="prose max-w-none p-6" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />;
    return (
      <div className="grid grid-cols-1 gap-6 p-6">
        {sections.map((sec, idx) => {
          const lines = sec.trim().split('\n');
          const title = lines[0].trim();
          const body = lines.slice(1).join('\n').trim();
          return (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
              <h3 className="text-lg font-black text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-indigo-500"></div> {title}
              </h3>
              <div className="space-y-2 text-sm text-slate-600 leading-relaxed">
                 {body.split('\n').map((l, i) => <p key={i}>{l}</p>)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* 持仓卡片 */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl text-white"><Activity className="w-6 h-6"/></div>
              智能持仓分析系统
            </h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Portfolio Intelligence & Review</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsPlanOpen(!isPlanOpen)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all" title="查看计划"><ListTodo className="w-5 h-5"/></button>
            <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all" title="历史日志"><History className="w-5 h-5"/></button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition-all shadow-lg active:scale-95">
              <Camera className="w-4 h-4"/> 识别截图
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>
        </div>

        {/* 历史记录/错误信息略... */}
        {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm font-bold flex gap-2"><AlertTriangle className="w-5 h-5 shrink-0"/>{error}</div>}

        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-8 overflow-x-auto">
           <table className="w-full text-sm">
              <thead className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
                 <tr>
                    <th className="pb-4 text-left">标的明细</th>
                    <th className="pb-4">持仓</th>
                    <th className="pb-4">成本</th>
                    <th className="pb-4">现价</th>
                    <th className="pb-4">浮动盈亏</th>
                    <th className="pb-4 text-right">管理</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {snapshot.holdings.map((h, i) => (
                    <tr key={i} className="group">
                       <td className="py-4">
                          <div className="font-black text-slate-800">{h.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">{h.code}</div>
                       </td>
                       <td className="py-4 text-center font-bold">{h.volume}</td>
                       <td className="py-4 text-center font-bold text-slate-500">{h.costPrice}</td>
                       <td className="py-4 text-center font-black text-slate-900">{h.currentPrice}</td>
                       <td className="py-4 text-center">
                          <div className={`font-black ${h.profit >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{h.profit > 0 ? '+' : ''}{h.profit}</div>
                       </td>
                       <td className="py-4 text-right">
                          <button className="p-2 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
           <button onClick={() => setSnapshot({...snapshot, holdings: [...snapshot.holdings, {name:'新标的', code:'', volume:0, costPrice:0, currentPrice:0, profit:0, profitRate:'0%', marketValue:0}]})} className="w-full mt-4 py-3 border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs font-bold hover:bg-white transition-all">+ 手动新增持仓</button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-400 px-3 uppercase">阶段复盘</span>
              <button onClick={() => handlePeriodicReview('week')} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white rounded-lg transition-all">周总结</button>
              <button onClick={() => handlePeriodicReview('month')} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white rounded-lg transition-all">月总结</button>
           </div>
           <button onClick={handleAnalyze} disabled={loading} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 text-amber-400" />} 深度 AI 诊断
           </button>
        </div>
      </div>

      {/* 报告展示区 */}
      {(analysisResult || periodicResult) && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] animate-slide-up">
           <div className="flex bg-slate-100 p-1 m-4 rounded-2xl w-fit print:hidden">
              <button onClick={() => setActiveTab('report')} className={`px-6 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'report' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>分析报告</button>
              <button onClick={() => setActiveTab('charts')} className={`px-6 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'charts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>分布图表</button>
              {periodicResult && <button onClick={() => setActiveTab('periodic')} className={`px-6 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'periodic' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>阶段性总结 (New)</button>}
           </div>
           
           <div className="bg-slate-50/30">
             {activeTab === 'report' && analysisResult && renderReportContent(analysisResult.content)}
             {activeTab === 'periodic' && periodicResult?.periodicData && renderPeriodicDashboard(periodicResult.periodicData)}
           </div>
        </div>
      )}

      {/* 交易计划 Drawer 略... */}
    </div>
  );
};
