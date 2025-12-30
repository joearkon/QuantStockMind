
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, MarketType, AnalysisResult, MainBoardScanItem } from '../types';
import { fetchMainBoardScanning } from '../services/geminiService';
import { Gavel, Loader2, Search, ArrowRight, Activity, Zap, Target, Flame, ShieldAlert, BarChart3, Rocket, Lock, Share2, Skull, RefreshCw, ZapOff, Trophy, Filter, ArrowUpDown } from 'lucide-react';

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
                <div className="p-3 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl text-white shadow-xl shadow-emerald-100">
                  <Gavel className="w-8 h-8" />
                </div>
                沪深主板涨停猎手 (Main Board Hunter)
              </h2>
              <p className="text-slate-500 text-base max-w-2xl font-medium">
                AI 实时锁定今日 **上证主板** 与 **深证主板** 10% 涨停标的。自动区分 **首板** 与 **连板** 基因。
              </p>
            </div>
            
            <button 
              onClick={handleScan}
              disabled={loading}
              className="px-10 h-16 bg-emerald-600 text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-emerald-700 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Rocket className="w-6 h-6" />}
              {loading ? `主板标的深度扫描中 (${elapsed}s)...` : '今日沪深涨停全扫描'}
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-black">
              <Filter className="w-4 h-4" /> 区分首板/连板
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs font-black">
              <Zap className="w-4 h-4" /> 过滤 ST 垃圾股
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-xs font-black">
              <Flame className="w-4 h-4" /> 统计连板高度
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-xs font-black">
              <ZapOff className="w-4 h-4" /> 纯资金势能审计
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
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl border-b-8 border-emerald-500 relative overflow-hidden">
             <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none"></div>
             <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                <div className="flex-1">
                   <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-3">主板涨停池 20 只控盘快报 (${scanData.scan_time})</div>
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
                         <th className="px-8 py-5">涨停标的 (代码 / 板块)</th>
                         <th className="px-6 py-5 cursor-pointer hover:text-emerald-600 transition-colors group" onClick={() => toggleSort('consecutive_days')}>
                            <div className="flex items-center gap-2">
                               涨停高度 / 类型 <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                            </div>
                         </th>
                         <th className="px-6 py-5 cursor-pointer hover:text-emerald-600 transition-colors group" onClick={() => toggleSort('control_score')}>
                            <div className="flex items-center gap-2">
                               封板强度分 <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                            </div>
                         </th>
                         <th className="px-6 py-5">扫货成本 / 封板动能</th>
                         <th className="px-6 py-5">操盘战法</th>
                         <th className="px-6 py-5 text-right">操盘逻辑</th>
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
                                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1">
                                     {stock.limit_up_type === '首板' ? '底部放量突破' : `主升高度 ${stock.consecutive_days}D`}
                                  </div>
                               </div>
                            </td>
                            <td className="px-6 py-6">
                               <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl border-2 text-xl shadow-sm ${getScoreColor(stock.control_score)}`}>
                                  {stock.control_score}
                               </div>
                            </td>
                            <td className="px-6 py-6">
                               <div className="text-sm font-black text-slate-700">扫货价: ¥{stock.cost_price}</div>
                               <div className="flex items-center gap-1.5 mt-1">
                                  <Activity className="w-3 h-3 text-emerald-500" />
                                  <span className="text-xs font-black text-emerald-600">{stock.trend_momentum}</span>
                               </div>
                            </td>
                            <td className="px-6 py-6">
                               <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-xs font-black uppercase tracking-widest ${
                                  stock.rating === '起爆' ? 'bg-emerald-600 text-white border-emerald-700 shadow-md' :
                                  stock.rating === '锁筹' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                  stock.rating === '出货' ? 'bg-slate-800 text-slate-200 border-slate-900' : 'bg-blue-100 text-blue-700 border-blue-200'
                               }`}>
                                  {getRatingIcon(stock.rating)}
                                  {stock.rating}
                               </div>
                            </td>
                            <td className="px-6 py-6 text-right">
                               <div className="flex flex-col items-end gap-3">
                                  <p className="text-sm text-slate-500 font-bold max-w-[240px] leading-relaxed line-clamp-2 italic">
                                     "{stock.logic}"
                                  </p>
                                  <button 
                                     onClick={() => handleNavigateToStock(stock.code, stock.name)}
                                     className="flex items-center gap-2 text-[10px] font-black text-emerald-500 hover:text-emerald-700 transition-colors uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100"
                                  >
                                     深度量化分析 <ArrowRight className="w-3 h-3" />
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
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 首板：近期首个涨停，具备较高参与潜力
             </div>
             <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-slate-200 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> 连板：强势接力，关注分歧回封机会
             </div>
             <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-slate-200 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                <Skull className="w-4 h-4 text-slate-800" /> 风险：主板大票炸板通常伴随剧烈分歧
             </div>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200">
           <BarChart3 className="w-20 h-20 text-emerald-100 mb-8" />
           <p className="text-slate-400 font-black text-2xl tracking-tight">准备好狙击沪深主板涨停吗？</p>
           <p className="text-slate-300 text-sm mt-4 max-w-md mx-auto leading-relaxed">
              点击上方按钮，AI 将同步获取 **上证主板** 与 **深证主板** 最新的封板动态，智能区分首板与连板标的。
           </p>
        </div>
      )}
    </div>
  );
};
