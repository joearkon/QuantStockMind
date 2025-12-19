
import React, { useState, useEffect, useRef } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HoldingsSnapshot, HoldingItemDetailed, JournalEntry } from '../types';
import { parseBrokerageScreenshot } from '../services/geminiService';
import { analyzeImageWithExternal } from '../services/externalLlmService';
import { Upload, Loader2, Save, History, Trash2, Camera, ChevronRight, Activity, Target, PieChart as PieChartIcon, ArrowLeft, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface HoldingsReviewProps {
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: UserSettings;
  onOpenSettings?: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const HoldingsReview: React.FC<HoldingsReviewProps> = ({
  currentModel,
  currentMarket,
  settings,
  onOpenSettings
}) => {
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('qm_journal', JSON.stringify(journal));
  }, [journal]);

  useEffect(() => {
    if (successMsg || error) {
      const timer = setTimeout(() => {
        setSuccessMsg(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, error]);

  // --- Handlers ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setViewingHistoryId(null); // 上传新图自动切换到“当前”视图

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        let data: HoldingsSnapshot;
        if (currentModel === ModelProvider.GEMINI_INTL) {
          data = await parseBrokerageScreenshot(base64);
        } else {
          data = await analyzeImageWithExternal(currentModel, base64, settings.hunyuanKey || "");
        }
        
        // 修正可能出现的 null/undefined
        const sanitizedData = {
          ...data,
          holdings: (data.holdings || []).map(h => ({
            ...h,
            marketValue: h.marketValue || (h.volume * h.currentPrice) || 0
          }))
        };
        
        setSnapshot(sanitizedData);
        setSuccessMsg("截图解析成功！您可以微调数据后保存。");
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || "解析失败，请检查图片清晰度或网络连接");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveJournal = () => {
    if (snapshot.holdings.length === 0) return;
    
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      snapshot: { ...snapshot },
      analysis: null
    };
    
    setJournal([entry, ...journal]);
    setSuccessMsg("已成功保存至历史复盘日志");
  };

  const deleteEntry = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("确定要删除这条历史记录吗？")) {
      setJournal(journal.filter(j => j.id !== id));
      if (viewingHistoryId === id) {
        setViewingHistoryId(null);
        setSnapshot({ totalAssets: 0, positionRatio: 0, date: new Date().toISOString().split('T')[0], holdings: [] });
      }
    }
  };

  const openHistoryEntry = (entry: JournalEntry) => {
    setViewingHistoryId(entry.id);
    setSnapshot(entry.snapshot);
    // 滚动到顶部方便查看
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetToNew = () => {
    setViewingHistoryId(null);
    setSnapshot({
      totalAssets: 0,
      positionRatio: 0,
      date: new Date().toISOString().split('T')[0],
      holdings: []
    });
  };

  const addManualHolding = () => {
    const newItem: HoldingItemDetailed = {
      name: "新标的",
      code: "000000",
      volume: 0,
      costPrice: 0,
      currentPrice: 0,
      profit: 0,
      profitRate: "0%",
      marketValue: 0
    };
    setSnapshot({
      ...snapshot,
      holdings: [...snapshot.holdings, newItem]
    });
  };

  const updateHolding = (index: number, field: keyof HoldingItemDetailed, value: any) => {
    const newHoldings = [...snapshot.holdings];
    newHoldings[index] = { ...newHoldings[index], [field]: value };
    
    // 自动计算市值
    if (field === 'volume' || field === 'currentPrice') {
      newHoldings[index].marketValue = Number(newHoldings[index].volume) * Number(newHoldings[index].currentPrice);
    }
    
    setSnapshot({ ...snapshot, holdings: newHoldings });
  };

  // --- Derived Data ---
  const pieData = snapshot.holdings
    .filter(h => h.marketValue > 0)
    .map(h => ({ name: h.name, value: h.marketValue }));

  const isHistoryView = !!viewingHistoryId;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* 顶部操作区 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-2 rounded-lg ${isHistoryView ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {isHistoryView ? <History className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
              </div>
              <h2 className="text-2xl font-bold text-slate-800">
                {isHistoryView ? '历史复盘回顾' : '持仓快照分析'}
              </h2>
            </div>
            <p className="text-slate-500 text-sm">
              {isHistoryView 
                ? `正在查看 ${new Date(journal.find(j => j.id === viewingHistoryId)?.timestamp || 0).toLocaleString()} 的记录` 
                : '上传券商持仓截图，AI将自动识别并生成分布图表。'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
             {isHistoryView && (
               <button 
                 onClick={resetToNew}
                 className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold border border-slate-200"
               >
                  <ArrowLeft className="w-4 h-4" /> 返回新分析
               </button>
             )}
             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
             <button 
               onClick={() => fileInputRef.current?.click()} 
               disabled={loading}
               className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all font-bold border border-indigo-100 shadow-sm"
             >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                上传截图
             </button>
             {!isHistoryView && (
               <button 
                 onClick={handleSaveJournal}
                 disabled={snapshot.holdings.length === 0}
                 className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-100 disabled:opacity-50"
               >
                  <Save className="w-4 h-4" /> 保存记录
               </button>
             )}
          </div>
        </div>

        {/* 状态反馈 */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm flex items-center gap-3 animate-slide-up">
            <AlertCircle className="w-5 h-5 shrink-0" /> {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm flex items-center gap-3 animate-slide-up">
            <CheckCircle2 className="w-5 h-5 shrink-0" /> {successMsg}
          </div>
        )}

        {/* 主数据区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 左侧：资产列表 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center px-2">
               <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" /> 资产明细
               </h3>
               {!isHistoryView && (
                 <button onClick={addManualHolding} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1">
                    <Plus className="w-3 h-3" /> 手动添加
                 </button>
               )}
            </div>
            
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100/80 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                  <tr>
                    <th className="p-4">标的名称/代码</th>
                    <th className="p-4 text-right">成本/现价</th>
                    <th className="p-4 text-right">盈亏</th>
                    <th className="p-4 text-right">市值 (¥)</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {snapshot.holdings.map((h, i) => (
                    <tr key={i} className="hover:bg-white transition-colors group">
                      <td className="p-4">
                        <input 
                          disabled={isHistoryView}
                          value={h.name} 
                          onChange={(e) => updateHolding(i, 'name', e.target.value)}
                          className="font-bold text-slate-800 bg-transparent border-none focus:ring-0 w-full p-0"
                        />
                        <input 
                          disabled={isHistoryView}
                          value={h.code} 
                          onChange={(e) => updateHolding(i, 'code', e.target.value)}
                          className="text-[10px] text-slate-400 font-mono bg-transparent border-none focus:ring-0 w-full p-0"
                        />
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-slate-600">{h.costPrice}</div>
                        <div className="text-[10px] text-slate-400">{h.currentPrice}</div>
                      </td>
                      <td className={`p-4 text-right font-black ${h.profitRate?.startsWith('+') || h.profit > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {h.profitRate}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-700">
                        {h.marketValue?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {snapshot.holdings.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-20 text-center">
                        <div className="flex flex-col items-center opacity-30">
                           <Camera className="w-12 h-12 mb-2" />
                           <p className="text-sm">暂无持仓，请点击上方按钮上传图片</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {snapshot.holdings.length > 0 && (
              <div className="flex justify-between items-center p-4 bg-slate-900 rounded-xl text-white">
                 <div className="text-xs text-slate-400 font-bold uppercase">合计总资产</div>
                 <div className="text-xl font-black tracking-tight">
                    ¥{snapshot.totalAssets?.toLocaleString() || pieData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}
                 </div>
              </div>
            )}
          </div>

          {/* 右侧：可视化图表 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-full flex flex-col min-h-[400px]">
               <h3 className="text-slate-800 font-bold mb-6 flex items-center gap-2">
                 <PieChartIcon className="w-5 h-5 text-indigo-500" /> 持仓权重分布
               </h3>
               {pieData.length > 0 ? (
                 <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={pieData} 
                          innerRadius={70} 
                          outerRadius={100} 
                          paddingAngle={8} 
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" align="center" iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                 </div>
               ) : (
                 <div className="flex-1 flex items-center justify-center text-slate-300 italic text-sm text-center">
                    解析持仓后<br/>此处将显示权重图表
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* 历史记录区 - 改进交互 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-700">历史复盘日志</h3>
          </div>
          <span className="text-[10px] bg-white px-2 py-1 rounded-full text-slate-400 border border-slate-200 font-bold">
            共 {journal.length} 条记录
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {journal.map((j) => (
            <div 
              key={j.id} 
              onClick={() => openHistoryEntry(j)}
              className={`p-6 transition-all cursor-pointer group hover:bg-indigo-50/30 ${viewingHistoryId === j.id ? 'bg-indigo-50 border-r-4 border-r-indigo-500' : ''}`}
            >
               <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-xl ${viewingHistoryId === j.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-indigo-600 shadow-sm'}`}>
                    <Activity className="w-5 h-5" />
                  </div>
                  <button 
                    onClick={(e) => deleteEntry(e, j.id)} 
                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
               </div>
               
               <div className="space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    {new Date(j.timestamp).toLocaleDateString()}
                    <span className="text-[10px] text-slate-400 font-normal">{new Date(j.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>持仓: <strong className="text-slate-700">{j.snapshot.holdings.length}</strong></span>
                    <span className="text-slate-200">|</span>
                    <span>资产: <strong className="text-slate-700">¥{j.snapshot.totalAssets?.toLocaleString()}</strong></span>
                  </div>
               </div>
               
               <div className="mt-4 flex items-center text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  查看详情 <ChevronRight className="w-3 h-3 ml-1" />
               </div>
            </div>
          ))}
          
          {journal.length === 0 && (
            <div className="col-span-full p-20 text-center text-slate-300 italic flex flex-col items-center">
               <History className="w-10 h-10 mb-2 opacity-20" />
               <p className="text-sm">暂无历史记录，保存第一条复盘日志吧</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
