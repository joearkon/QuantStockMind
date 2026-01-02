
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, MarketType, AnalysisResult, MainBoardScanItem } from '../types';
import { fetchMainBoardScanning } from '../services/geminiService';
import { Gavel, Loader2, Search, ArrowRight, Activity, Zap, Target, Flame, ShieldAlert, BarChart3, Rocket, Lock, Share2, Skull, RefreshCw, ZapOff, Trophy, Filter, ArrowUpDown, Users, UserPlus, Info, Wallet } from 'lucide-react';

export const MainBoardMaster: React.FC<{
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: any;
  onOpenSettings: () => void;
}> = ({ currentModel, currentMarket, settings, onOpenSettings }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  
  // Sorting state
  const [sortKey, setSortKey] = useState<keyof MainBoardScanItem>('consecutive_days');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => setElapsed(p => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleScan = async () => {
    if (!settings.geminiKey) {
      onOpenSettings();
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchMainBoardScanning(settings.geminiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "主板扫描失败，请检查网络或 API 配置");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToStock = (code: string, name: string) => {
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  const toggleSort = (key: keyof MainBoardScanItem) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const scanData = result?.mainBoardScanData;

  const sortedStocks = scanData?.stocks?.sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    }
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }
    return 0;
  });

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case '起爆': return <Rocket className="w-4 h-4 text-rose-500" />;
      case '锁筹': return <Lock className="w-4 h-4 text-amber-500" />;
      case '分歧': return <Share2 className="w-4 h-4 text-blue-500" />;
      case '出货': return <Skull className="w-4 h-4 text-slate-500" />;
      default: return <Gavel className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-rose-600 bg-rose-50 border-rose-100 font-black';
    if (score >= 70) return 'text-amber-600 bg-amber-50 border-amber-100 font-bold';
    return 'text-slate-500 bg-slate-50 border-slate-100 font-medium';
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-10 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 mb-2">
                <div className="p-3 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl text-white shadow-xl shadow-emerald-100">
                  <Gavel className="w-8 h-8" />
                </div>
                沪深主板涨停猎手 · 资金审计版
              </h2>
              <p className="text-slate-500 text-base max-w-2xl font-medium">
                AI 实时扫描沪深主板涨停标的。新增 **游资/机构画像审计**，穿透龙虎榜，识别章盟主、陈小群等顶级大佬动向。
              </p>
            </div>
            
            <button 
              onClick={handleScan}
              disabled={loading}
              className="px-10 h-16 bg-emerald-600 text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-emerald-700 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Rocket className="w-6 h-6" />}
              {loading ? `主力资金画像审计中 (${elapsed}s)...` : '启动沪深涨停全审计'}
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-black">
              <UserPlus className="w-4 h-4" /> 识别顶级游资 (章盟主/余哥等)
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-xs font-black">
              <Building2 className="w-4 h-4" /> 监控机构席位买入
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs font-black">
              <Zap className="w-4 h-4" /> 评估资金博弈影响
            </div>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mb-32 blur-3xl pointer-events-none"></div>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 flex items-center gap-4 shadow-sm animate-fade-in">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {scanData && (
        <div className="space-y-6 animate-slide-up">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl border-b-8 border-emerald-500 relative overflow-hidden">
             <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none"></div>
             <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                <div className="flex-1">
                   <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-3">主板涨停池 资金画像审计 (${scanData.scan_time})</div>
                   <p className="text-xl font-black italic leading-relaxed text-slate-200">"{scanData.market_mood}"</p>
                </div>
                <div className="flex gap-4">
                   {scanData.hot_sectors?.map((sector, idx) => (
                      <span key={idx} className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl text-xs font-black border border-white/10">{sector}</span>
                   ))}
                </div>
             </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-50/80 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                         <th className="px-8 py-5">标的信息</th>
                         <th className="px-6 py-5 cursor-pointer hover:text-emerald-600 transition-colors group" onClick={() => toggleSort('consecutive_days')}>
                            <div className="flex items-center gap-2">
                               梯队类型 <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                            </div>
                         </th>
                         <th className="px-6 py-5">资金画像 (游资/机构)</th>
                         <th className="px-6 py-5 cursor-pointer hover:text-emerald-600 transition-colors group" onClick={() => toggleSort('control_score')}>
                            <div className="flex items-center gap-2">
                               博弈分 <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                            </div>
                         </th>
                         <th className="px-6 py-5">战法与预期</th>
                         <th className="px-6 py-5 text-right">资金影响审计</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {sortedStocks?.slice(0, 20).map((stock, idx) => (
                         <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-400 flex items-center justify-center font-black text-[10px] group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                     {idx + 1}
                                  </div>
                                  <div>
                                     <div className="font-black text-slate-800 text-lg group-hover:text-emerald-600 transition-colors">{stock.name}</div>
                                     <div className="flex items-center gap-2 mt-0.5">
                                        <div className="text-[10px] font-mono text-slate-400">{stock.code}</div>
                                        <span className={`text-[9px] font-black px-1.5 rounded-md border bg-slate-50 text-slate-500 border-slate-200`}>{stock.board}</span>
                                     </div>
                                  </div>
                               </div>
                            </td>
                            <td className="px-6 py-6">
                               <div className="flex flex-col gap-1.5">
                                  {stock.limit_up_type === '首板' ? (
                                     <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-lg border border-emerald-100 w-fit">
                                        首板启动
                                     </span>
                                  ) : (
                                     <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 text-xs font-black rounded-lg border border-rose-100 w-fit animate-pulse">
                                        {stock.consecutive_days} 连板
                                     </span>
                                  )}
                               </div>
                            </td>
                            <td className="px-6 py-6">
                               <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                     <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                                        stock.capital_portrait?.main_type === '游资主导' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                        stock.capital_portrait?.main_type === '机构抱团' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                        'bg-slate-100 text-slate-600 border-slate-200'
                                     }`}>
                                        {stock.capital_portrait?.main_type}
                                     </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                     {stock.capital_portrait?.key_players.map((player, pIdx) => (
                                        <span key={pIdx} className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-slate-600 group-hover:border-emerald-300 transition-colors">
                                           {player}
                                        </span>
                                     ))}
                                  </div>
                               </div>
                            </td>
                            <td className="px-6 py-6">
                               <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border-2 text-lg shadow-sm ${getScoreColor(stock.control_score)}`}>
                                  {stock.control_score}
                               </div>
                            </td>
                            <td className="px-6 py-6">
                               <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-xs font-black uppercase tracking-widest ${
                                  stock.rating === '起爆' ? 'bg-emerald-600 text-white border-emerald-700 shadow-md' :
                                  stock.rating === '锁筹' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                  'bg-blue-100 text-blue-700 border-blue-200'
                               }`}>
                                  {getRatingIcon(stock.rating)}
                                  {stock.rating}
                               </div>
                               <div className="mt-2 text-[10px] font-black text-rose-600">目标: {stock.target_price}</div>
                            </td>
                            <td className="px-6 py-6 text-right">
                               <div className="flex flex-col items-end gap-2">
                                  <p className="text-xs text-slate-600 font-bold max-w-[200px] leading-relaxed line-clamp-2 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                                     {stock.capital_portrait?.influence_verdict}
                                  </p>
                                  <button 
                                     onClick={() => handleNavigateToStock(stock.code, stock.name)}
                                     className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-widest"
                                  >
                                     深入复盘 <ArrowRight className="w-3 h-3" />
                                  </button>
                               </div>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center py-10">
             <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-slate-200 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                <UserPlus className="w-4 h-4 text-amber-500" /> 顶级游资：擅长情绪点火与暴力封板
             </div>
             <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-slate-200 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                <Building2 className="w-4 h-4 text-indigo-500" /> 机构抱团：趋势稳定性强，但启动较慢
             </div>
             <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-slate-200 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                <Zap className="w-4 h-4 text-rose-500" /> 合力板：多方主力共同认可，连板概率高
             </div>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200">
           <div className="p-6 bg-emerald-50 rounded-full mb-8">
              <Search className="w-16 h-16 text-emerald-200" />
           </div>
           <p className="text-slate-400 font-black text-2xl tracking-tight">启动主力资金画像审计</p>
           <p className="text-slate-300 text-sm mt-4 max-w-md mx-auto leading-relaxed">
              AI 将深度扫描今日主板涨停标的的 **龙虎榜** 情况，自动解析章盟主、陈小群等知名大佬的进出场逻辑。
           </p>
        </div>
      )}
    </div>
  );
};

const Building2 = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
    <path d="M10 18h4" />
  </svg>
);
