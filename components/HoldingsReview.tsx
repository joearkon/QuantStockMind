
import React, { useState, useEffect, useRef } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HoldingsSnapshot, HoldingItemDetailed, JournalEntry, DailyTradingPlan, PlanItem } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { parseBrokerageScreenshot, extractTradingPlan } from '../services/geminiService';
import { Upload, Loader2, Save, History, Trash2, Camera, Edit2, Check, X, FileJson, TrendingUp, AlertTriangle, ListTodo, Calendar, Download, FileText, ChevronRight, LayoutGrid, CheckCircle2, XCircle, MoreHorizontal, Info, Target, ShieldCheck, Activity, ArrowRightCircle, DatabaseBackup, FileOutput, FileInput, CheckCircle } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';

const STORAGE_KEYS = {
  JOURNAL: 'qm_journal_v2',
  PLANS: 'qm_trading_plans_v2'
};

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
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.JOURNAL);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [tradingPlans, setTradingPlans] = useState<DailyTradingPlan[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PLANS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'report' | 'plans'>('report');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState("");
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(journal));
    } catch (e) {}
  }, [journal]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(tradingPlans));
    } catch (e) {}
  }, [tradingPlans]);

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleExportData = () => {
    try {
      const dataToExport = { version: "1.1", journal, tradingPlans };
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QuantMind_Backup.json`;
      link.click();
    } catch (err) {
      setError("导出失败");
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (window.confirm("确定要合并导入吗？")) {
          setJournal(prev => [...(imported.journal || []), ...prev].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i));
          setTradingPlans(prev => [...(imported.tradingPlans || []), ...prev].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i));
          alert("导入成功！");
        }
      } catch (err) {
        setError("文件解析失败");
      }
    };
    reader.readAsText(file);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        try {
          const parsedData = await parseBrokerageScreenshot(base64String, settings.geminiKey);
          setSnapshot({ ...parsedData, totalAssets: parsedData.totalAssets || 0, date: new Date().toISOString().split('T')[0] });
        } catch (err: any) {
          setError("识别失败");
        } finally {
          setParsing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setParsing(false);
    }
  };

  const handleAnalyze = async () => {
    if (snapshot.holdings.length === 0) {
      setError("请先上传持仓截图");
      return;
    }
    setLoading(true);
    setAnalysisResult(null);
    setError(null);
    setSaveStatus('idle');
    setLoadingPhase("正在联网检索 L2 资金数据...");
    const prompt = `分析持仓。总资产: ¥${snapshot.totalAssets}。标的: ${snapshot.holdings.map(h => `${h.name}: ${h.profitRate}`).join(', ')}。请用 Markdown 格式输出。`;
    try {
      const result = await analyzeWithLLM(currentModel, prompt, true, settings, false, 'day', undefined, currentMarket);
      setAnalysisResult(result);
      setActiveTab('report');
    } catch (err: any) {
      setError(err.message || "分析请求失败");
    } finally {
      setLoading(false);
    }
  };

  const formatText = (text: string) => {
    if (!text) return "";
    let formatted = text.trim();
    formatted = formatted.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="text-slate-900 italic font-black bg-yellow-50 px-1 rounded">$1</strong>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-black">$1</strong>');
    formatted = formatted.split('\n').map(line => {
      if (line.trim().startsWith('* ')) {
        return `<div class="flex gap-2 items-start mb-1.5"><span class="mt-2.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span><span>${line.trim().substring(2)}</span></div>`;
      }
      return line.replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>');
    }).join('\n');
    return formatted;
  };

  const renderReportContent = (content: string) => {
    if (!content) return <div className="p-8 text-slate-400">无内容显示</div>;
    const sections = content.split(/^(?:#+|####)\s+/gm).filter(Boolean);
    if (sections.length <= 1) {
      return <div className="p-8 bg-white rounded-2xl border border-slate-200 text-base text-slate-700 leading-relaxed whitespace-pre-wrap">{content}</div>;
    }
    return (
      <div className="space-y-6">
        {sections.map((sec, idx) => {
          const lines = sec.trim().split('\n');
          const title = lines[0].replace(/[#*]/g, '').trim();
          const body = lines.slice(1).join('\n').trim();
          let Icon = Activity;
          if (title.includes("指令") || title.includes("操盘")) Icon = Target;
          return (
            <div key={idx} className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-8 py-4 bg-slate-50 border-b flex items-center gap-2">
                <Icon className="w-5 h-5 text-indigo-500" />
                <h3 className="font-black text-slate-800 text-lg">{title}</h3>
              </div>
              <div className="p-8 text-base text-slate-700 leading-relaxed space-y-3">
                 {body.split('\n').filter(l => l.trim()).map((line, li) => (
                    <div key={li} dangerouslySetInnerHTML={{__html: formatText(line)}} />
                 ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const saveToJournal = () => {
    if (!analysisResult || saveStatus === 'saved') return;
    setSaveStatus('saving');
    const entry: JournalEntry = { id: generateId(), timestamp: Date.now(), snapshot: { ...snapshot }, analysis: analysisResult };
    setJournal(prev => [entry, ...prev]);
    setTimeout(() => { setSaveStatus('saved'); setIsHistoryOpen(true); setTimeout(() => setSaveStatus('idle'), 3000); }, 500);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp className="w-40 h-40" /></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div><h2 className="text-3xl font-black mb-2 flex items-center gap-3"><LayoutGrid className="w-8 h-8 text-indigo-400" />智能复盘系统</h2></div>
          <div className="flex gap-2">
            <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-bold border border-white/10 text-sm">历史记录</button>
            <button onClick={handleExportData} className="p-2.5 bg-white/10 hover:bg-indigo-500/30 rounded-xl border border-white/10"><FileOutput className="w-4 h-4" /></button>
            <input type="file" ref={importFileRef} className="hidden" accept=".json" onChange={handleImportData} />
            <button onClick={() => importFileRef.current?.click()} className="p-2.5 bg-white/10 hover:bg-emerald-500/30 rounded-xl border border-white/10"><FileInput className="w-4 h-4" /></button>
            <div className="h-10 w-[1px] bg-white/10 mx-1 self-center" />
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            <button onClick={() => fileInputRef.current?.click()} disabled={parsing} className="px-6 py-2.5 rounded-xl font-black bg-indigo-600 hover:bg-indigo-700 shadow-xl">{parsing ? '正在提取...' : '上传截图'}</button>
          </div>
        </div>
      </div>

      {isHistoryOpen && (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm animate-slide-down space-y-4">
           <div className="flex justify-between items-center px-2"><h4 className="text-xs font-black text-slate-400 uppercase">历史库 ({journal.length})</h4></div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {journal.length === 0 ? (<div className="col-span-3 text-center py-8 text-slate-300 font-bold border border-dashed rounded-2xl">暂无记录</div>) 
            : journal.map((j) => (
              <div key={j.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 cursor-pointer" onClick={() => { setSnapshot(j.snapshot); setAnalysisResult(j.analysis); }}>
                <div className="text-[10px] font-black text-slate-400 mb-2">{new Date(j.timestamp).toLocaleString()}</div>
                <div className="text-sm font-bold text-slate-800">总资产: ¥{j.snapshot.totalAssets.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 flex items-center gap-3 font-bold animate-fade-in"><AlertTriangle className="w-5 h-5" /> {error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-6">当前持仓快照</h3>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <div className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">总资产</div>
                <div className="text-lg font-black text-slate-800 tracking-tight">¥{snapshot.totalAssets.toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <div className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">仓位比例</div>
                <div className="text-lg font-black text-indigo-600">{snapshot.positionRatio || '--'}%</div>
              </div>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {snapshot.holdings.map((h, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center hover:bg-white transition-all">
                  <div><div className="font-black text-slate-800 truncate max-w-[120px]">{h.name}</div><div className="text-[10px] font-mono text-slate-400">{h.code}</div></div>
                  <div className="text-right font-black text-rose-500">{h.profitRate}</div>
                </div>
              ))}
            </div>
            <button onClick={handleAnalyze} disabled={loading || snapshot.holdings.length === 0} className="w-full mt-8 h-14 bg-slate-900 text-white rounded-2xl font-black shadow-xl">
              {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : '开始全维度审计'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {(loading || analysisResult) && (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
              <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex gap-6">
                  <button onClick={() => setActiveTab('report')} className={`pb-4 text-sm font-black border-b-4 ${activeTab === 'report' ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent'}`}>AI 审计报告</button>
                </div>
                {activeTab === 'report' && analysisResult && !loading && (
                  <button onClick={saveToJournal} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                    {saveStatus === 'saved' ? '已入库' : '存入复盘日志'}
                  </button>
                )}
              </div>
              <div className="p-8">
                {loading ? <div className="py-40 flex flex-col items-center justify-center text-slate-400"><Loader2 className="w-16 h-16 animate-spin mb-6 text-indigo-600" /><p className="text-xl font-black text-slate-800">{loadingPhase}</p></div>
                : renderReportContent(analysisResult.content)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
