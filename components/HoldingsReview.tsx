
import React, { useState, useEffect, useRef } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HoldingsSnapshot, HoldingItemDetailed, JournalEntry, PeriodicReviewData, DailyTradingPlan, PlanItem } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { parseBrokerageScreenshot, fetchPeriodicReview, extractTradingPlan } from '../services/geminiService';
import { analyzeImageWithExternal } from '../services/externalLlmService';
import { Upload, Loader2, Save, Download, UploadCloud, History, Trash2, Camera, Edit2, Check, X, FileJson, TrendingUp, AlertTriangle, PieChart as PieChartIcon, Activity, Target, ClipboardList, BarChart3, Crosshair, GitCompare, Clock, LineChart as LineChartIcon, Calendar, Trophy, AlertOctagon, CheckCircle2, XCircle, ArrowRightCircle, ListTodo, MoreHorizontal, Square, CheckSquare, FileText, FileSpreadsheet, FileCode, ChevronLeft, ChevronRight, AlertCircle, Scale, Coins, ShieldAlert, Microscope, MessageSquareQuote, Sparkles, Zap, Lightbulb } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LineChart, Line } from 'recharts';

interface HoldingsReviewProps {
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: UserSettings;
  onOpenSettings?: () => void;
}

const HISTORY_PAGE_SIZE = 5;

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

  useEffect(() => {
    localStorage.setItem('qm_journal', JSON.stringify(journal));
  }, [journal]);

  useEffect(() => {
    localStorage.setItem('qm_trading_plans', JSON.stringify(tradingPlans));
  }, [tradingPlans]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        let parsedData: HoldingsSnapshot;
        if (currentModel === ModelProvider.HUNYUAN_CN) {
           parsedData = await analyzeImageWithExternal(ModelProvider.HUNYUAN_CN, base64String, "");
        } else {
           parsedData = await parseBrokerageScreenshot(base64String, "");
        }
        setSnapshot({ ...parsedData, positionRatio: parsedData.positionRatio || 0, date: new Date().toISOString().split('T')[0] });
        setParsing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) { setParsing(false); }
  };

  const handleAnalyze = async () => {
    if (snapshot.holdings.length === 0) return;
    setLoading(true);
    setError(null);
    setPeriodicResult(null);
    setActiveTab('report');
    try {
      const result = await analyzeWithLLM(currentModel, "持仓复盘分析", true, settings, false, 'day', undefined, currentMarket);
      setAnalysisResult(result);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handlePeriodicReview = async (period: 'week' | 'month' | 'all') => {
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    setActiveTab('periodic');
    try {
      const result = await fetchPeriodicReview(journal, period, currentMarket, "");
      setPeriodicResult(result);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const saveToJournal = () => {
    if (!analysisResult) return;
    const newEntry: JournalEntry = { id: crypto.randomUUID(), timestamp: Date.now(), snapshot: { ...snapshot }, analysis: analysisResult };
    setJournal(prev => [newEntry, ...prev]);
    alert("日志已存档");
  };

  const renderPeriodicDashboard = (data: any) => {
    return (
      <div className="p-8 space-y-10 animate-fade-in">
        {/* 顶部评分与审计模块 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-indigo-500/10 blur-3xl"></div>
              <h3 className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] mb-6">实战综合评分 (Audit)</h3>
              <div className="text-7xl font-black mb-4 tracking-tighter">{data.score}</div>
              <p className="text-sm font-bold opacity-70">包含执行力与超额收益</p>
           </div>

           <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-center">
              <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-3">
                 <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><Zap className="w-5 h-5" /></div>
                 运气与实力剥离审计 (Alpha/Beta Analysis)
              </h3>
              <p className="text-slate-600 leading-relaxed font-bold italic bg-slate-50 p-6 rounded-3xl border border-slate-100">
                 "{data.alpha_beta_analysis}"
              </p>
           </div>
        </div>

        {/* 1月行情前瞻专项模块 */}
        <div className="bg-gradient-to-r from-rose-50 to-indigo-50 rounded-[2.5rem] p-8 border border-white shadow-inner">
           <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-xl text-rose-600"><Lightbulb className="w-5 h-5" /></div>
              1 月行情前瞻与跨年实战指南
           </h3>
           <p className="text-slate-700 leading-relaxed font-bold bg-white/60 p-6 rounded-3xl">
              {data.new_year_strategy}
           </p>
        </div>

        {/* 个股专项审计 */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
           <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
              <Microscope className="w-6 h-6 text-indigo-600" /> 个股专项穿透审计
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.stock_diagnostics?.map((stock: any, i: number) => (
                 <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                       <span className="font-black text-lg text-slate-800">{stock.name}</span>
                       <span className="text-[10px] font-black uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-200">{stock.verdict}</span>
                    </div>
                    <div className="space-y-2">
                       {stock.issues.map((issue: string, j: number) => (
                          <div key={j} className="text-xs font-bold text-slate-500 flex gap-2 items-start">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div>
                             {issue}
                          </div>
                       ))}
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
           <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                 <UploadCloud className="w-7 h-7 text-indigo-600" />
                 持仓实战审计 (Portfolio Audit)
              </h2>
              <p className="text-slate-500 text-sm mt-1 font-medium">连续复盘是进阶交易者的唯一捷径。目前正处于 12 月跨年转折关键审计期。</p>
           </div>
           <div className="flex gap-3">
              <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="flex items-center gap-2 px-4 py-2 text-sm font-black text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200"><History className="w-4 h-4" /> 历史日志</button>
              <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg transition-all"><Camera className="w-5 h-5" /> 同步持仓</button>
           </div>
        </div>

        {/* 手动录入表格... */}
        <div className="overflow-x-auto rounded-3xl border border-slate-200 mb-8">
           <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                 <tr>
                    <th className="px-6 py-4">标的信息</th>
                    <th className="px-6 py-4">持仓详情</th>
                    <th className="px-6 py-4">实时盈亏</th>
                    <th className="px-6 py-4 text-right">操作</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {snapshot.holdings.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4">
                          <div className="font-black text-slate-800 text-lg">{h.name}</div>
                          <div className="text-xs font-mono text-slate-400">{h.code}</div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="text-slate-600 font-bold">{h.volume} 股 / 成本 {h.costPrice}</div>
                          <div className="text-xs text-slate-400 mt-0.5">现价 {h.currentPrice}</div>
                       </td>
                       <td className="px-6 py-4">
                          <div className={`font-black text-lg ${h.profit >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{h.profit >= 0 ? '+' : ''}{h.profit}</div>
                          <div className={`text-xs font-bold ${h.profit >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{h.profitRate}</div>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <button onClick={() => {}} className="p-2 text-slate-300 hover:text-indigo-600"><Edit2 className="w-4 h-4"/></button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

        <div className="flex justify-end gap-4">
           <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button onClick={() => handlePeriodicReview('week')} className="px-4 py-2 text-xs font-black text-slate-500 hover:bg-white hover:text-indigo-600 rounded-xl transition-all">近一周复盘</button>
              <button onClick={() => handlePeriodicReview('month')} className="px-4 py-2 text-xs font-black text-slate-500 hover:bg-white hover:text-indigo-600 rounded-xl transition-all">近一月复盘</button>
           </div>
           <button onClick={handleAnalyze} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> 开始 AI 实战复盘
           </button>
        </div>
      </div>

      {(analysisResult || periodicResult) && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden animate-slide-up">
           <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center">
              <div className="flex gap-6">
                <button onClick={() => setActiveTab('report')} className={`text-sm font-black transition-all ${activeTab === 'report' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>日度诊断</button>
                <button onClick={() => setActiveTab('periodic')} className={`text-sm font-black transition-all ${activeTab === 'periodic' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>能力审计 (Audit)</button>
              </div>
              <button onClick={saveToJournal} className="flex items-center gap-2 px-4 py-2 text-xs font-black bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50"><Save className="w-4 h-4"/> 存档日志</button>
           </div>
           <div className="min-h-[500px]">
             {activeTab === 'report' && analysisResult ? (
                <div className="p-8 prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: analysisResult.content.replace(/\n/g, '<br/>') }}></div>
             ) : activeTab === 'periodic' && periodicResult?.periodicData ? renderPeriodicDashboard(periodicResult.periodicData) : (
                <div className="p-20 text-center text-slate-300 font-black text-xl italic uppercase tracking-widest">请选择复盘时间段查看审计结果</div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};
