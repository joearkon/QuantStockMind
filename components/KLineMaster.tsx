
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, MarketType, AnalysisResult, DualBoardScanItem } from '../types';
import { fetchDualBoardScanning } from '../services/geminiService';
import { ScanEye, Loader2, Search, ArrowRight, Activity, Zap, Target, Info, Flame, TrendingUp, Compass, ShieldAlert, BarChart3, Rocket, Lock, Share2, Skull, RefreshCw, CheckCircle, ZapOff, Layers, Trophy, Coins, UserCheck } from 'lucide-react';

export const KLineMaster: React.FC<{
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
  const [sortKey, setSortKey] = useState<keyof DualBoardScanItem>('control_score');
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
      const data = await fetchDualBoardScanning(settings.geminiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "涨停扫描失败，请检查网络或 API 配置");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToStock = (code: string, name: string) => {
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  const scanData = result?.dualBoardScanData;

  const sortedStocks = scanData?.stocks?.sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    }
    return 0;
  });

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case '起爆': return <Rocket className="w-4 h-4 text-rose-500" />;
      case '锁筹': return <Lock className="w-4 h-4 text-amber-500" />;
      case '分歧': return <Share2 className="w-4 h-4 text-blue-500" />;
      case '出货': return <Skull className="w-4 h-4 text-slate-500" />;
      default: return <Compass className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-rose-600 bg-rose-50 border-rose-100 font-black';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-100 font-bold';
    return 'text-slate-500 bg-slate-50 border-slate-100 font-medium';
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 md:p-10 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 mb-2">
                <div className="p-3 bg-gradient-to-br from-rose-600 to-rose-800 rounded-2xl text-white shadow-xl shadow-rose-100">
                  <Trophy className="w-8 h-8" />
                </div>
                双创涨停控盘猎手 (Limit-Up Hunter)
              </h2>
              <p className="text-slate-500 text-base max-w-2xl font-medium">
                AI 实时锁定今日 **创业板** 与 **科创板** 封板标的。深度透视 **涨停高度**、**大资金介入金额** 与 **龙虎榜席位**。
              </p>
            </div>
            
            <button 
              onClick={handleScan} 
              disabled={loading}
              className="px-10 h-16 bg-rose-600 text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-rose-700 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Rocket className="w-6 h-6" />}
              {loading ? `深度扫描资金细节 (${elapsed}s)...` : '今日双创全量扫描'}
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-black">
              <Coins className="w-4 h-4" /> 净买入金额优先
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs font-black">
              <Zap className="w-4 h-4" /> 20cm高度列
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-xs font-black">
              <UserCheck className="w-4 h-4" /> 游资席位审计
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 flex items-center gap-4 shadow-sm animate-fade-in">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {scanData && (
        <div className="space-y-6 animate-slide-up">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl border-b-8 border-rose-600 relative overflow-hidden">
             <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                <div className="flex-1">
                   <div className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em] mb-3">双创涨停审计汇总 (${scanData.scan_time})</div>
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
                         <th className="px-8 py-5">标的 (代码 / 板块)</th>
                         <th className="px-6 py-5 cursor-pointer hover:text-rose-600 transition-colors" onClick={() => {setSortKey('consecutive_days'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');}}>
                            高度 {sortKey === 'consecutive_days' && (sortOrder === 'desc' ? '↓' : '↑')}
                         </th>
                         <th className="px-6 py-5 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => {setSortKey('control_score'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');}}>
                            强度分 {sortKey === 'control_score' && (sortOrder === 'desc' ? '↓' : '↑')}
                         </th>
                         <th className="px-6 py-5">资金审计 (Net / Order)</th>
                         <th className="px-6 py-5">参与席位 / 操盘战法</th>
                         <th className="px-6 py-5 text-right">操盘逻辑</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {sortedStocks?.map((stock, idx) => (
                         <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-400 flex items-center justify-center font-black text-[10px] group-hover:bg-rose-600 group-hover:text-white transition-all">
                                     {idx + 1}
                                  </div>
                                  <div>
                                     <div className="font-black text-slate-800 text-lg group-hover:text-rose-600 transition-colors flex items-center gap-2">
                                       {stock.name}
                                     </div>
                                     <div className="flex items-center gap-2 mt-0.5">
                                        <div className="text-[10px] font-mono text-slate-400">{stock.code}</div>
                                        <span className={`text-[9px] font-black px-1.5 rounded-md border ${
                                          stock.board === '科创板' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                        }`}>{stock.board}</span>
                                     </div>
                                  </div>
                               </div>
                            </td>
                            <td className="px-6 py-6">
                               {stock.consecutive_days > 1 ? (
                                 <div className="inline-flex flex-col items-center">
                                   <span className="px-3 py-1 bg-rose-600 text-white text-xs font-black rounded-lg shadow-sm animate-pulse border border-rose-700">
                                      {stock.consecutive_days} 连板
                                   </span>
                                   <span className="text-[8px] font-bold text-rose-400 mt-1 uppercase">20% Limit Up</span>
                                 </div>
                               ) : (
                                 <div className="inline-flex flex-col items-center">
                                   <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-lg border border-indigo-100">
                                      首板启动
                                   </span>
                                   <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">New Cycle</span>
                                 </div>
                               )}
                            </td>
                            <td className="px-6 py-6 text-center">
                               <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl border-2 text-xl shadow-sm ${getScoreColor(stock.control_score)}`}>
                                  {stock.control_score}
                               </div>
                            </td>
                            <td className="px-6 py-6">
                               <div className="text-sm font-black text-rose-600 flex items-center gap-1.5">
                                 <Coins className="w-3.5 h-3.5" /> 净买: {stock.capital_detail.net_buy_amount}
                               </div>
                               <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                                 大单占比: {stock.capital_detail.large_order_ratio}
                               </div>
                            </td>
                            <td className="px-6 py-6">
                               <div className="flex flex-wrap gap-1 mb-2">
                                 {stock.capital_detail.seats.slice(0, 2).map((seat, si) => (
                                   <span key={si} className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{seat}</span>
                                 ))}
                               </div>
                               <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${
                                  stock.rating === '起爆' ? 'bg-rose-600 text-white border-rose-700' :
                                  stock.rating === '锁筹' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                               }`}>
                                  {getRatingIcon(stock.rating)}
                                  {stock.rating}
                               </div>
                            </td>
                            <td className="px-6 py-6 text-right">
                               <div className="flex flex-col items-end gap-3">
                                  <p className="text-sm text-slate-500 font-bold max-w-[200px] leading-relaxed line-clamp-2 italic text-right">
                                     "{stock.logic}"
                                  </p>
                                  <button 
                                     onClick={() => handleNavigateToStock(stock.code, stock.name)}
                                     className="flex items-center gap-2 text-[10px] font-black text-rose-500 hover:text-rose-700 transition-colors uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full border border-rose-100"
                                  >
                                     详情 <ArrowRight className="w-3 h-3" />
                                  </button>
                               </div>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
