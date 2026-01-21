
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, MarketType, AnalysisResult, TrendHighScoutStock } from '../types';
import { fetchTrendHighScout } from '../services/geminiService';
import { Rocket, Loader2, Search, ArrowRight, Zap, Flame, ShieldCheck, Activity, UserCheck, ShieldAlert, Target, Info, Sparkles, TrendingUp, Compass, LayoutGrid, AlertTriangle, Eye, Landmark, Clock, ChevronRight, Tags, BarChart, ArrowDownToLine, MoveUp, History, Gem, Star, Anchor, DollarSign, RefreshCw, Thermometer, Snowflake, Waves, Calendar, ArrowRightCircle, Gauge, ArrowDownLeft, Wallet, Coins, Shuffle, Cloud, ZapOff } from 'lucide-react';

export const TrendHighScout: React.FC<{
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
      const data = await fetchTrendHighScout(settings.geminiKey, mainBoardOnly);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "新高扫描失败");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToStock = (code: string, name: string) => {
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  const data = result?.trendHighScoutData;

  const getBreakoutColor = (type: string) => {
    switch (type) {
      case '历史新高': return 'bg-rose-600 text-white shadow-rose-100';
      case '阶段新高': return 'bg-indigo-600 text-white shadow-indigo-100';
      case '平台突破': return 'bg-amber-500 text-white shadow-amber-100';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Search Header */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-14 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-indigo-50/30 to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                 <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5" /> 沪深主板专供 (仅限 10%)
                 </span>
              </div>
              <h2 className="text-4xl font-black text-slate-800 flex items-center gap-5 mb-5">
                <div className="p-4 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] text-white shadow-2xl shadow-indigo-100">
                  <Cloud className="w-10 h-10" />
                </div>
                主板突破哨 · 强者恒强
              </h2>
              <p className="text-slate-500 text-lg max-w-3xl font-medium leading-relaxed">
                <span className="text-indigo-600 font-black">核心：新高/无抛压/5日线支撑。</span> 
                专门捕捉主板中已经走出趋势、高位缩量回踩 MA5 的标的。排除所有 300/688 代码。
              </p>
            </div>
            
            <button 
                onClick={handleScan}
                disabled={loading}
                className="px-14 h-16 bg-slate-900 text-white rounded-[1.8rem] font-black shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-4 active:scale-95 disabled:opacity-50 text-lg"
              >
                {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Search className="w-7 h-7" />}
                {loading ? `全网主板趋势回溯中 (${elapsed}s)` : '扫描主板新高标的'}
              </button>
          </div>

          <div className="flex flex-wrap gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-black shadow-sm">
                <TrendingUp className="w-4 h-4" /> 历史/阶段新高探测
             </div>
             <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-xs font-black shadow-sm">
                <Activity className="w-4 h-4" /> 5日线强力支撑
             </div>
             <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-black shadow-sm">
                <Zap className="w-4 h-4" /> 10% 权限合规校验
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
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border-b-[12px] border-indigo-600">
             <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none"></div>
             <div className="relative z-10 flex flex-col lg:flex-row gap-10">
                <div className="flex-1">
                   <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                      <Rocket className="w-4 h-4 animate-pulse" /> 强者恒强 · 主板云端起爆
                   </div>
                   <p className="text-2xl font-black italic leading-relaxed text-slate-200 mb-8">"{data.trend_market_sentiment}"</p>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                         <div className="text-xs font-black text-rose-400 uppercase mb-2 flex items-center gap-2">主板突破赛道：</div>
                         <div className="flex flex-wrap gap-2">
                            {data.hot_breakout_sectors?.map((s, i) => (
                               <span key={i} className="text-xs font-bold text-slate-300 bg-white/10 px-2.5 py-1 rounded-lg">🚀 {s}</span>
                            ))}
                         </div>
                      </div>
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                         <div className="text-xs font-black text-amber-400 uppercase mb-2 flex items-center gap-2">主板风险预警：</div>
                         <p className="text-[11px] text-slate-400 font-bold leading-relaxed">{data.risk_warning}</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Candidates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {data.candidates?.map((stock, idx) => (
                <div key={idx} className={`bg-white rounded-[2.8rem] border shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all border-slate-200 hover:border-indigo-400`}>
                   {/* Card Header */}
                   <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex flex-col">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 border mb-1 bg-white border-slate-200 text-slate-500`}>
                           {stock.active_capital_type}
                        </div>
                        <div className="text-[9px] font-black text-rose-600 flex items-center gap-1 uppercase tracking-tighter">
                           <Flame className="w-3 h-3" /> 30日弹性审计: {stock.last_30d_max_surge}%
                        </div>
                      </div>
                      <div className="text-right">
                         <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getBreakoutColor(stock.breakout_type)}`}>
                            {stock.breakout_type}
                         </div>
                         {stock.is_blue_sky && (
                           <div className="mt-1 flex items-center justify-end gap-1">
                              <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                              <span className="text-[8px] font-black text-amber-600 uppercase">主板蓝天标</span>
                           </div>
                         )}
                      </div>
                   </div>

                   <div className="p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                         <div className="flex-1">
                            <h4 className="text-2xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{stock.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="text-xs font-mono text-slate-400">{stock.code}</span>
                               <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded border border-indigo-100">{stock.pattern_label}</span>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="text-2xl font-black text-indigo-600 tracking-tighter">
                               {stock.sky_limit_score}
                            </div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">无压空间分</div>
                         </div>
                      </div>

                      {/* MA5 Support Detail */}
                      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 mb-4 group-hover:bg-emerald-100 transition-colors">
                         <div className="flex items-center gap-2 text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" /> 主板 5 日线支撑
                         </div>
                         <p className="text-xs text-emerald-900 font-bold leading-relaxed flex items-center justify-between">
                            <span>支撑点: <span className="font-mono">{stock.stop_loss_ma5}</span></span>
                            <span className="px-2 py-0.5 bg-white rounded border border-emerald-200">乖离: {stock.ma5_distance_percent}%</span>
                         </p>
                      </div>

                      <div className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100 mb-6 group-hover:bg-indigo-50 transition-colors">
                         <div className="flex items-center gap-2 text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1.5">
                            <Activity className="w-3.5 h-3.5" /> 筹码状态
                         </div>
                         <p className="text-xs text-indigo-900 font-black leading-relaxed">
                            形态特征: <span className="text-indigo-600 underline underline-offset-4 decoration-indigo-200">{stock.vol_status}</span>
                         </p>
                      </div>

                      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex-1 mb-8 shadow-inner relative overflow-hidden">
                         <h5 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" /> 主板突破研判
                         </h5>
                         <p className="text-sm text-slate-300 font-bold leading-relaxed italic relative z-10">
                            "{stock.logic_breakout}"
                         </p>
                      </div>

                      <button 
                        onClick={() => handleNavigateToStock(stock.code, stock.name)}
                        className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-lg bg-slate-900 text-white hover:bg-rose-600 shadow-rose-100`}
                      >
                         查看主板合力数据 <ArrowRight className="w-4 h-4" />
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
              <Cloud className="w-24 h-24 text-indigo-100 mb-8" />
           </div>
           <p className="text-slate-400 font-black text-3xl tracking-tight">扫描主板云端机会</p>
           <p className="text-slate-300 text-base mt-4 max-w-lg mx-auto leading-relaxed">
              AI 正在回溯 000/60 开头创下新高的主板标的，且目前在高位进行健康缩量横盘。
           </p>
        </div>
      )}
    </div>
  );
};
