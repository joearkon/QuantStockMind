
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, MarketType, AnalysisResult, HotMoneyAmbushStock } from '../types';
import { fetchHotMoneyAmbush } from '../services/geminiService';
import { Binoculars, Loader2, Search, ArrowRight, Zap, Flame, ShieldCheck, Activity, UserCheck, ShieldAlert, Target, Info, Sparkles, TrendingUp, Compass, LayoutGrid, AlertTriangle, Eye, Landmark, Clock, ChevronRight, Tags, BarChart, ArrowDownToLine, MoveUp, History, Gem, Star, Anchor, DollarSign, RefreshCw, Thermometer, Snowflake, Waves, Calendar, ArrowRightCircle, Gauge, ArrowDownLeft, Rocket, ZapOff, Coins, Wallet, Shuffle } from 'lucide-react';

export const HotMoneyAmbush: React.FC<{
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: any;
  onOpenSettings: () => void;
  mainBoardOnly?: boolean; // Prop to filter for main board
}> = ({ currentModel, currentMarket, settings, onOpenSettings, mainBoardOnly = true }) => {
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
    if (!settings.geminiKey) {
      onOpenSettings();
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchHotMoneyAmbush(settings.geminiKey, mainBoardOnly);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "翻身战法扫描失败");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToStock = (code: string, name: string) => {
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  const data = result?.hotMoneyAmbushData;

  const getElasticityColor = (score: number) => {
    if (score >= 85) return 'text-rose-600 border-rose-200 bg-rose-50';
    if (score >= 70) return 'text-amber-600 border-amber-200 bg-amber-50';
    return 'text-slate-500 border-slate-200 bg-slate-50';
  };

  const getPositionColor = (grade: string) => {
    switch (grade) {
      case '极低位': return 'bg-emerald-600 text-white shadow-emerald-100';
      case '相对低位': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case '中位震荡': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Search Header - Turnaround Style */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-14 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-rose-50/30 to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                 <span className="px-3 py-1 bg-amber-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-amber-100 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5" /> 沪深主板专供 (10% 权限)
                 </span>
              </div>
              <h2 className="text-4xl font-black text-slate-800 flex items-center gap-5 mb-5">
                <div className="p-4 bg-gradient-to-br from-rose-600 to-amber-600 rounded-[2rem] text-white shadow-2xl shadow-rose-100">
                  <Binoculars className="w-10 h-10" />
                </div>
                主板潜伏哨 · 补涨复利
              </h2>
              <p className="text-slate-500 text-lg max-w-3xl font-medium leading-relaxed">
                <span className="text-rose-600 font-black">目标：8万资金极致复利。</span> 
                锁定 **50-150亿市值** 的主板活跃标的。AI 已自动过滤所有 20% 权限股票，确保您可以正常交易。
              </p>
            </div>
            
            <button 
                onClick={handleScan}
                disabled={loading}
                className="px-14 h-16 bg-slate-900 text-white rounded-[1.8rem] font-black shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-4 active:scale-95 disabled:opacity-50 text-lg"
              >
                {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Search className="w-7 h-7" />}
                {loading ? `全网主板回溯中 (${elapsed}s)` : '开启主板复利审计'}
              </button>
          </div>

          <div className="flex flex-wrap gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-black shadow-sm">
                <Coins className="w-4 h-4" /> 10% 权限强约束
             </div>
             <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs font-black shadow-sm">
                <Shuffle className="w-4 h-4" /> 影子股对齐
             </div>
             <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-black shadow-sm">
                <ArrowDownLeft className="w-4 h-4" /> 低位地量审计
             </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl text-rose-700 flex items-center gap-4 shadow-sm animate-fade-in">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <span className="font-bold text-lg">{error}</span>
        </div>
      )}

      {data && (
        <div className="space-y-10 animate-slide-up">
          {/* Strategy Instruction Banner */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border-b-[12px] border-amber-600">
             <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-l from-amber-500/20 to-transparent pointer-events-none"></div>
             <div className="relative z-10 flex flex-col lg:flex-row gap-10">
                <div className="flex-1">
                   <div className="text-[10px] font-black text-amber-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 animate-pulse" /> 8万资金 · 主板复利总纲
                   </div>
                   <p className="text-2xl font-black italic leading-relaxed text-slate-200 mb-8">"{data.turnaround_strategy_summary}"</p>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                         <div className="text-xs font-black text-amber-400 uppercase mb-2 flex items-center gap-2">主板高弹性方向 (Main Elasticity)：</div>
                         <div className="flex flex-wrap gap-2">
                            {data.high_elastic_sectors?.map((s, i) => (
                               <span key={i} className="text-xs font-bold text-slate-300 bg-white/10 px-2.5 py-1 rounded-lg">⚡ {s}</span>
                            ))}
                         </div>
                      </div>
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                         <div className="text-xs font-black text-emerald-400 uppercase mb-2 flex items-center gap-2">主板席位异动：</div>
                         <p className="text-[11px] text-slate-400 font-bold leading-relaxed">{data.rotation_insight}</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-black text-amber-800">[主板审计] 所有标的均已通过代码校验。排除 300/688 等权限股。重点关注 000/60 开头标的。</p>
            </div>
          </div>

          {/* Candidates Grid - Enhanced with Elasticity focus */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {data.candidates?.map((stock, idx) => (
                <div key={idx} className={`bg-white rounded-[2.8rem] border shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all border-slate-200 hover:border-amber-400`}>
                   {/* Card Header */}
                   <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex flex-col">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 border mb-1 bg-white border-slate-200 text-slate-500`}>
                           {stock.sector_name}
                        </div>
                        <div className="text-[9px] font-black text-amber-600 flex items-center gap-1 uppercase tracking-tighter">
                           <Landmark className="w-3 h-3" /> 主板 10% 权限标的
                        </div>
                      </div>
                      <div className="text-right">
                         <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getPositionColor(stock.position_grade)}`}>
                            {stock.position_grade}
                         </div>
                      </div>
                   </div>

                   <div className="p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                         <div className="flex-1">
                            <h4 className="text-2xl font-black text-slate-800 group-hover:text-amber-600 transition-colors">{stock.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="text-xs font-mono text-slate-400">{stock.code}</span>
                               <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-black rounded border border-amber-100">{stock.market_cap_label}</span>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className={`text-2xl font-black tracking-tighter ${getElasticityColor(stock.elasticity_score).split(' ')[0]}`}>
                               {stock.elasticity_score}
                            </div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">主板活性分</div>
                         </div>
                      </div>

                      {/* Catch-up Logic Anchor */}
                      <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 mb-4 group-hover:bg-rose-100 transition-colors">
                         <div className="flex items-center gap-2 text-[10px] font-black text-rose-700 uppercase tracking-widest mb-1.5">
                            <Shuffle className="w-3.5 h-3.5" /> 补涨参照龙头 (Anchor)
                         </div>
                         <p className="text-xs text-rose-900 font-bold leading-relaxed flex items-center gap-2">
                            对标：<span className="bg-rose-600 text-white px-2 py-0.5 rounded shadow-sm">{stock.catch_up_anchor_leader}</span>
                         </p>
                      </div>

                      <div className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100 mb-6 group-hover:bg-indigo-50 transition-colors">
                         <div className="flex items-center gap-2 text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1.5">
                            <Activity className="w-3.5 h-3.5" /> 筹码状态
                         </div>
                         <p className="text-xs text-indigo-900 font-bold leading-relaxed italic">
                            "{stock.k_pattern_sign}"
                         </p>
                      </div>

                      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex-1 mb-8 shadow-inner">
                         <h5 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" /> 复利逻辑 (Revival)
                         </h5>
                         <p className="text-sm text-slate-300 font-bold leading-relaxed italic">
                            "{stock.turnaround_logic}"
                         </p>
                      </div>

                      <button 
                        onClick={() => handleNavigateToStock(stock.code, stock.name)}
                        className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-lg bg-slate-900 text-white hover:bg-amber-600 shadow-amber-100`}
                      >
                         查看主板合力诊断 <ArrowRight className="w-4 h-4" />
                      </button>
                   </div>
                </div>
             ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
           <div className="relative">
              <Binoculars className="w-24 h-24 text-amber-100 mb-8" />
           </div>
           <p className="text-slate-400 font-black text-3xl tracking-tight">扫描主板潜伏机会</p>
           <p className="text-slate-300 text-base mt-4 max-w-lg mx-auto leading-relaxed">
              AI 正在回溯 000/60 开头标的，寻找主板龙头的底部影子股。
           </p>
        </div>
      )}
    </div>
  );
};
