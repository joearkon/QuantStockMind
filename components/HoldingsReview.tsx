import React, { useState, useEffect, useRef } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HoldingsSnapshot, HoldingItemDetailed, JournalEntry } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { parseBrokerageScreenshot } from '../services/geminiService';
import { Upload, Loader2, Save, Download, UploadCloud, History, Trash2, Camera, Edit2, Check, X, FileJson, TrendingUp, AlertTriangle, PieChart as PieChartIcon, Activity, Target, ClipboardList, BarChart3, Crosshair } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface HoldingsReviewProps {
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: UserSettings;
  onOpenSettings?: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export const HoldingsReview: React.FC<HoldingsReviewProps> = ({
  currentModel,
  currentMarket,
  settings,
  onOpenSettings
}) => {
  // --- State ---
  const [snapshot, setSnapshot] = useState<HoldingsSnapshot>({
    totalAssets: 0,
    date: new Date().toISOString().split('T')[0],
    holdings: []
  });
  
  const [journal, setJournal] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem('qm_journal');
    return saved ? JSON.parse(saved) : [];
  });

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'report' | 'charts'>('report');
  
  // Editing State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<HoldingItemDetailed | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('qm_journal', JSON.stringify(journal));
  }, [journal]);

  // --- Handlers: Screenshot ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!settings.geminiKey) {
      setError("截图识别需要 Google Gemini API Key。请在设置中配置。");
      onOpenSettings?.();
      return;
    }

    setParsing(true);
    setError(null);

    try {
      // Convert to Base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        try {
          const parsedData = await parseBrokerageScreenshot(base64String, settings.geminiKey);
          // Merge logic: Don't overwrite if parsed data is empty/partial, but here we assume generic success
          setSnapshot({
            ...parsedData,
            date: new Date().toISOString().split('T')[0] // Reset date to today
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

  // --- Handlers: Editing ---
  const startEdit = (index: number, item: HoldingItemDetailed) => {
    setEditingIndex(index);
    setEditForm({ ...item });
  };

  const saveEdit = () => {
    if (editForm && editingIndex !== null) {
      const newHoldings = [...snapshot.holdings];
      // Auto calc market value if missing
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
        marketValue: 0
      }]
    }));
    setEditingIndex(snapshot.holdings.length); // Start editing the new one immediately
    setEditForm({
        name: "新标的",
        code: "",
        volume: 0,
        costPrice: 0,
        currentPrice: 0,
        profit: 0,
        profitRate: "0%",
        marketValue: 0
    });
  };

  // --- Handlers: Analysis ---
  const handleAnalyze = async () => {
    if (snapshot.holdings.length === 0) {
      setError("持仓列表为空，请先添加持仓");
      return;
    }

    setLoading(true);
    setAnalysisResult(null);
    setError(null);
    setActiveTab('report'); // Switch to report tab on new analysis

    const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;
    
    // Construct structured prompt
    const holdingsText = snapshot.holdings.map((h, i) => 
      `${i+1}. ${h.name} (${h.code}): 持仓${h.volume}股, 成本${h.costPrice}, 现价${h.currentPrice}, 浮动盈亏 ${h.profit} (${h.profitRate})`
    ).join('\n');

    const prompt = `
      请作为一位【资深交易员】和【技术分析专家】，对我当前的 ${marketLabel} 账户进行深度复盘分析。

      【账户概况】
      - 总资产: ${snapshot.totalAssets} 元
      - 交易日期: ${snapshot.date}

      【详细持仓】
      ${holdingsText}
      
      【核心痛点解决】
      用户自述：“买入很果断，但不知道什么时候卖出”。请重点针对【止盈止损 (Take Profit / Stop Loss)】进行明确指导。

      【分析任务】
      请结合联网搜索（获取最新行情、公告、舆情），对我的每一只持仓进行诊断。
      请按以下结构输出 Markdown（请严格使用 H2 "##" 作为一级标题）：

      ## 1. 盈亏诊断与心理按摩
      - 基于成本价和现价，判断当前是获利回吐、深套、还是刚刚起涨？
      - 针对当前的盈亏比例，给出心理建议（如：深套20%是否应该割肉换股？）。
      
      ## 2. K线形态与关键点位
      - **K线形态分析**: 识别当前形态（如：吊颈线、红三兵、三角形整理）。
      - **必填项**: 为每一只持仓设定明确的【止盈价 (Target Sell)】和【止损价 (Stop Loss)】。
      - 简述设定这两个价格的逻辑（如：跌破20日线止损，触及前高止盈）。

      ## 3. 实战操作建议
      - 给出明确指令：【加仓 / 减仓 / 做T / 清仓 / 锁仓】。
      - 结合"成本优势"或"成本劣势"来制定策略。

      ## 4. 账户总方针
      - 评估整体仓位的风险敞口。
      - 对接下来的操作给出一个总方针。

      请语言简练、犀利，直击要害。
    `;

    try {
      // Analyze with selected model (Supports Hunyuan or Gemini)
      // We assume isComplex=true to force search if available/supported
      const result = await analyzeWithLLM(currentModel, prompt, true, settings, false, 'day', undefined, currentMarket);
      setAnalysisResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers: Journal ---
  const saveToJournal = () => {
    if (!analysisResult) return;
    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      snapshot: { ...snapshot },
      analysis: analysisResult,
      note: ""
    };
    setJournal(prev => [newEntry, ...prev]);
    alert("已保存到交易日志！");
  };

  const exportJournal = () => {
    const dataStr = JSON.stringify(journal, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QuantMind_Journal_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importJournal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          setJournal(imported);
          alert(`成功导入 ${imported.length} 条记录`);
        }
      } catch (e) {
        alert("导入失败：文件格式错误");
      }
    };
    reader.readAsText(file);
  };

  const loadEntry = (entry: JournalEntry) => {
    setSnapshot(entry.snapshot);
    setAnalysisResult(entry.analysis);
    setIsHistoryOpen(false);
  };

  // --- Render Helper ---
  const renderReportContent = (content: string) => {
    // Split by H2 headers
    const sections = content.split(/^##\s+/gm).filter(Boolean);

    if (sections.length === 0) {
      // Fallback for raw text
      return (
        <div className="prose prose-slate max-w-none p-6" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 p-6">
        {sections.map((sec, idx) => {
          const lines = sec.trim().split('\n');
          const title = lines[0].trim();
          const body = lines.slice(1).join('\n').trim();
          
          let Icon = FileJson;
          let headerColor = "text-slate-800";
          let iconBg = "bg-slate-100";
          let cardBorder = "border-slate-200";

          // Theme based on title keywords
          if (title.includes("盈亏") || title.includes("心理")) {
            Icon = PieChartIcon;
            headerColor = "text-rose-700";
            iconBg = "bg-rose-100";
            cardBorder = "border-rose-100";
          } else if (title.includes("K线") || title.includes("关键") || title.includes("波浪")) {
            Icon = Activity;
            headerColor = "text-blue-700";
            iconBg = "bg-blue-100";
            cardBorder = "border-blue-100";
          } else if (title.includes("建议") || title.includes("操作")) {
            Icon = Target;
            headerColor = "text-emerald-700";
            iconBg = "bg-emerald-100";
            cardBorder = "border-emerald-100";
          } else if (title.includes("总结") || title.includes("方针")) {
            Icon = ClipboardList;
            headerColor = "text-violet-700";
            iconBg = "bg-violet-100";
            cardBorder = "border-violet-100";
          }

          return (
            <div key={idx} className={`bg-white rounded-xl border ${cardBorder} shadow-sm overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${cardBorder} flex items-center gap-3 bg-opacity-30 ${iconBg.replace('100', '50')}`}>
                <div className={`p-2 rounded-lg ${iconBg}`}>
                  <Icon className={`w-5 h-5 ${headerColor}`} />
                </div>
                <h3 className={`text-lg font-bold ${headerColor}`}>{title}</h3>
              </div>
              <div className="p-6">
                {body.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={i} className="h-2"></div>;

                  // 1. Highlight Action Keywords
                  const highlightRegex = /(加仓|减仓|清仓|做T|锁仓|止盈|止损|买入|卖出|持有)/g;
                  let processedLine = trimmed.replace(
                    highlightRegex, 
                    '<span class="font-bold text-white bg-indigo-500 px-1 py-0.5 rounded text-xs mx-0.5 shadow-sm">$1</span>'
                  );
                  
                  // 2. Highlight Prices (Stop Profit/Loss)
                  if (title.includes("关键") || title.includes("K线")) {
                      processedLine = processedLine.replace(
                          /(止盈价|Target Sell)[:：]\s*(\d+\.?\d*)/g, 
                          '<span class="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 mx-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg> 止盈 $2</span>'
                      ).replace(
                          /(止损价|Stop Loss)[:：]\s*(\d+\.?\d*)/g, 
                          '<span class="inline-flex items-center gap-1 font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 mx-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg> 止损 $2</span>'
                      );
                  }

                  // 3. Bold Markdown
                  processedLine = processedLine.replace(
                    /\*\*(.*?)\*\*/g, 
                    '<strong class="font-bold text-slate-900 bg-slate-100 px-1 rounded">$1</strong>'
                  );

                  if (trimmed.startsWith('-') || trimmed.startsWith('* ')) {
                     return (
                       <div key={i} className="flex gap-3 mb-3 items-start group">
                          <div className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform ${title.includes("建议") ? 'bg-emerald-400' : 'bg-slate-400'}`}></div>
                          <p className="flex-1 text-slate-700 leading-relaxed text-sm sm:text-base" dangerouslySetInnerHTML={{ __html: processedLine.replace(/^[-*]\s+/, '') }}></p>
                       </div>
                     );
                  }
                  
                  if (trimmed.startsWith('###')) {
                    return <h4 key={i} className="text-md font-bold text-slate-800 mt-4 mb-2 flex items-center gap-2">
                       <Crosshair className="w-4 h-4 text-slate-400" />
                       {trimmed.replace(/###\s*/, '')}
                    </h4>;
                  }

                  return <p key={i} className="mb-2 text-slate-600 leading-relaxed text-sm sm:text-base" dangerouslySetInnerHTML={{ __html: processedLine }}></p>;
                })}
              </div>
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
            <p className="text-sm text-slate-500 mt-1">
              上传交易软件截图 (如同花顺、东方财富) 或手动录入，AI 结合成本为您诊断止盈止损点位。
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <History className="w-4 h-4" />
              历史日志
            </button>
            <input 
               type="file" 
               accept="image/*" 
               ref={fileInputRef} 
               className="hidden" 
               onChange={handleImageUpload} 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70"
            >
              {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {parsing ? '识别中...' : '上传持仓截图'}
            </button>
          </div>
        </div>

        {/* --- History Drawer (Simple implementation) --- */}
        {isHistoryOpen && (
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-slide-down">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700">交易日志归档</h3>
              <div className="flex gap-2">
                 <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={importJournal} />
                 <button onClick={() => importInputRef.current?.click()} className="text-xs flex items-center gap-1 text-slate-600 hover:text-indigo-600 px-2 py-1 bg-white border rounded">
                   <Upload className="w-3 h-3" /> 导入
                 </button>
                 <button onClick={exportJournal} className="text-xs flex items-center gap-1 text-slate-600 hover:text-indigo-600 px-2 py-1 bg-white border rounded">
                   <Download className="w-3 h-3" /> 导出备份
                 </button>
              </div>
            </div>
            {journal.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">暂无记录</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {journal.map((entry) => (
                   <div key={entry.id} onClick={() => loadEntry(entry)} className="p-3 bg-white rounded border border-slate-200 hover:border-indigo-300 cursor-pointer transition-all flex justify-between items-center group">
                      <div>
                        <div className="text-sm font-bold text-slate-800">{new Date(entry.timestamp).toLocaleString()}</div>
                        <div className="text-xs text-slate-500">资产: {entry.snapshot.totalAssets.toLocaleString()} | 持仓: {entry.snapshot.holdings.length}只</div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 text-indigo-600 text-xs font-medium">查看</div>
                   </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- Error --- */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700 gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* --- Holdings Table --- */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 mb-6">
           <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <div className="flex flex-col">
                   <span className="text-xs text-slate-500 uppercase font-bold">Total Assets</span>
                   <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-slate-800">¥</span>
                      <input 
                        type="number" 
                        value={snapshot.totalAssets} 
                        onChange={(e) => setSnapshot({...snapshot, totalAssets: parseFloat(e.target.value) || 0})}
                        className="bg-transparent border-b border-dashed border-slate-400 w-32 font-bold text-lg text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                   </div>
                 </div>
                 <div className="h-8 w-px bg-slate-300 mx-2"></div>
                 <div className="text-xs text-slate-500">
                    日期: {snapshot.date}
                 </div>
              </div>
              <button onClick={addEmptyHolding} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded transition-colors">
                 + 添加标的
              </button>
           </div>
           
           <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                 <tr>
                    <th className="px-4 py-3">标的名称 (代码)</th>
                    <th className="px-4 py-3">持仓量</th>
                    <th className="px-4 py-3">成本价</th>
                    <th className="px-4 py-3">现价</th>
                    <th className="px-4 py-3">浮动盈亏</th>
                    <th className="px-4 py-3 text-right">操作</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {snapshot.holdings.length === 0 && (
                   <tr>
                     <td colSpan={6} className="text-center py-8 text-slate-400">
                       请上传截图或手动添加持仓
                     </td>
                   </tr>
                 )}
                 {snapshot.holdings.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                       {editingIndex === idx && editForm ? (
                          // Edit Mode
                          <>
                            <td className="px-4 py-2">
                              <input 
                                className="w-24 p-1 border rounded text-xs mb-1 block" 
                                value={editForm.name} 
                                onChange={e => setEditForm({...editForm, name: e.target.value})} 
                                placeholder="名称"
                              />
                              <input 
                                className="w-24 p-1 border rounded text-xs font-mono" 
                                value={editForm.code} 
                                onChange={e => setEditForm({...editForm, code: e.target.value})} 
                                placeholder="代码"
                              />
                            </td>
                            <td className="px-4 py-2"><input type="number" className="w-20 p-1 border rounded" value={editForm.volume} onChange={e => setEditForm({...editForm, volume: parseFloat(e.target.value)})} /></td>
                            <td className="px-4 py-2"><input type="number" className="w-20 p-1 border rounded" value={editForm.costPrice} onChange={e => setEditForm({...editForm, costPrice: parseFloat(e.target.value)})} /></td>
                            <td className="px-4 py-2"><input type="number" className="w-20 p-1 border rounded" value={editForm.currentPrice} onChange={e => setEditForm({...editForm, currentPrice: parseFloat(e.target.value)})} /></td>
                            <td className="px-4 py-2 text-slate-400 text-xs">自动计算</td>
                            <td className="px-4 py-2 text-right">
                               <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4"/></button>
                               <button onClick={() => setEditingIndex(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-4 h-4"/></button>
                            </td>
                          </>
                       ) : (
                          // View Mode
                          <>
                            <td className="px-4 py-3">
                               <div className="font-bold text-slate-800">{item.name}</div>
                               <div className="text-xs font-mono text-slate-400">{item.code}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{item.volume}</td>
                            <td className="px-4 py-3 text-slate-600">{item.costPrice}</td>
                            <td className="px-4 py-3 font-medium text-slate-800">{item.currentPrice}</td>
                            <td className="px-4 py-3">
                               <div className={`font-bold ${item.profit >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                  {item.profit > 0 ? '+' : ''}{item.profit}
                               </div>
                               <div className={`text-xs ${item.profit >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                                  {item.profitRate}
                               </div>
                            </td>
                            <td className="px-4 py-3 text-right flex justify-end gap-2">
                               <button onClick={() => startEdit(idx, item)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                  <Edit2 className="w-4 h-4" />
                               </button>
                               <button onClick={() => deleteHolding(idx)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            </td>
                          </>
                       )}
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end">
           <button
             onClick={handleAnalyze}
             disabled={loading || snapshot.holdings.length === 0}
             className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
           >
             {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
             {loading ? 'AI 深度复盘中...' : '开始每日复盘'}
           </button>
        </div>
      </div>

      {/* --- Analysis Result --- */}
      {analysisResult && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-slide-up">
           <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex gap-4">
                <button
                   onClick={() => setActiveTab('report')}
                   className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'report' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                   <FileJson className="w-4 h-4" />
                   AI 诊断报告
                </button>
                <button
                   onClick={() => setActiveTab('charts')}
                   className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'charts' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                   <BarChart3 className="w-4 h-4" />
                   图表分析
                </button>
              </div>
              <button 
                 onClick={saveToJournal}
                 className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                 <Save className="w-4 h-4" />
                 保存日志
              </button>
           </div>
           
           {/* Custom Rendered Content */}
           <div className="bg-slate-50/50 min-h-[400px]">
             {activeTab === 'report' ? (
                renderReportContent(analysisResult.content)
             ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Chart 1: Asset Allocation (Market Value) */}
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-blue-500"/> 仓位分布 (市值)
                      </h4>
                      <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                               <Pie
                                  data={snapshot.holdings.map(h => ({ 
                                    name: h.name, 
                                    value: h.marketValue || (h.volume * h.currentPrice) 
                                  }))}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                               >
                                  {snapshot.holdings.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                               </Pie>
                               <Tooltip 
                                  formatter={(value: number) => `¥${value.toLocaleString()}`}
                               />
                               <Legend />
                            </PieChart>
                         </ResponsiveContainer>
                      </div>
                   </div>

                   {/* Chart 2: Profit/Loss Distribution */}
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-500"/> 盈亏分布
                      </h4>
                      <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={snapshot.holdings}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                               <XAxis dataKey="name" tick={{fontSize: 12}} />
                               <YAxis />
                               <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                               <ReferenceLine y={0} stroke="#94a3b8" />
                               <Bar dataKey="profit" name="盈亏金额">
                                 {snapshot.holdings.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#ef4444' : '#10b981'} />
                                 ))}
                               </Bar>
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                   </div>
                </div>
             )}
           </div>

           {analysisResult.groundingSource && analysisResult.groundingSource.length > 0 && (
             <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
               参考来源: {analysisResult.groundingSource.map(s => s.title).join(', ')}
             </div>
           )}
        </div>
      )}
    </div>
  );
};