
import React, { useState, useEffect, useRef } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HoldingsSnapshot, HoldingItemDetailed, JournalEntry, PeriodicReviewData, DailyTradingPlan, PlanItem } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { parseBrokerageScreenshot, fetchPeriodicReview, extractTradingPlan } from '../services/geminiService';
import { analyzeImageWithExternal } from '../services/externalLlmService';
import { Upload, Loader2, Save, Download, UploadCloud, History, Trash2, Camera, Edit2, Check, X, FileJson, TrendingUp, AlertTriangle, PieChart as PieChartIcon, Activity, Target, ClipboardList, BarChart3, Crosshair, GitCompare, Clock, LineChart as LineChartIcon, Calendar, Trophy, AlertOctagon, CheckCircle2, XCircle, ArrowRightCircle, ListTodo, MoreHorizontal, Square, CheckSquare, FileText, FileSpreadsheet, FileCode, ChevronLeft, ChevronRight, AlertCircle, Scale, Coins, ShieldAlert, Microscope, MessageSquareQuote, Lightbulb, FileType } from 'lucide-react';
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
  
  // Drawers
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  
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

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('qm_journal', JSON.stringify(journal));
  }, [journal]);

  useEffect(() => {
    localStorage.setItem('qm_trading_plans', JSON.stringify(tradingPlans));
  }, [tradingPlans]);

  // --- Handlers: Screenshot ---
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
             // Fix: parseBrokerageScreenshot only accepts 1 argument (base64Image)
             parsedData = await parseBrokerageScreenshot(base64String);
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

  // --- Handlers: Editing ---
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
    setEditingIndex(snapshot.holdings.length);
    setEditForm({
        name: "新标的",
        code: "",
        volume: 0,
        costPrice: 0,
        currentPrice: 0,
        profit: 0,
        profitRate: "0%",
        marketValue: 0,
        horizon: 'short'
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
    setPeriodicResult(null);
    setError(null);
    setActiveTab('report'); 

    const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;
    
    const now = new Date();
    const todayStr = now.toLocaleDateString('zh-CN');
    const todayFullStr = now.toLocaleString('zh-CN');
    const nextYear = now.getFullYear() + 1;

    const lastSessionEntry = journal.length > 0 ? journal[0] : null;
    const lastDayEntry = journal.find(j => new Date(j.timestamp).toLocaleDateString('zh-CN') !== todayStr);

    let historyContext = "这是该账户的首次复盘分析。";

    if (lastSessionEntry) {
      const lastSessionTime = new Date(lastSessionEntry.timestamp).toLocaleString('zh-CN');
      const isSameDay = new Date(lastSessionEntry.timestamp).toLocaleDateString('zh-CN') === todayStr;
      
      historyContext = `
      【历史记录上下文】
      - 当前系统时间: ${todayFullStr}
      - 基准对比快照 (${isSameDay ? '今日早前' : '历史最近'}): ${lastSessionTime}
      - 基准快照总资产: ${lastSessionEntry.snapshot.totalAssets} 元
      `;

      if (isSameDay && lastDayEntry) {
        const lastDayTime = new Date(lastDayEntry.timestamp).toLocaleString('zh-CN');
        historyContext += `- 上一交易日(历史跨天)参考记录: ${lastDayTime} (资产: ${lastDayEntry.snapshot.totalAssets} 元)\n`;
      }

      historyContext += `\n【历史持仓对比基准】\n`;
      historyContext += `${lastSessionEntry.snapshot.holdings.map(h => `- ${h.name} (${h.code}): 持仓:${h.volume}, 盈亏率:${h.profitRate}`).join('\n')}\n`;
      
      if (lastSessionEntry.analysis?.content) {
        historyContext += `\n【上期建议追溯】\n"""\n${lastSessionEntry.analysis.content.substring(0, 1000)}\n"""\n`;
      }
    }

    const getHorizonLabel = (h: string | undefined) => {
      if (h === 'short') return '短线(1月内)';
      if (h === 'long') return '长线(3月+)';
      return '中线(1-3月)';
    };

    const currentHoldingsText = snapshot.holdings.map((h, i) => {
      const marketVal = h.volume * h.currentPrice;
      const weight = snapshot.totalAssets > 0 ? ((marketVal / snapshot.totalAssets) * 100).toFixed(2) : "0.00";
      return `${i+1}. ${h.name} (${h.code}) [${getHorizonLabel(h.horizon)}]: 持仓${h.volume}股, 成本${h.costPrice},现价${h.currentPrice}, 市值${marketVal.toFixed(2)}元 (占总资产比例: ${weight}%), 盈亏 ${h.profit} (${h.profitRate})`;
    }).join('\n');

    const prompt = `
      请作为一位【专属私人基金经理】对我当前的 ${marketLabel} 账户进行【连续性】复盘分析。

      [!!! 重要数据逻辑指令 !!!]:
      1. 持仓数据中可能出现【负数】（如负的成本价、负的现价或负的盈亏）。
      2. 在量化交易、高抛低吸（做T）或大幅止盈后，由于本金已全部收回且产生了额外利润，记账上出现“负成本”或“负价格”是完全正常且代表该头寸已进入“零风险纯盈利”状态。
      3. 严禁将其视为“数据错误”、“格式异常”或“非法输入”。请基于“用户已实现超额利润并持有无成本底仓”的逻辑进行深度诊断。

      你不只是分析今天，更要结合历史上下文，跟踪策略的执行情况和市场验证情况。
      
      【重要：时序逻辑与年度切换】
      - 现在是现实世界的 ${todayFullStr}。
      - **即将到来的年份是 ${nextYear} 年**。
      - 如果你分析中涉及到“开门红预案”、“跨年行情”或“明年展望”，**请务必使用 ${nextYear} 年作为年份标识**。严禁将明年称为 ${now.getFullYear()} 年。
      - 如果基准记录是“今日早前”（如午盘），请侧重分析午后至今的动态博弈。
      - 如果基准记录是“上一交易日”，请进行完整的跨日复盘（如 2025-12-24 对比 2025-12-23）。

      === 历史档案 ===
      ${historyContext}

      === 今日最新概况 ===
      - 总资产: ${snapshot.totalAssets} 元
      - 真实仓位占比: ${snapshot.positionRatio || '未知'}%
      - 记录时间: ${todayFullStr}
      - 详细持仓:
      ${currentHoldingsText}
      
      【核心任务】
      请结合联网搜索最新的行情动向，输出报告 (H2 标题):

      ## 1. 昨策回顾与执行力审计 (Review)
      - **跨度分析**: 明确指出这是“跨日对比”还是“盘中持续观察”。
      - **验证**: 上期建议是否被执行？资产变动是因为市场波动还是操作失误？
      - **评分**: 执行力评分 (0-10分)。

      ## 盈亏诊断与实战压力 (Diagnosis)
      - 基于成本/现价，分析持仓处于什么技术周期。
      - 针对**仓位占比 (${snapshot.positionRatio}%)** 评估整体账户抗风险能力。
      
      ## 3. 技术形态与动态点位 (Technical)
      - **量能分析**: 【必须】指出是“放量”还是“缩量”并合理解释。
      - **锚点**: 必须重新核准每一只持仓的【止盈价】和【止损价】。

      ## 4. 实战指令 (Action)
      - **针对性**: 根据股票【周期标记】给出犀利指令。
      - 指令含：【加仓 / 减仓 / 做T / 清仓 / 锁仓】。

      ## 5. 持仓配比与数量优化建议 (Position Optimization)
      - **数量评估**: 评价每一只股票的【持仓数量/股数】是否合理？是否存在单票过重或过轻（蜻蜓点水）的情况？
      - **配比调整**: 根据技术面胜率，给出具体的增减持【股数】建议，以优化账户的夏普比率。
      - **流动性预警**: 针对当前持仓量，分析在当前市场成交额下是否存在退出冲击成本。

      ## 6. 账户总方针 (Strategy)
      - 更新账户总防御/进攻方针。

      请像一位长期跟踪我账户的导师，语言要专业且具有连贯记忆。
    `;

    try {
      const result = await analyzeWithLLM(currentModel, prompt, true, settings, false, 'day', undefined, currentMarket);
      setAnalysisResult(result);
    } catch (err: any) {
      console.error("Analyze Error", err);
      setError(err.message || "分析请求未能完成，请检查网络设置或稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers: Plan Generation ---
  const handleGeneratePlan = async () => {
    if (!analysisResult) return;
    setGeneratingPlan(true);
    
    try {
      // Fix: extractTradingPlan only accepts 1 argument (analysisText)
      const { items, summary } = await extractTradingPlan(analysisResult.content);
      
      const newPlan: DailyTradingPlan = {
        id: crypto.randomUUID(),
        target_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], 
        created_at: Date.now(),
        items: items,
        strategy_summary: summary
      };

      setTradingPlans(prev => [newPlan, ...prev]);
      setIsPlanOpen(true);
      
      setTimeout(() => {
        const el = document.getElementById('trading-plan-section');
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
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
  
  const deletePlan = (planId: string) => {
    if (confirm("确定删除该交易计划？")) {
       setTradingPlans(prev => prev.filter(p => p.id !== planId));
    }
  };

  // --- Handlers: Export ---
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPlanMD = () => {
     let md = "# 我的交易计划归档\n\n";
     tradingPlans.forEach(plan => {
        md += `## ${plan.target_date} (策略: ${plan.strategy_summary})\n`;
        md += "| 标意 | 操作 | 目标价 | 逻辑 | 状态 |\n";
        md += "| --- | --- | --- | --- | --- |\n";
        plan.items.forEach(item => {
           md += `| ${item.symbol} | ${item.action} | ${item.price_target || '--'} | ${item.reason} | ${item.status} |\n`;
        });
        md += "\n";
     });
     downloadFile(md, `TradingPlans_${new Date().toISOString().split('T')[0]}.md`, 'text/markdown');
  };

  const handleExportPlanWord = () => {
    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Trading Plans</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
        h1 { color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
        h2 { color: #334155; margin-top: 30px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; border: 1px solid #e2e8f0; }
        th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 14px; }
        th { background-color: #f8fafc; color: #64748b; text-transform: uppercase; font-size: 12px; }
        .summary { font-style: italic; color: #475569; background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .status-completed { color: #10b981; font-weight: bold; }
        .status-pending { color: #64748b; }
      </style>
      </head>
      <body>
        <h1>QuantMind 智能交易计划</h1>
    `;

    tradingPlans.forEach(plan => {
      html += `<h2>计划日期: ${plan.target_date}</h2>`;
      html += `<div class="summary"><b>策略总纲:</b> ${plan.strategy_summary}</div>`;
      html += `<table>
        <thead>
          <tr><th>标的 (Symbol)</th><th>操作 (Action)</th><th>目标价位</th><th>执行逻辑</th><th>当前状态</th></tr>
        </thead>
        <tbody>`;
      plan.items.forEach(item => {
        html += `<tr>
          <td><b>${item.symbol}</b></td>
          <td>${item.action.toUpperCase()}</td>
          <td>${item.price_target || '--'}</td>
          <td>${item.reason}</td>
          <td class="${item.status === 'completed' ? 'status-completed' : 'status-pending'}">${item.status}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
    });

    html += `</body></html>`;
    downloadFile(html, `TradingPlans_${new Date().toISOString().split('T')[0]}.doc`, 'application/msword');
  };

  const handleExportPlanCSV = () => {
     let csv = "\uFEFF日期,股票,操作,目标价,逻辑,状态\n";
     tradingPlans.forEach(plan => {
        plan.items.forEach(item => {
           csv += `${plan.target_date},"${item.symbol}","${item.action}","${item.price_target}","${item.reason.replace(/"/g, '""')}","${item.status}"\n`;
        });
     });
     downloadFile(csv, `TradingPlans_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  const handleExportReportMD = (result: AnalysisResult | null) => {
    if (!result) return;
    const dateStr = new Date(result.timestamp).toLocaleString();
    const content = `# QuantMind 智能复盘报告\n日期: ${dateStr}\n\n${result.content}`;
    downloadFile(content, `Report_${new Date().toISOString().split('T')[0]}.md`, 'text/markdown');
  };

  const handleExportPeriodicMD = (data: PeriodicReviewData | undefined) => {
    if (!data) return;
    let md = `# QuantMind 阶段性复盘总结\n日期: ${new Date().toLocaleDateString()}\n\n`;
    md += `## 1. 综合表现评分: ${data.score}/100\n`;
    md += `## 2. 市场大局解读 (${data.market_trend.toUpperCase()})\n${data.market_summary}\n\n`;
    md += `## 3. 个股专项问题诊断\n`;
    data.stock_diagnostics.forEach(s => {
      md += `### ${s.name} (${s.verdict})\n`;
      s.issues.forEach(issue => md += `- ${issue}\n`);
      md += `\n`;
    });
    md += `## 4. 改进建议与实操方法\n`;
    data.improvement_advice.forEach(advice => md += `- ${advice}\n`);
    md += `\n## 5. 下阶段战略重心\n`;
    data.next_period_focus.forEach(focus => md += `- ${focus}\n`);
    
    downloadFile(md, `Periodic_Review_${new Date().toISOString().split('T')[0]}.md`, 'text/markdown');
  };

  const handlePrintToPDF = () => {
    window.print();
  };

  // --- Handlers: Periodic Review ---
  const handlePeriodicReview = async (period: 'week' | 'month' | 'all') => {
    if (journal.length < 1) {
      setError("历史记录不足，无法进行阶段性复盘。请先积累至少两条交易日志。");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisResult(null); 
    setPeriodicResult(null);
    setActiveTab('periodic');

    const now = Date.now();
    let startDate = 0;
    let label = "";

    if (period === 'week') {
      startDate = now - 7 * 24 * 60 * 60 * 1000;
      label = "近一周";
    } else if (period === 'month') {
      startDate = now - 30 * 24 * 60 * 60 * 1000;
      label = "近一月";
    } else {
      startDate = 0;
      label = "全历史";
    }

    const filteredJournals = journal.filter(j => j.timestamp >= startDate);
    const currentEntry: JournalEntry = {
      id: 'current',
      timestamp: Date.now(),
      snapshot: snapshot,
      analysis: null
    };

    const reviewJournals = [...filteredJournals, currentEntry];

    if (reviewJournals.length < 2) {
       setError(`【${label}】范围内数据点不足，无法形成趋势分析。请选择更长的时间段。`);
       setLoading(false);
       return;
    }

    try {
      // Fix: fetchPeriodicReview only accepts 3 arguments (journals, periodLabel, market)
      const result = await fetchPeriodicReview(reviewJournals, label, currentMarket);
      setPeriodicResult(result);
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

  const deleteJournalEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (window.confirm("确定要【永久删除】这条历史记录吗？此操作无法撤销。")) {
      setJournal(prev => {
        const filtered = prev.filter(entry => entry.id !== id);
        const newTotalPages = Math.ceil(filtered.length / HISTORY_PAGE_SIZE);
        if (historyPage > newTotalPages && newTotalPages > 0) {
          setHistoryPage(newTotalPages);
        }
        return filtered;
      });
    }
  };

  const clearAllJournalEntries = () => {
    if (window.confirm("危险操作：确定要【清空所有】历史日志吗？这将清除所有积累的复盘数据。")) {
       setJournal([]);
       setHistoryPage(1);
    }
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
          const processed = imported.map(item => ({
             ...item,
             id: item.id || crypto.randomUUID()
          }));
          setJournal(processed);
          alert(`成功导入 ${processed.length} 条记录`);
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

  // --- Helpers for Charts ---
  const getTrendData = () => {
    const history = [...journal].sort((a, b) => a.timestamp - b.timestamp).map(entry => ({
      date: new Date(entry.timestamp).toLocaleDateString('zh-CN', {month: '2-digit', day: '2-digit'}),
      assets: entry.snapshot.totalAssets,
      totalProfit: entry.snapshot.holdings.reduce((sum, h) => sum + (h.profit || 0), 0)
    }));

    history.push({
      date: 'Now',
      assets: snapshot.totalAssets,
      totalProfit: snapshot.holdings.reduce((sum, h) => sum + (h.profit || 0), 0)
    });

    return history;
  };

  const getHorizonData = () => {
    const counts = { short: 0, medium: 0, long: 0 };
    snapshot.holdings.forEach(h => {
      const type = h.horizon || 'medium';
      counts[type]++;
    });
    return [
      { name: '短线 (Short)', value: counts.short, color: HORIZON_COLORS.short },
      { name: '中线 (Medium)', value: counts.medium, color: HORIZON_COLORS.medium },
      { name: '长线 (Long)', value: counts.long, color: HORIZON_COLORS.long },
    ].filter(d => d.value > 0);
  };

  // --- Pagination Logic ---
  const totalHistoryPages = Math.ceil(journal.length / HISTORY_PAGE_SIZE);
  const paginatedJournal = journal.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);

  // --- Render Helper: Rich Periodic Review ---
  const renderPeriodicDashboard = (data: PeriodicReviewData) => {
    return (
      <div className="p-6 space-y-8 animate-fade-in" id="periodic-report-printable">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-6 text-white shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-white/5 opacity-10 blur-xl"></div>
              <h3 className="text-slate-300 font-bold uppercase tracking-wider text-xs mb-2">综合表现评分</h3>
              <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                 <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="#334155" strokeWidth="8" fill="none" />
                    <circle 
                      cx="64" cy="64" r="56" 
                      stroke={data.score >= 80 ? '#10b981' : data.score >= 60 ? '#f59e0b' : '#ef4444'} 
                      strokeWidth="8" fill="none" 
                      strokeDasharray="351.86" 
                      strokeDashoffset={351.86 * (1 - data.score / 100)} 
                      className="transition-all duration-1000 ease-out"
                    />
                 </svg>
                 <span className="absolute text-4xl font-bold">{data.score}</span>
              </div>
              <p className="text-sm opacity-80 mt-1">
                 {data.score >= 80 ? '表现优异' : data.score >= 60 ? '表现尚可' : '需反思改进'}
              </p>
           </div>

           <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                 <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                    data.market_trend === 'bull' ? 'bg-red-50 text-red-600 border-red-100' :
                    data.market_trend === 'bear' ? 'bg-green-50 text-green-600 border-green-100' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                 }`}>
                    {data.market_trend.toUpperCase()} MARKET
                 </span>
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                   <TrendingUp className="w-5 h-5 text-indigo-500" />
                   阶段大盘/上证大局解读
                 </h3>
              </div>
              <p className="text-slate-600 leading-relaxed text-sm bg-white p-4 rounded-lg border border-slate-100 italic shadow-inner">
                 <MessageSquareQuote className="w-4 h-4 text-slate-300 mb-1" />
                 {data.market_summary}
              </p>
           </div>
        </div>

        {/* 重点新模块：个股专项审计报告 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
           <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Microscope className="w-40 h-40 text-indigo-900" />
           </div>
           <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Microscope className="w-5 h-5 text-indigo-600" />
              个股专项问题诊断 (Stock Audit)
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.stock_diagnostics && data.stock_diagnostics.length > 0 ? (
                 data.stock_diagnostics.map((stock, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col hover:border-indigo-200 transition-colors group">
                       <div className="flex justify-between items-center mb-3">
                          <span className="font-black text-slate-800 text-lg group-hover:text-indigo-700 transition-colors">{stock.name}</span>
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                             stock.verdict.includes('卖出') || stock.verdict.includes('减仓') ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                             {stock.verdict}
                          </span>
                       </div>
                       <div className="space-y-2">
                          {stock.issues.map((issue, iIdx) => (
                             <div key={iIdx} className="flex gap-2 text-xs text-slate-600 items-start">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <span>{issue}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                 ))
              ) : (
                 <p className="text-sm text-slate-400 col-span-2 py-8 text-center italic">个股池整体表现稳健，暂未发现严重结构性风险。</p>
              )}
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-6 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Trophy className="w-24 h-24 text-emerald-600" />
              </div>
              <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-3 text-emerald-800 font-bold">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm"><Trophy className="w-5 h-5 text-emerald-600" /></div>
                    阶段高光时刻 (Highlight)
                 </div>
                 <h4 className="text-lg font-bold text-emerald-900 mb-2">{data.highlight.title}</h4>
                 <p className="text-sm text-emerald-800 leading-relaxed opacity-90">{data.highlight.description}</p>
              </div>
           </div>

           <div className="bg-rose-50 rounded-xl border border-rose-100 p-6 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <AlertOctagon className="w-24 h-24 text-rose-600" />
              </div>
              <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-3 text-rose-800 font-bold">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm"><AlertOctagon className="w-5 h-5 text-rose-600" /></div>
                    阶段重灾区 (Lowlight)
                 </div>
                 <h4 className="text-lg font-bold text-rose-900 mb-2">{data.lowlight.title}</h4>
                 <p className="text-sm text-rose-800 leading-relaxed opacity-90">{data.lowlight.description}</p>
              </div>
           </div>
        </div>

        {/* 知行合一审计模块 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 <ClipboardList className="w-5 h-5 text-slate-500" />
                 知行合一审计 (Execution Audit)
              </h3>
              <div className="flex items-center gap-2">
                 <span className="text-sm text-slate-500 font-medium">执行力评分</span>
                 <div className="w-24 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{width: `${data.execution.score}%`}}></div>
                 </div>
                 <span className="text-sm font-bold text-indigo-600">{data.execution.score}/100</span>
              </div>
           </div>
           
           <p className="text-sm text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
              "{data.execution.details}"
           </p>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                 <h4 className="text-xs font-bold uppercase text-emerald-600 mb-3 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Good Behaviors
                 </h4>
                 <ul className="space-y-2">
                    {data.execution.good_behaviors.map((item, idx) => (
                       <li key={idx} className="flex gap-2 text-sm text-slate-700 bg-emerald-50/50 p-2 rounded">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                       </li>
                    ))}
                    {data.execution.good_behaviors.length === 0 && <li className="text-sm text-slate-400">暂无明显亮点</li>}
                 </ul>
              </div>
              <div>
                 <h4 className="text-xs font-bold uppercase text-rose-600 mb-3 flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> Areas to Improve
                 </h4>
                 <ul className="space-y-2">
                    {data.execution.bad_behaviors.map((item, idx) => (
                       <li key={idx} className="flex gap-2 text-sm text-slate-700 bg-rose-50/50 p-2 rounded">
                          <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                       </li>
                    ))}
                     {data.execution.bad_behaviors.length === 0 && <li className="text-sm text-slate-400">暂无明显失误</li>}
                 </ul>
              </div>
           </div>
        </div>

        {/* 重点升级：改进建议与实操方法 */}
        {data.improvement_advice && data.improvement_advice.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 shadow-sm">
             <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-indigo-600" />
                针对性改进建议与实操方法
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.improvement_advice.map((advice, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">{idx + 1}</div>
                    <p className="text-sm text-slate-700 font-bold leading-relaxed pt-1">{advice}</p>
                  </div>
                ))}
             </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white no-print">
           <h3 className="text-lg font-bold text-indigo-300 mb-4 flex items-center gap-2">
              <ArrowRightCircle className="w-5 h-5 text-indigo-400" />
              下阶段战略重心 (Strategic Focus)
           </h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.next_period_focus.map((item, idx) => (
                 <div key={idx} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-900 text-indigo-400 flex items-center justify-center font-bold text-xs">{idx + 1}</span>
                    <p className="text-sm text-slate-300 font-medium pt-0.5">{item}</p>
                 </div>
              ))}
           </div>
        </div>

      </div>
    );
  };

  // --- Render Helper: Daily Report ---
  const renderReportContent = (content: string) => {
    const sections = content.split(/^##\s+/gm).filter(Boolean);

    if (sections.length === 0) {
      return (
        <div className="prose prose-slate max-w-none p-6" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 p-6" id="daily-report-printable">
        {sections.map((sec, idx) => {
          const lines = sec.trim().split('\n');
          const title = lines[0].trim();
          const body = lines.slice(1).join('\n').trim();
          
          let Icon = FileJson;
          let headerColor = "text-slate-800";
          let iconBg = "bg-slate-100";
          let cardBorder = "border-slate-200";

          if (title.includes("回顾") || title.includes("验证")) {
            Icon = GitCompare;
            headerColor = "text-indigo-700";
            iconBg = "bg-indigo-100";
            cardBorder = "border-indigo-100";
          } else if (title.includes("盈亏") || title.includes("心理")) {
            Icon = PieChartIcon;
            headerColor = "text-rose-700";
            iconBg = "bg-rose-100";
            cardBorder = "border-rose-100";
          } else if (title.includes("K线") || title.includes("关键") || title.includes("波浪")) {
            Icon = Activity;
            headerColor = "text-blue-700";
            iconBg = "bg-blue-100";
            cardBorder = "border-blue-100";
          } else if (title.includes("建议") || title.includes("操作") || title.includes("指令") || title.includes("实战")) {
            Icon = Target;
            headerColor = "text-emerald-700";
            iconBg = "bg-emerald-100";
            cardBorder = "border-emerald-100";
          } else if (title.includes("数量") || title.includes("配比") || title.includes("权重") || title.includes("Optimization")) {
            Icon = Scale;
            headerColor = "text-orange-700";
            iconBg = "bg-orange-100";
            cardBorder = "border-orange-100";
          } else if (title.includes("总结") || title.includes("方针")) {
            Icon = ClipboardList;
            headerColor = "text-violet-700";
            iconBg = "bg-violet-100";
            cardBorder = "border-violet-100";
          } else if (title.includes("大盘") || title.includes("Context")) {
            Icon = TrendingUp;
            headerColor = "text-amber-700";
            iconBg = "bg-amber-100";
            cardBorder = "border-amber-100";
          } else if (title.includes("审计") || title.includes("Audit")) {
            Icon = AlertTriangle;
            headerColor = "text-red-700";
            iconBg = "bg-red-100";
            cardBorder = "border-red-100";
          }

          return (
            <div key={idx} className={`bg-white rounded-xl border ${cardBorder} shadow-sm overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${cardBorder} flex justify-between items-center bg-opacity-30 ${iconBg.replace('100', '50')}`}>
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-lg ${iconBg}`}>
                     <Icon className={`w-5 h-5 ${headerColor}`} />
                   </div>
                   <h3 className={`text-lg font-bold ${headerColor}`}>{title}</h3>
                </div>
                
                {(title.includes("建议") || title.includes("指令") || title.includes("操作") || title.includes("实战")) && (
                   <button
                     onClick={handleGeneratePlan}
                     disabled={generatingPlan}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-70 no-print"
                   >
                     {generatingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <ListTodo className="w-3.5 h-3.5"/>}
                     生成明日计划表 (导出MD/Word)
                   </button>
                )}
              </div>
              <div className="p-6">
                {body.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={i} className="h-2"></div>;

                  const highlightRegex = /(加仓|减仓|清仓|做T|锁仓|止盈|止损|买入|卖出|持有|补救|执行力|知行不一|放量|缩量|股数|仓位|权重|配比|过轻|过重)/g;
                  let processedLine = trimmed.replace(
                    highlightRegex, 
                    '<span class="font-bold text-white bg-indigo-500 px-1 py-0.5 rounded text-xs mx-0.5 shadow-sm">$1</span>'
                  );
                  
                  if (title.includes("关键") || title.includes("K线") || title.includes("点位")) {
                      processedLine = processedLine.replace(
                          /(止盈价|Target Sell)[:：]\s*(\d+\.?\d*)/g, 
                          '<span class="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 mx-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg> 止盈 $2</span>'
                      ).replace(
                          /(止损价|Stop Loss)[:：]\s*(\d+\.?\d*)/g, 
                          '<span class="inline-flex items-center gap-1 font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 mx-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg> 止损 $2</span>'
                      );
                  }

                  processedLine = processedLine.replace(
                    /\*\*(.*?)\*\*/g, 
                    '<strong class="font-bold text-slate-900 bg-slate-100 px-1 rounded">$1</strong>'
                  );

                  if (trimmed.startsWith('-') || trimmed.startsWith('* ')) {
                     return (
                       <div key={i} className="flex gap-3 mb-3 items-start group">
                          <div className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform ${title.includes("建议") ? 'bg-emerald-400' : title.includes("数量") ? 'bg-orange-400' : 'bg-slate-400'}`}></div>
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

  const renderHorizonBadge = (horizon: string | undefined) => {
    switch (horizon) {
      case 'short':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 font-medium border border-amber-200">短线</span>;
      case 'long':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-violet-100 text-violet-700 font-medium border border-violet-200">长线</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-medium border border-blue-200">中线</span>;
    }
  };

  const getFriendlyErrorMessage = (errMsg: string | null) => {
    if (!errMsg) return null;
    if (errMsg.includes("TypeError: Failed to fetch") || errMsg.includes