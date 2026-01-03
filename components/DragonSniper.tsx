import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, MarketType, AnalysisResult, SnipeTarget, SnipeVerificationResponse, AuctionDecisionResponse, SniperHistoryEntry } from '../types';
import { fetchDragonSniperAnalysis, verifySnipeSuccess, fetchAuctionDecision } from '../services/geminiService';
// Added Save to the imported icons from lucide-react
import { Crosshair, Loader2, Search, Zap, ShieldAlert, Target, Activity, Flame, ArrowRight, ShieldCheck, TrendingUp, Info, Camera, X, ImageIcon, Eye, Sparkles, Sword, AlertTriangle, Gauge, Rocket, ListChecks, FileImage, ShieldCheck as SafetyIcon, TrendingDown, LayoutGrid, Clock, CalendarRange, CheckCircle2, History, Flag, Download, Upload, Trash2, Gavel, Save } from 'lucide-react';

export const DragonSniper: React.FC<{
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: any;
  onOpenSettings: () => void;
}> = ({ currentModel, currentMarket, settings, onOpenSettings }) => {
  const [candidates, setCandidates] = useState('');
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // History State
  const [history, setHistory] = useState<SniperHistoryEntry[]>(() => {
    const saved = localStorage.getItem('qm_sniper_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Local Results (Current Session)
  const [verifications, setVerifications] = useState<Record<number, SnipeVerificationResponse>>({});
  const [decisions, setDecisions] = useState<Record<number, AuctionDecisionResponse>>({});
  const [verifyingIdx, setVerifyingIdx] = useState<number | null>(null);
  const [decidingIdx, setDecidingIdx] = useState<number | null>(null);

  // Refs for uploads
  const candidateInputRef = useRef<HTMLInputElement>(null);
  const sentimentInputRef = useRef<HTMLInputElement>(null);
  const auctionInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [candidateImage, setCandidateImage] = useState<string | null>(null);
  const [candidatePreview, setCandidatePreview] = useState<string | null>(null);
  const [sentimentImage, setSentimentImage] = useState<string | null>(null);
  const [sentimentPreview, setSentimentPreview] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('qm_sniper_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => setElapsed(p => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, setter: any, previewSetter: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fullData = reader.result as string;
        previewSetter(fullData);
        setter(fullData.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!candidateImage && !candidates.trim()) {
      setError("请上传候选名单截图或手动输入标的");
      return;
    }
    if (!settings.geminiKey) {
      onOpenSettings();
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setVerifications({});
    setDecisions({});
    try {
      const data = await fetchDragonSniperAnalysis(candidates, theme, candidateImage, sentimentImage, settings.geminiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "狙击审计失败");
    } finally {
      setLoading(false);
    }
  };

  const handleAuctionAudit = async (idx: number, target: SnipeTarget) => {
    if (!settings.geminiKey) return;
    setDecidingIdx(idx);
    
    // Create a temporary file input for the auction screenshot
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          try {
            const strategy = `竞价条件：${target.trigger_conditions.auction_volume}, 策略：${target.trigger_conditions.opening_strategy}`;
            const decisionData = await fetchAuctionDecision(`${target.name} (${target.code})`, base64, strategy, settings.geminiKey);
            if (decisionData.auctionDecisionData) {
              setDecisions(prev => ({ ...prev, [idx]: decisionData.auctionDecisionData! }));
            }
          } catch (err) { alert("竞价审计失败"); }
          finally { setDecidingIdx(null); }
        };
        reader.readAsDataURL(file);
      } else {
        setDecidingIdx(null);
      }
    };
    input.click();
  };

  const handleVerify = async (idx: number, target: SnipeTarget) => {
    if (!result || !settings.geminiKey) return;
    setVerifyingIdx(idx);
    try {
      const strategy = `竞价条件：${target.trigger_conditions.auction_volume}, 策略：${target.trigger_conditions.opening_strategy}`;
      const verifyData = await verifySnipeSuccess(`${target.name} (${target.code})`, result.timestamp, strategy, settings.geminiKey);
      if (verifyData.snipeVerificationData) {
        setVerifications(prev => ({ ...prev, [idx]: verifyData.snipeVerificationData! }));
      }
    } catch (err) { alert("战果核验失败"); }
    finally { setVerifyingIdx(null); }
  };

  const saveToHistory = () => {
    if (!result?.dragonSniperData) return;
    const entry: SniperHistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      marketData: result.dragonSniperData,
      decisions,
      verifications
    };
    setHistory(prev => [entry, ...prev]);
    alert("已保存到狙击中心历史记录");
  };

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QM_Sniper_History_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          setHistory(imported);
          alert("导入成功");
        }
      } catch { alert("导入失败"); }
    };
    reader.readAsText(file);
  };

  const formatConfidence = (val: number | undefined) => {
    if (val === undefined || val === null) return 0;
    let num = Number(val);
    if (num > 0 && num < 1.0) num = num * 100;
    return Math.round(num);
  };

  const d = result?.dragonSniperData;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Visual Workflow Header */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 md:p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 mb-4">
                <div className="p-3 bg-rose-600 rounded-2xl text-white shadow-xl">
                  <Crosshair className="w-8 h-8" />
                </div>
                狙击手战位：视觉决胜版 (Dragon Sniper v2.0)
              </h2>
              <p className="text-slate-500 text-base max-w-2xl font-medium leading-relaxed">
                全链路狙击审计：<b>1. 前日研判</b> &rarr; <b>2. 9:25 竞解决胜 (New)</b> &rarr; <b>3. 战后核验</b>。
              </p>
            </div>
            <div className="flex gap-2">
               <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={importHistory} />
               <button onClick={() => importInputRef.current?.click()} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-slate-100" title="导入历史记录"><Upload className="w-5 h-5" /></button>
               <button onClick={exportHistory} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-slate-100" title="导出备份"><Download className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">步骤 1: 候选名单截图</label>
                   <div onClick={() => candidateInputRef.current?.click()} className={`h-48 rounded-[2rem] border-4 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${candidatePreview ? 'border-rose-200' : 'border-slate-200 bg-slate-50'}`}>
                      {candidatePreview ? <img src={candidatePreview} className="h-full w-full object-contain p-2 rounded-2xl" /> : <div className="text-center p-4"><FileImage className="w-8 h-8 text-slate-300 mx-auto mb-1"/><p className="text-[10px] font-black text-slate-400">点击上传首板名单</p></div>}
                      <input type="file" ref={candidateInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setCandidateImage, setCandidatePreview)} />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">步骤 2: 盘面情绪截图</label>
                   <div onClick={() => sentimentInputRef.current?.click()} className={`h-48 rounded-[2rem] border-4 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${sentimentPreview ? 'border-indigo-200' : 'border-slate-200 bg-slate-50'}`}>
                      {sentimentPreview ? <img src={sentimentPreview} className="h-full w-full object-contain p-2 rounded-2xl" /> : <div className="text-center p-4"><Camera className="w-8 h-8 text-slate-300 mx-auto mb-1"/><p className="text-[10px] font-black text-slate-400">点击上传行情分布</p></div>}
                      <input type="file" ref={sentimentInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setSentimentImage, setSentimentPreview)} />
                   </div>
                </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">步骤 3: 预设主线 (纠偏模式)</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                     <input type="text" value={theme} onChange={e => setTheme(e.target.value)} placeholder="留空由 AI 自动探测..." className="flex-1 h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
                     <button onClick={handleAnalyze} disabled={loading} className="shrink-0 px-10 h-14 bg-rose-600 text-white rounded-2xl font-black shadow-xl hover:bg-rose-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                       {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sword className="w-5 h-5" />}
                       {loading ? '全网研判中' : '执行战前部署'}
                     </button>
                  </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6">
               <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 flex-1">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">手动补充</h4>
                  <textarea value={candidates} onChange={e => setCandidates(e.target.value)} placeholder="补充代码或名称..." className="w-full h-full min-h-[100px] p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-rose-200 outline-none font-bold text-xs" />
               </div>
               {result && <button onClick={saveToHistory} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"><Save className="w-4 h-4" /> 存档本轮狙击</button>}
            </div>
          </div>
        </div>
      </div>

      {loading && <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200 animate-pulse"><Crosshair className="w-16 h-16 text-rose-300 animate-spin-slow mb-6" /><p className="text-slate-600 font-black text-xl">正在探测活跃主线并对齐 OCR 标的...</p></div>}

      {d && (
        <div className="space-y-10 animate-slide-up">
           <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
              <div className="absolute right-0 top-0 p-4 opacity-5 pointer-events-none"><Rocket className="w-80 h-80 text-rose-100" /></div>
              <div className="relative z-10 flex-1">
                 <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="px-4 py-1.5 bg-rose-600 rounded-xl text-xs font-black uppercase tracking-widest">审计主线：{d.detected_main_theme}</span>
                    <span className="px-4 py-1.5 bg-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest border border-indigo-400">周期：{d.theme_cycle_stage}</span>
                 </div>
                 <h3 className="text-3xl font-black mb-6">市场情报审计结论</h3>
                 <div className="bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 italic text-lg font-bold text-slate-200 leading-relaxed">"{d.market_sentiment_audit}"</div>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {d.selected_targets.map((target, idx) => (
                 <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-2xl transition-all flex flex-col h-full border-b-8 border-rose-50">
                    <div className="p-8 flex-1">
                       <div className="flex justify-between items-start mb-8">
                          <div>
                             <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 bg-rose-50 rounded text-[9px] font-black text-rose-600 border border-rose-100 uppercase">Target #{idx + 1}</span>
                                <span className="px-2 py-0.5 bg-indigo-50 rounded text-[9px] font-black text-indigo-600 border border-indigo-100 uppercase">Purity: {target.theme_purity}%</span>
                             </div>
                             <h4 className="text-3xl font-black text-slate-800">{target.name}</h4>
                             <div className="text-xs font-mono text-slate-400 mt-1">{target.code}</div>
                          </div>
                          <div className="text-center bg-rose-50 p-4 rounded-2xl border border-rose-100 min-w-[100px]">
                             <div className="text-3xl font-black text-rose-600">{formatConfidence(target.confidence)}%</div>
                             <div className="text-[9px] font-black text-rose-400 uppercase tracking-widest mt-1">连板确定性</div>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100"><p className="text-sm text-slate-700 font-bold leading-relaxed">{target.reason_for_board}</p></div>
                          <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100/50 italic text-sm text-indigo-900 font-black leading-relaxed">"{target.snipe_logic}"</div>
                       </div>
                    </div>

                    {/* Battle Plan Footer - NEW Auction Audit logic */}
                    <div className="px-8 py-8 bg-slate-900 text-white flex flex-col gap-6">
                       <div className="text-xs font-black text-rose-500 uppercase tracking-[0.3em] flex justify-between items-center border-b border-white/10 pb-4">
                          <div className="flex items-center gap-2"><Sword className="w-4 h-4" /> 狙击决胜计划表</div>
                          <div className="flex gap-2">
                            <button onClick={() => handleAuctionAudit(idx, target)} disabled={decidingIdx !== null} className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-500 rounded-lg text-[9px] font-black uppercase transition-all shadow-lg animate-pulse">
                               {decidingIdx === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gavel className="w-3 h-3" />}
                               竞价审计 (9:25)
                            </button>
                            <button onClick={() => handleVerify(idx, target)} disabled={verifyingIdx !== null} className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-indigo-600 rounded-lg text-[9px] font-black uppercase transition-all">
                               {verifyingIdx === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <History className="w-3 h-3" />}
                               核验战果
                            </button>
                          </div>
                       </div>

                       {/* AUCTION DECISION DISPLAY (NEW) */}
                       {decisions[idx] && (
                         <div className={`p-5 rounded-2xl animate-slide-down border-2 shadow-2xl ${
                           decisions[idx].verdict === '立即出击' ? 'bg-rose-600/90 border-rose-400' : 'bg-slate-800/90 border-slate-600'
                         }`}>
                            <div className="flex justify-between items-center mb-3">
                               <div className="text-white font-black text-xs uppercase flex items-center gap-2">
                                  <ShieldCheck className="w-4 h-4" /> 竞价决胜指令
                               </div>
                               <span className={`px-3 py-1 rounded text-xs font-black ${
                                 decisions[idx].verdict === '立即出击' ? 'bg-white text-rose-600 shadow-xl' : 'bg-slate-700 text-slate-300'
                               }`}>{decisions[idx].verdict}</span>
                            </div>
                            <div className="space-y-2">
                               <p className="text-white font-bold text-sm leading-relaxed">{decisions[idx].reasoning}</p>
                               <div className="flex flex-wrap gap-2 pt-2 mt-2 border-t border-white/10">
                                  <span className="px-2 py-0.5 bg-black/20 rounded text-[10px] font-black">配合度: {decisions[idx].match_score}%</span>
                                  <span className="px-2 py-0.5 bg-black/20 rounded text-[10px] font-black">动作: {decisions[idx].suggested_entry_type}</span>
                               </div>
                            </div>
                         </div>
                       )}

                       {verifications[idx] && (
                         <div className="p-4 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl animate-slide-down">
                            <div className="flex justify-between items-center mb-2">
                               <div className="text-indigo-300 font-black text-[9px] uppercase flex items-center gap-2"><Flag className="w-3 h-3" /> 战后复盘</div>
                               <span className={`px-2 py-0.5 rounded text-[9px] font-black ${verifications[idx].is_success ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{verifications[idx].is_success ? '狙击大获全胜' : '失败/陷阱'}</span>
                            </div>
                            <p className="text-indigo-100 font-bold text-[11px] mb-1">实际：{verifications[idx].actual_result}</p>
                            <p className="text-slate-400 italic text-[11px]">{verifications[idx].battle_review}</p>
                         </div>
                       )}

                       <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-3 bg-white/5 rounded-2xl border border-white/10"><div className="text-[8px] text-slate-400 font-black mb-1 uppercase">竞价预设</div><div className="text-xs font-black text-rose-400">{target.trigger_conditions.auction_volume}</div></div>
                          <div className="p-3 bg-white/5 rounded-2xl border border-white/10"><div className="text-[8px] text-slate-400 font-black mb-1 uppercase">量比锚点</div><div className="text-xs font-black text-white">{target.trigger_conditions.volume_ratio_target}</div></div>
                          <div className="p-3 bg-white/5 rounded-2xl border border-white/10"><div className="text-[8px] text-slate-400 font-black mb-1 uppercase">离场保护</div><div className="text-xs font-black text-emerald-400">{target.stop_loss}</div></div>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* History History View */}
      {history.length > 0 && !result && (
        <div className="space-y-6">
           <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest px-4 flex items-center gap-2"><History className="w-5 h-5"/> 狙击中心历史记录</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((h) => (
                <div key={h.id} onClick={() => setResult({ content: "", timestamp: h.timestamp, modelUsed: ModelProvider.GEMINI_INTL, dragonSniperData: h.marketData })} className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-indigo-400 transition-all cursor-pointer group shadow-sm">
                   <div className="flex justify-between items-start mb-4">
                      <div className="text-xs font-mono text-slate-400">{new Date(h.timestamp).toLocaleString()}</div>
                      <button onClick={(e) => { e.stopPropagation(); setHistory(prev => prev.filter(x => x.id !== h.id)); }} className="p-2 text-slate-300 hover:text-rose-600 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                   </div>
                   <div className="font-black text-slate-800 text-lg group-hover:text-indigo-600">主题: {h.marketData.detected_main_theme}</div>
                   <div className="mt-2 text-xs text-slate-500">捕捉标的: {h.marketData.selected_targets.map(t => t.name).join(', ')}</div>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};