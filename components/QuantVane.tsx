
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, MarketType, AnalysisResult, QuantVaneStock } from '../types';
import { fetchQuantClusterAnalysis } from '../services/quantService';
import { Radio, Loader2, Search, ArrowRight, Zap, Flame, ShieldCheck, Activity, UserCheck, ShieldAlert, Target, Info, Sparkles, TrendingUp, Gauge, RefreshCw, BarChart3, Globe, ChevronRight, LayoutGrid, ListFilter } from 'lucide-react';

interface QuantVaneProps {
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: any;
  onOpenSettings: () => void;
}

export const QuantVane: React.FC<QuantVaneProps> = ({ currentModel, currentMarket, settings, onOpenSettings }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => setElapsed(p => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleScan = async () => {
    const apiKey = settings.geminiKey || process.env.API_KEY;
    if (!apiKey) {
      onOpenSettings();
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchQuantClusterAnalysis(currentMarket, apiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "量化雷达扫描失败，请检查网络");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToStock = (code: string, name: string) => {
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  const data = result?.quantVaneData;

  const renderCompactStockCard = (stock: QuantVaneStock, idx: number) => {
    const isBuy = stock.direction === 'Buy' || !stock.direction; // 默认买入
    return (
      <div 
        key={idx} 
        onClick={() => handleNavigateToStock(stock.code, stock.name)}
        className="bg-white border border-slate-100 p-3 sm:p-4 rounded-xl hover:border-indigo-400 hover:shadow-lg transition-all cursor-pointer group relative flex flex-col items-center justify-center text-center shadow-sm"
      >
        <div className="font-black text-slate-800 text-sm mb-1.5 group-hover:text-indigo-600 transition-colors truncate w-full px-1">
          {stock.name}
        </div>
        <div className={`w-full py-1 rounded text-[10px] font-black tracking-tighter ${isBuy ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
          {isBuy ? '净买 ' : '净卖 '}{stock.net_amount}
        </div>
        <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[8px] text-slate-400 font-bold uppercase">
           详情 <ChevronRight className="w-2.5 h-2.5" />
        </div>
      </div>
    );
  };

  const renderSection = (title: string, icon: React.ReactNode, stocks: QuantVaneStock[], subtitle?: string) => {
    if (!stocks || stocks.length === 0) return null;
    return (
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                {icon}
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-xl tracking-tight">{title}</h3>
                {subtitle && <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest">{subtitle}</p>}
              </div>
           </div>
           <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
              <span className="text-[10px] font-black text-slate-400">COUNT:</span>
              <span className="text-xs font-black text-indigo-600">{stocks.length}</span>
           </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {stocks.map((s, i) => renderCompactStockCard(s, i))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Header Panel */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-12 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-rose-50 to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex-1 text-center lg:text-left">
            <div className="flex flex-col lg:flex-row items-center gap-4 mb-6 justify-center lg:justify-start">
               <div className="p-4 bg-rose-600 rounded-3xl text-white shadow-2xl shadow-rose-100">
                  <Radio className="w-10 h-10 animate-pulse" />
               </div>
               <div>
                  <h2 className="text-4xl font-black text-slate-800 tracking-tighter">量化席位全景雷达</h2>
                  <div className="flex items-center gap-2 mt-1 justify-center lg:justify-start">
                    <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 uppercase tracking-widest">Dragon-Tiger Grounding</span>
                    <span className="text-[10px] font-black px-2 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-100 uppercase tracking-widest">Real-Time Seats</span>
                  </div>
               </div>
            </div>
            <p className="text-slate-500 text-lg max-w-2xl font-medium leading-relaxed mb-8">
              根据您的反馈，本功能已升级为**高密度个股审计模式**。AI 将实时从龙虎榜海量数据中锁定“量化基金”专用席位，为您呈现最真实的资金合力分布。
            </p>
          </div>
          <button 
            onClick={handleScan}
            disabled={loading}
            className="px-16 h-20 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-4 active:scale-95 disabled:opacity-50 whitespace-nowrap text-xl"
          >
            {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <RefreshCw className="w-7 h-7" />}
            {loading ? `全网席位审计中 (${elapsed}s)...` : '启动全量标的扫描'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-40 flex flex-col items-center justify-center bg-white rounded-[3.5rem] border-4 border-dashed border-slate-100 animate-pulse">
          <div className="relative mb-10">
             <Radio className="w-24 h-24 text-rose-300 animate-ping absolute" />
             <Radio className="w-24 h-24 text-rose-600 relative" />
          </div>
          <p className="font-black text-slate-500 text-2xl tracking-tight">正在多线程解析今日龙虎榜“量化”打标席位...</p>
          <p className="text-rose-400 text-xs font-bold mt-4 uppercase tracking-[0.4em]">正在同步精选标的池 (Scaling Target Pool)...</p>
        </div>
      )}

      {error && (
        <div className="p-8 bg-rose-50 border border-rose-100 rounded-3xl text-rose-700 flex items-center gap-4 shadow-sm animate-fade-in">
          <ShieldAlert className="w-8 h-8 shrink-0" />
          <span className="font-black text-lg">{error}</span>
        </div>
      )}

      {data && (
        <div className="space-y-8 animate-slide-up">
          {/* Summary Banner */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center border-b-[12px] border-rose-600">
             <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-rose-500/10 to-transparent pointer-events-none"></div>
             <div className="text-[10px] font-black text-rose-400 uppercase tracking-[0.5em] mb-4 flex items-center gap-3">
                <Target className="w-5 h-5" /> 真实量化合力研判报告 (${data.scan_time})
             </div>
             <p className="text-3xl font-black italic leading-tight text-slate-100 mb-8 max-w-5xl">"{data.overall_mood}"</p>
             <div className="flex items-center gap-6">
                <div className="px-6 py-3 bg-rose-500/20 rounded-2xl border border-rose-500/20 flex flex-col">
                   <span className="text-[10px] text-rose-300 font-bold uppercase mb-1 tracking-widest">风险警示 (Risk)</span>
                   <span className="text-base font-black text-rose-100">{data.risk_warning}</span>
                </div>
                <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 flex flex-col">
                   <span className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-widest">标的池容量 (Capacity)</span>
                   <span className="text-base font-black text-white">
                      {((data.top_synergy_pool?.length || 0) + (data.quant_boarding_list?.length || 0) + (data.quant_grabbing_list?.length || 0))} 只
                   </span>
                </div>
             </div>
          </div>

          <div className="space-y-8">
             {/* 核心标的池 */}
             {renderSection(
               "量化合力先锋标的池", 
               <BarChart3 className="w-6 h-6 text-indigo-500" />, 
               data.top_synergy_pool, 
               "QUANTITATIVE SYNERGY TOP 15"
             )}

             {/* 打板榜 */}
             {renderSection(
               "量化专用打板席位榜", 
               <Flame className="w-6 h-6 text-rose-500" />, 
               data.quant_boarding_list, 
               "LIMIT-UP BOARDING TARGETS"
             )}

             {/* 抢筹榜 */}
             {renderSection(
               "量化异常抢筹预警榜", 
               <Zap className="w-6 h-6 text-amber-500" />, 
               data.quant_grabbing_list, 
               "AGGRESSIVE CHIP GRABBING"
             )}
          </div>

          {/* Usage Info */}
          <div className="bg-indigo-900 border border-indigo-800 rounded-[3rem] p-10 text-white relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
             <div className="flex-1 relative z-10">
                <div className="flex items-center gap-3 mb-4 text-indigo-300 font-black text-sm uppercase tracking-widest">
                   <Info className="w-5 h-5" /> 席位数据审计声明
                </div>
                <div className="text-lg font-bold leading-relaxed text-indigo-100 space-y-4">
                  <p>
                    1. <b>数据源映射</b>：本工具通过 AI 联网搜索，自动识别龙虎榜中标记为“量化基金”的专用席位。
                  </p>
                  <p>
                    2. <b>合力逻辑</b>：当某标的出现多路量化席位集体买入且净额巨大（如农发种业买入1.49亿），代表筹码一致性极高，属于“高胜率打法”。
                  </p>
                  <p>
                    3. <b>风险对冲</b>：若量化资金在大幅盈利后集体出现在卖方席位，须警惕模型集体触发止损导致的“踩踏式回落”。
                  </p>
                </div>
             </div>
             <div className="shrink-0 relative z-10">
                <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 flex flex-col items-center">
                   <LayoutGrid className="w-12 h-12 text-indigo-400 mb-4" />
                   <div className="text-center">
                      <div className="text-3xl font-black mb-1">多维度</div>
                      <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest">个股深度穿透</div>
                   </div>
                </div>
             </div>
             <div className="absolute left-0 bottom-0 opacity-10 pointer-events-none">
                <Globe className="w-64 h-64 -ml-12 -mb-12" />
             </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!data && !loading && (
        <div className="py-48 text-center flex flex-col items-center justify-center bg-white rounded-[3.5rem] border-4 border-dashed border-slate-100">
           <Radio className="w-24 h-24 text-rose-100 mb-10" />
           <p className="text-slate-400 font-black text-3xl tracking-tight">量化席位雷达已就绪</p>
           <p className="text-slate-300 text-lg mt-6 max-w-2xl mx-auto leading-relaxed font-medium">
              不再只给板块，深度审计龙虎榜真实席位。
              <br />
              <b>点击“启动全量扫描”，获取今日最真实的量化打板与抢筹标的池。</b>
           </p>
        </div>
      )}
    </div>
  );
};
