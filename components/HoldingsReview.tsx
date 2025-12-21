
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HoldingsSnapshot, HoldingItemDetailed, JournalEntry, PeriodicReviewData, DailyTradingPlan, PlanItem } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { parseBrokerageScreenshot, fetchPeriodicReview, extractTradingPlan } from '../services/geminiService';
import { analyzeImageWithExternal } from '../services/externalLlmService';
import { Upload, Loader2, Save, Download, UploadCloud, History, Trash2, Camera, Edit2, Check, X, FileJson, TrendingUp, AlertTriangle, PieChart as PieChartIcon, Activity, Target, ClipboardList, BarChart3, Crosshair, GitCompare, Clock, LineChart as LineChartIcon, Calendar, Trophy, AlertOctagon, CheckCircle2, XCircle, ArrowRightCircle, ListTodo, MoreHorizontal, Square, CheckSquare, FileText, FileSpreadsheet, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
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
  'short': '#f59e0b', // Amber
  'medium': '#3b82f6', // Blue
  'long': '#8b5cf6', // Violet
};

const ITEMS_PER_PAGE_JOURNAL = 5;
const ITEMS_PER_PAGE_PLAN = 3;

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
  
  // Pagination & Filters
  const [journalPage, setJournalPage] = useState(1);
  const [journalDateFilter, setJournalDateFilter] = useState('');
  const [planPage, setPlanPage] = useState(1);

  // Drawers
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'report' | 'charts' | 'periodic'>('report');
  
  // Periodic Review State
  const [periodicResult, setPeriodicResult] = useState<AnalysisResult | null>(null);
  
  // Editing State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<HoldingItemDetailed | null>(null);

  // Plan Generation State
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // --- Filtered Journal Entries ---
  const filteredJournal = useMemo(() => {
    let result = [...journal];
    if (journalDateFilter) {
      result = result.filter(entry => {
        const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
        return entryDate === journalDateFilter;
      });
    }
    return result;
  }, [journal, journalDateFilter]);

  const totalJournalPages = Math.ceil(filteredJournal.length / ITEMS_PER_PAGE_JOURNAL);
  const currentJournalItems = filteredJournal.slice((journalPage - 1) * ITEMS_PER_PAGE_JOURNAL, journalPage * ITEMS_PER_PAGE_JOURNAL);

  const totalPlanPages = Math.ceil(tradingPlans.length / ITEMS_PER_PAGE_PLAN);
  const currentPlanItems = tradingPlans.slice((planPage - 1) * ITEMS_PER_PAGE_PLAN, planPage * ITEMS_PER_PAGE_PLAN);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('qm_journal', JSON.stringify(journal));
    setJournalPage(1); // Reset page when journal changes
  }, [journal]);

  useEffect(() => {
    localStorage.setItem('qm_trading_plans', JSON.stringify(tradingPlans));
  }, [tradingPlans]);

  // --- Handlers ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (currentModel === ModelProvider.HUNYUAN_CN && !settings.hunyuanKey) {
      setError("您当前选择了腾讯混元模型，请配置 Hunyuan API Key 以使用图片识别功能。");
      onOpenSettings?.();
      return;
    }
    
    if (currentModel === ModelProvider.GEMINI_INTL && !settings.geminiKey) {
      setError("您当前选择了 Gemini 模型，请配置 Gemini API Key 以使用图片识别功能。");
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
          setSnapshot({
            ...parsedData,
            positionRatio: parsedData.positionRatio || 0,
            holdings: holdingsWithHorizon,
            date: new Date().toISOString().split('T')[0]
          });
        } catch (err: any) {
          setError(err.message || "识别失败，请重试或手动输入");
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

  const startEdit = (index: number, item: HoldingItemDetailed) => {
    setEditingIndex(index);
    setEditForm({ ...item, horizon: item.horizon || 'medium' });
  };

  const saveEdit = () => {
    if (editForm && editingIndex !== null) {
      const newHoldings = [...snapshot.holdings];
      if (!editForm.marketValue || editForm.marketValue === 0) {
        editForm.marketValue = editForm.volume * editForm.currentPrice;
      }
      newHoldings[editingIndex] = editForm;
      setSnapshot(prev => ({ ...prev, holdings: newHoldings }));
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  const deleteHolding = (index: number) => {
    const newHoldings = [...snapshot.holdings];
    newHoldings.splice(index, 1);
    setSnapshot(prev => ({ ...prev, holdings: newHoldings }));
  };

  const addEmptyHolding = () => {
    setSnapshot(prev => ({
      ...prev,
      holdings: [...prev.holdings, {
        name: "新标的",
        code: "",
        volume: 0,
        costPrice: 0,
        currentPrice: 0,
        profit: 0,
        profitRate: "0%",
        marketValue: 0,
        horizon: 'short'
      }]
    }));
  };

  const handleAnalyze = async () => {
    if (snapshot.holdings.length === 0) {
      setError("持仓列表为空，请先添加持仓");
      return;
    }
    setLoading(true);
    setAnalysisResult(null);
    setError(null);
    setActiveTab('report');

    const currentHoldingsText = snapshot.holdings.map((h, i) => 
      `${i+1}. ${h.name} (${h.code}): 持仓${h.volume}股, 成本${h.costPrice}, 现价${h.currentPrice}`
    ).join('\n');

    const prompt = `请深度复盘我的持仓：\n${currentHoldingsText}\n总资产：${snapshot.totalAssets}，仓位：${snapshot.positionRatio}%。请给出诊断和建议。使用 H2 标题。`;

    try {
      const result = await analyzeWithLLM(currentModel, prompt, true, settings, false, 'day', undefined, currentMarket);
      setAnalysisResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
        items: items,
        strategy_summary: summary
      };
      setTradingPlans(prev => [newPlan, ...prev]);
      setPlanPage(1);
      setIsPlanOpen(true);
    } catch (err: any) {
      setError("生成交易计划失败: " + err.message);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const togglePlanItemStatus = (planId: string, itemId: string) => {
    setTradingPlans(prev => prev.map(p => {
       if (p.id !== planId) return p;
       return {
         ...p,
         items: p.items.map(item => {
           if (item.id !== itemId) return item;
           const states = ['pending', 'completed', 'skipped', 'failed'];
           const nextIndex = (states.indexOf(item.status) + 1) % states.length;
           return { ...item, status: states[nextIndex] as any };
         })
       };
    }));
  };

  // Define the deletePlan function to resolve the 'Cannot find name' error.
  const deletePlan = (id: string) => {
    setTradingPlans(prev => prev.filter(p => p.id !== id));
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
    setJournalPage(1);
    alert("已保存到交易日志！");
  };

  const exportJournal = () => {
    const dataStr = JSON.stringify(journal, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Journal_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importJournal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) setJournal(imported);
      } catch (e) { alert("导入失败"); }
    };
    reader.readAsText(file);
  };

  const loadEntry = (entry: JournalEntry) => {
    setSnapshot(entry.snapshot);
    setAnalysisResult(entry.analysis);
    setIsHistoryOpen(false);
  };

  // --- Render Helpers ---
  const renderReportContent = (content: string) => {
    const sections = content.split(/^##\s+/gm).filter(Boolean);
    return (
      <div className="grid grid-cols-1 gap-6 p-6">
        {sections.map((sec, idx) => {
          const lines = sec.trim().split('\n');
          const title = lines[0].trim();
          const body = lines.slice(1).join('\n').trim();
          return (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                 {title}
              </h3>
              <div className="space-y-2 text-slate-600 leading-relaxed text-sm">
                 {body.split('\n').map((l, i) => <p key={i}>{l}</p>)}
              </div>
              {title.includes("建议") && (
                 <button onClick={handleGeneratePlan} disabled={generatingPlan} className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                   {generatingPlan ? <Loader2 className="w-4 h-4 animate-spin"/> : <ListTodo className="w-4 h-4"/>}
                   生成明日计划
                 </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-indigo-600" />
              智能持仓复盘 (Portfolio Review)
            </h2>
            <p className="text-sm text-slate-500 mt-1">诊断止盈止损点位，归档复盘日志。</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsPlanOpen(!isPlanOpen)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200">
              <ListTodo className="w-4 h-4" /> 交易计划
            </button>
            <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200">
              <History className="w-4 h-4" /> 历史日志
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
            <button onClick={() => fileInputRef.current?.click()} disabled={parsing} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70">
              {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {parsing ? '识别中...' : '上传截图'}
            </button>
          </div>
        </div>

        {/* --- History Drawer (Optimized with Filters & Pagination) --- */}
        {isHistoryOpen && (
          <div className="mb-6 p-6 bg-slate-50 rounded-xl border border-slate-200 animate-slide-down shadow-inner">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4" /> 历史复盘记录
              </h3>
              <div className="flex flex-wrap gap-3">
                 <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <input 
                      type="date" 
                      value={journalDateFilter} 
                      onChange={(e) => {setJournalDateFilter(e.target.value); setJournalPage(1);}}
                      className="text-xs bg-transparent border-none focus:ring-0 text-slate-600"
                    />
                    {journalDateFilter && <X className="w-3.5 h-3.5 text-slate-400 cursor-pointer" onClick={() => setJournalDateFilter('')} />}
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => importInputRef.current?.click()} className="text-xs flex items-center gap-1 text-slate-600 hover:text-indigo-600 px-3 py-1.5 bg-white border rounded-lg">
                      <Upload className="w-3 h-3" /> 导入
                    </button>
                    <button onClick={exportJournal} className="text-xs flex items-center gap-1 text-slate-600 hover:text-indigo-600 px-3 py-1.5 bg-white border rounded-lg">
                      <Download className="w-3 h-3" /> 导出
                    </button>
                    <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={importJournal} />
                 </div>
              </div>
            </div>
            
            {currentJournalItems.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-lg border border-dashed border-slate-200">
                <History className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">未找到相关记录</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {currentJournalItems.map((entry) => (
                    <div key={entry.id} onClick={() => loadEntry(entry)} className="p-4 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 cursor-pointer transition-all flex justify-between items-center group shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                             <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">{new Date(entry.timestamp).toLocaleString('zh-CN')}</div>
                            <div className="text-xs text-slate-500 mt-0.5">资产: ¥{entry.snapshot.totalAssets.toLocaleString()} | 持仓: {entry.snapshot.holdings.length}只</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  ))}
                </div>
                {totalJournalPages > 1 && (
                   <div className="flex items-center justify-center gap-4 mt-6">
                      <button 
                        disabled={journalPage === 1} 
                        onClick={() => setJournalPage(prev => prev - 1)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-xs font-bold text-slate-500">{journalPage} / {totalJournalPages}</span>
                      <button 
                        disabled={journalPage === totalJournalPages} 
                        onClick={() => setJournalPage(prev => prev + 1)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                   </div>
                )}
              </>
            )}
          </div>
        )}

        {/* --- Error --- */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700 gap-2 animate-fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* --- Holdings Table --- */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 mb-6 shadow-sm">
           <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap gap-6 justify-between items-center">
              <div className="flex items-center gap-6">
                 <div className="flex flex-col">
                   <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">账户总资产</span>
                   <div className="flex items-center gap-1.5">
                      <span className="text-lg font-black text-slate-400">¥</span>
                      <input 
                        type="number" 
                        value={snapshot.totalAssets} 
                        onChange={(e) => setSnapshot({...snapshot, totalAssets: parseFloat(e.target.value) || 0})}
                        className="bg-transparent border-b border-dashed border-slate-300 w-32 font-black text-xl text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                   </div>
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">仓位占比</span>
                   <div className="flex items-center gap-1.5">
                      <input 
                        type="number" 
                        value={snapshot.positionRatio || 0} 
                        onChange={(e) => setSnapshot({...snapshot, positionRatio: parseFloat(e.target.value) || 0})}
                        className="bg-transparent border-b border-dashed border-slate-300 w-16 font-black text-xl text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-lg font-black text-slate-400">%</span>
                   </div>
                 </div>
              </div>
              <button onClick={addEmptyHolding} className="text-xs font-bold text-indigo-600 bg-indigo-50/50 px-4 py-2 rounded-lg hover:bg-indigo-50 border border-indigo-100 transition-all">
                 + 手动添加持仓
              </button>
           </div>
           
           <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200">
                 <tr>
                    <th className="px-6 py-4">标的详情</th>
                    <th className="px-6 py-4">持仓/成本</th>
                    <th className="px-6 py-4">现价</th>
                    <th className="px-6 py-4">浮动盈亏</th>
                    <th className="px-6 py-4 text-right">操作</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                 {snapshot.holdings.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                       {editingIndex === idx ? (
                          <>
                            <td className="px-6 py-4">
                              <input className="w-full p-2 border rounded text-xs mb-1" value={editForm?.name} onChange={e => setEditForm({...editForm!, name: e.target.value})} />
                              <input className="w-full p-2 border rounded text-xs font-mono" value={editForm?.code} onChange={e => setEditForm({...editForm!, code: e.target.value})} />
                            </td>
                            <td className="px-6 py-4">
                              <input type="number" className="w-full p-2 border rounded mb-1" value={editForm?.volume} onChange={e => setEditForm({...editForm!, volume: parseFloat(e.target.value)})} />
                              <input type="number" className="w-full p-2 border rounded" value={editForm?.costPrice} onChange={e => setEditForm({...editForm!, costPrice: parseFloat(e.target.value)})} />
                            </td>
                            <td className="px-6 py-4"><input type="number" className="w-full p-2 border rounded" value={editForm?.currentPrice} onChange={e => setEditForm({...editForm!, currentPrice: parseFloat(e.target.value)})} /></td>
                            <td className="px-6 py-4 text-slate-300 text-xs">自动计算</td>
                            <td className="px-6 py-4 text-right">
                               <button onClick={saveEdit} className="p-2 text-green-600"><Check className="w-5 h-5"/></button>
                               <button onClick={() => setEditingIndex(null)} className="p-2 text-slate-400"><X className="w-5 h-5"/></button>
                            </td>
                          </>
                       ) : (
                          <>
                            <td className="px-6 py-4">
                               <div className="font-bold text-slate-800">{item.name}</div>
                               <div className="text-[10px] font-mono text-slate-400">{item.code}</div>
                            </td>
                            <td className="px-6 py-4">
                               <div className="text-slate-600 font-medium">{item.volume} 股</div>
                               <div className="text-xs text-slate-400">成本: {item.costPrice}</div>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-700">{item.currentPrice}</td>
                            <td className="px-6 py-4">
                               <div className={`font-black ${item.profit >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{item.profit > 0 ? '+' : ''}{item.profit}</div>
                               <div className={`text-[10px] font-bold ${item.profit >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{item.profitRate}</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <button onClick={() => startEdit(idx, item)} className="p-2 text-slate-300 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                               <button onClick={() => deleteHolding(idx)} className="p-2 text-slate-300 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </>
                       )}
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

        <div className="flex justify-end pt-4">
           <button onClick={handleAnalyze} disabled={loading || snapshot.holdings.length === 0} className="flex items-center gap-2 px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black shadow-lg shadow-slate-200 transition-all disabled:opacity-50 active:scale-95">
             {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
             {loading ? 'AI 复盘中...' : '开始深度复盘诊断'}
           </button>
        </div>
      </div>

      {/* --- Analysis Result --- */}
      {analysisResult && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-slide-up">
           <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex gap-4">
                <button onClick={() => setActiveTab('report')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'report' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>分析报告</button>
                <button onClick={() => setActiveTab('charts')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'charts' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>可视化</button>
              </div>
              <button onClick={saveToJournal} className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50">
                 <Save className="w-4 h-4" /> 保存日志
              </button>
           </div>
           <div className="bg-slate-50/50 min-h-[400px]">
             {activeTab === 'report' ? renderReportContent(analysisResult.content) : <div className="p-20 text-center text-slate-400">图表统计建设中...</div>}
           </div>
        </div>
      )}

      {/* --- Trading Plan Section (Optimized with Pagination) --- */}
      {isPlanOpen && (
           <div className="mt-8 bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden animate-slide-up shadow-inner p-8">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="font-black text-2xl text-slate-800 flex items-center gap-3">
                   <ListTodo className="w-8 h-8 text-emerald-600"/>
                   明日交易执行计划
                 </h3>
                 <div className="text-xs font-bold text-slate-400 bg-white px-4 py-2 rounded-full border border-slate-200">
                    共归档 {tradingPlans.length} 份计划
                 </div>
              </div>
              
              <div className="space-y-8">
                 {currentPlanItems.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-300">
                       <ClipboardList className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                       <p className="text-slate-400 font-bold">暂无生效计划，请先进行持仓复盘。</p>
                    </div>
                 ) : (
                    currentPlanItems.map((plan) => (
                       <div key={plan.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden border-l-[12px] border-l-emerald-500">
                          <div className="bg-slate-50/50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
                             <div className="flex items-center gap-4">
                                <span className="font-black text-slate-800 text-lg">{plan.target_date}</span>
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">Active Execution</span>
                             </div>
                             <button onClick={() => deletePlan(plan.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                               <Trash2 className="w-5 h-5"/>
                             </button>
                          </div>
                          <div className="p-8">
                             <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 italic text-slate-600 leading-relaxed font-medium">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">策略核心摘要</div>
                                "{plan.strategy_summary}"
                             </div>
                             <div className="grid grid-cols-1 gap-4">
                                {plan.items.map((item) => (
                                   <div 
                                      key={item.id} 
                                      className={`flex items-center gap-6 p-6 rounded-2xl border transition-all cursor-pointer group ${
                                         item.status === 'completed' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-indigo-300'
                                      }`}
                                      onClick={() => togglePlanItemStatus(plan.id, item.id)}
                                   >
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all ${
                                         item.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 group-hover:border-indigo-500'
                                      }`}>
                                         {item.status === 'completed' && <Check className="w-5 h-5" />}
                                      </div>
                                      <div className="flex-1">
                                         <div className="flex items-center gap-4 mb-1">
                                            <span className={`text-xl font-black ${item.status === 'completed' ? 'text-emerald-900 line-through opacity-50' : 'text-slate-800'}`}>{item.symbol}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                                               item.action === 'buy' ? 'bg-rose-500 text-white' : 
                                               item.action === 'sell' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white'
                                            }`}>{item.action}</span>
                                         </div>
                                         <div className="text-sm text-slate-500 font-medium">
                                            <span className="font-bold text-slate-900 mr-2">目标价: {item.price_target}</span>
                                            <span className="opacity-70">| {item.reason}</span>
                                         </div>
                                      </div>
                                      <div className={`text-[10px] font-black uppercase tracking-widest ${
                                        item.status === 'completed' ? 'text-emerald-600' : 'text-slate-300'
                                      }`}>
                                         {item.status}
                                      </div>
                                   </div>
                                ))}
                             </div>
                          </div>
                       </div>
                    ))
                 )}
              </div>
              
              {totalPlanPages > 1 && (
                 <div className="flex items-center justify-center gap-6 mt-12">
                    <button 
                      disabled={planPage === 1} 
                      onClick={() => setPlanPage(prev => prev - 1)}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-indigo-500 disabled:opacity-20 transition-all"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex gap-2">
                       {Array.from({length: totalPlanPages}).map((_, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full transition-all ${planPage === i + 1 ? 'w-8 bg-indigo-600' : 'bg-slate-300'}`}></div>
                       ))}
                    </div>
                    <button 
                      disabled={planPage === totalPlanPages} 
                      onClick={() => setPlanPage(prev => prev + 1)}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-indigo-500 disabled:opacity-20 transition-all"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                 </div>
              )}
           </div>
        )}
    </div>
  );
};
