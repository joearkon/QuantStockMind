
import React, { useState, useEffect, useRef } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HoldingsSnapshot, HoldingItemDetailed, JournalEntry, PeriodicReviewData, PlanItem } from '../types';
import { parseBrokerageScreenshot, fetchPeriodicReview, extractTradingPlan } from '../services/geminiService';
import { analyzeImageWithExternal } from '../services/externalLlmService';
import { Upload, Loader2, Save, History, Trash2, Camera, ChevronRight, Activity, Target, PieChart as PieChartIcon, TrendingUp, AlertTriangle } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('qm_journal', JSON.stringify(journal));
  }, [journal]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
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
        setSnapshot(data);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || "解析失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJournal = () => {
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      snapshot: { ...snapshot },
      analysis: null
    };
    setJournal([entry, ...journal]);
  };

  const deleteEntry = (id: string) => {
    setJournal(journal.filter(j => j.id !== id));
  };

  const pieData = snapshot.holdings.map(h => ({ name: h.name, value: h.marketValue || 0 }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Camera className="w-6 h-6 text-indigo-600" />
            持仓快照与智能复盘
          </h2>
          <div className="flex gap-3">
             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
             <button 
               onClick={() => fileInputRef.current?.click()} 
               disabled={loading}
               className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-all font-medium border border-indigo-100"
             >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                上传持仓截图
             </button>
             <button 
               onClick={handleSaveJournal}
               disabled={snapshot.holdings.length === 0}
               className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium shadow-sm disabled:opacity-50"
             >
                <Save className="w-4 h-4" />
                保存至历史记录
             </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm flex items-center gap-2 mb-6">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="p-4">标的</th>
                    <th className="p-4 text-right">成本/现价</th>
                    <th className="p-4 text-right">盈亏率</th>
                    <th className="p-4 text-right">市值</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-50">
                  {snapshot.holdings.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-bold">{h.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{h.code}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div>{h.costPrice}</div>
                        <div className="text-xs text-slate-400">{h.currentPrice}</div>
                      </td>
                      <td className={`p-4 text-right font-bold ${h.profitRate?.startsWith('+') ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {h.profitRate}
                      </td>
                      <td className="p-4 text-right font-medium">
                        ¥{h.marketValue?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {snapshot.holdings.length === 0 && (
                    <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic">暂无持仓数据，请上传截图或手动添加</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg h-full min-h-[300px] flex flex-col">
               <h3 className="text-slate-400 text-xs font-bold uppercase mb-4 flex items-center gap-2">
                 <PieChartIcon className="w-4 h-4" /> 仓位分布
               </h3>
               <div className="flex-1 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <History className="w-5 h-5 text-slate-500" />
          <h3 className="font-bold text-slate-700">历史复盘日志</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {journal.map((j) => (
            <div key={j.id} className="p-6 hover:bg-slate-50 transition-colors flex justify-between items-center group">
               <div className="flex gap-4 items-center">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <Activity className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{new Date(j.timestamp).toLocaleString()}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                      <span>持仓数: {j.snapshot.holdings.length}</span>
                      <span>总资产: ¥{j.snapshot.totalAssets?.toLocaleString()}</span>
                    </div>
                  </div>
               </div>
               <button onClick={() => deleteEntry(j.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-5 h-5" />
               </button>
            </div>
          ))}
          {journal.length === 0 && (
            <div className="p-12 text-center text-slate-400 italic">暂无历史复盘记录</div>
          )}
        </div>
      </div>
    </div>
  );
};
