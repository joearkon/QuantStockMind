
// DO add comment above each fix.
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, MarketType, AnalysisResult, HotMoneyAmbushStock } from '../types';
import { fetchHotMoneyAmbush } from '../services/geminiService';
// Fix: Added RefreshCw to the imports from lucide-react.
import { Binoculars, Loader2, Search, ArrowRight, Zap, Flame, ShieldCheck, Activity, UserCheck, ShieldAlert, Target, Info, Sparkles, TrendingUp, Compass, LayoutGrid, AlertTriangle, Eye, Landmark, Clock, ChevronRight, Tags, BarChart, ArrowDownToLine, MoveUp, History, Gem, Star, Anchor, DollarSign, RefreshCw } from 'lucide-react';

export const HotMoneyAmbush: React.FC<{
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
      const data = await fetchHotMoneyAmbush(settings.geminiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "潜伏扫描失败");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToStock = (code: string, name: string) => {
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  const data = result?.hotMoneyAmbushData;

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'GoldenPit': return 'bg-emerald-500 text-white border-emerald-600';
      case 'Dormant': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Stirring': return 'bg-amber-500 text-white border-amber-600';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  const getDragonBloodColor = (score: number) => {
    if (score >= 90) return 'text-rose-600 bg-rose-50';
    if (score >= 75) return 'text-indigo-600 bg-indigo-50';
    return 'text-slate-500 bg-slate-50';
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Search Header */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-14 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-emerald-50/50 to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-slate-800 flex items-center gap-5 mb-5">
            <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[2rem] text-white shadow-2xl shadow-emerald-100">
              <Gem className="w-10 h-10" />
            </div>
            远古龙血 · 动态潜伏探测器
          </h2>
          <p className="text-slate-500 text-lg max-w-3xl font-medium mb-10 leading-relaxed">
            回溯 **180日** 龙虎基因。自动检索最新 **现价 (Current Price)**，杜绝刻舟求剑。寻找回踩近期中枢或黄金坑底的“二波潜力种”。
          </p>

          <div className="flex flex-col md:flex-row gap-5 items-center">
             <div className="flex flex-wrap gap-3 flex-1">
                <span className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-black flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> 现价逻辑强制核验
                </span>
                <span className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-black flex items-center gap-2">
                  <History className="w-4 h-4" /> 180日基因考古
                </span>
                <span className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-xs font-black flex items-center gap-2">
                  <Zap className="w-4 h-4" /> 剔除二连板明牌
                </span>
             </div>
             <button 
                onClick={handleScan}
                disabled={loading}
                className="px-14 h-16 bg-slate-900 text-white rounded-[1.8rem] font-black shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-4 active:scale-95 disabled:opacity-50 text-lg"
              >
                {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Search className="w-7 h-7" />}
                {loading ? `全网龙血考古中 (${elapsed}s)` : '开启 180日 潜伏探测'}
              </button>
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
          {/* Summary Banner */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border-b-[12px] border-emerald-600">
             <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-l from-emerald-500/20 to-transparent pointer-events-none"></div>
             <div className="relative z-10 flex flex-col lg:flex-row gap-10">
                <div className="flex-1">
                   <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                      <Star className="w-4 h-4 animate-pulse" /> 历史龙血基因考古快报
                   </div>
                   <p className="text-2xl font-black italic leading-relaxed text-slate-200 mb-6">"{data.market_summary}"</p>
                   <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-inner">
                      <div className="text-xs font-black text-indigo-400 uppercase mb-2">历史周期回顾：</div>
                      <p className="text-sm font-medium text-slate-300 leading-relaxed italic opacity-90">{data.historical_context}</p>
                   </div>
                </div>
                <div className="w-full lg:w-80 space-y-4">
                   <div className="bg-emerald-600/20 backdrop-blur-md p-6 rounded-[2rem] border border-emerald-500/30 text-center">
                      <div className="text-[10px] text-emerald-300 font-bold uppercase mb-3 tracking-widest">探测准则 (Detecting Standard)</div>
                      <p className="text-[11px] text-emerald-100 font-medium leading-relaxed">
                        潜伏区已根据 **今日 (${data.scan_time}) 现价** 进行动态修正，回撤幅度大于 30% 通常标记为“等待极值点”。
                      </p>
                   </div>
                </div>
             </div>
          </div>

          {/* Candidates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {data.candidates.map((stock, idx) => (
                <div key={idx} className={`bg-white rounded-[2.8rem] border shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all ${
                   stock.ambush_rating === 'Avoid' ? 'border-slate-100 opacity-60 grayscale' : 'border-slate-200 hover:border-emerald-400'
                }`}>
                   {/* Card Header with Gene Score */}
                   <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 ${getDragonBloodColor(stock.dragon_blood_score)}`}>
                         <Flame className="w-3 h-3" /> 龙血值: {stock.dragon_blood_score}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${getPhaseColor(stock.phase)}`}>
                         {stock.phase === 'GoldenPit' ? '🎯 黄金坑' : stock.phase === 'Stirring' ? '🔥 萌动中' : '💤 沉寂区'}
                      </div>
                   </div>

                   <div className="p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                         <div className="flex-1">
                            <div className="flex items-center gap-2">
                               <h4 className="text-2xl font-black text-slate-800">{stock.name}</h4>
                               <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black rounded-md">{stock.current_price}</span>
                            </div>
                            <span className="text-xs font-mono text-slate-400 mt-1 block">{stock.code} | {stock.sector_name}</span>
                         </div>
                         <div className="text-right">
                            <div className={`text-lg font-black ${stock.pit_depth_percent > 30 ? 'text-emerald-600' : 'text-amber-500'}`}>-{stock.pit_depth_percent}%</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase">相对回撤</div>
                         </div>
                      </div>

                      {/* Historical Context Panel */}
                      <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 mb-6 group-hover:bg-indigo-100 transition-colors">
                         <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                               <History className="w-3.5 h-3.5" /> 历史高光追溯
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">{stock.historical_glory_period}</span>
                         </div>
                         <div className="flex flex-wrap gap-1.5 mb-2">
                            {stock.historical_seats.slice(0, 3).map((seat, si) => (
                               <span key={si} className="text-[8px] font-black text-indigo-700 bg-white border border-indigo-100 px-1.5 py-0.5 rounded uppercase">{seat}</span>
                            ))}
                         </div>
                         <p className="text-[11px] text-indigo-800 font-bold leading-relaxed italic">
                            沉寂 {stock.dormant_days} 天后，主力筹码出现异动信号
                         </p>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex-1 mb-8">
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-emerald-500" /> 考古研判 (Expert Insight)
                         </h5>
                         <p className="text-sm text-slate-600 font-bold leading-relaxed italic">
                            "{stock.ambush_logic}"
                         </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                         <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 flex flex-col items-center">
                            <div className="text-[9px] font-black text-rose-400 uppercase mb-1">建议潜伏区</div>
                            <div className="text-sm font-black text-rose-600">{stock.target_entry_price}</div>
                         </div>
                         <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
                            <div className="text-[9px] font-black text-slate-400 uppercase mb-1">探测现价</div>
                            <div className="text-sm font-black text-slate-700">{stock.current_price}</div>
                         </div>
                      </div>

                      <button 
                        onClick={() => handleNavigateToStock(stock.code, stock.name)}
                        className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-lg ${
                           stock.ambush_rating === 'Avoid' ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-emerald-600'
                        }`}
                        disabled={stock.ambush_rating === 'Avoid'}
                      >
                         {stock.ambush_rating === 'Avoid' ? '已过考古周期' : '深度合力基因审计'} <ArrowRight className="w-4 h-4" />
                      </button>
                   </div>
                </div>
             ))}
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-[2.5rem] p-8 flex items-start gap-6 shadow-sm">
             <div className="p-3 bg-white rounded-2xl shadow-sm"><Info className="w-7 h-7 text-emerald-600" /></div>
             <div className="space-y-2">
                <h4 className="text-lg font-black text-emerald-900">关于价格偏差的说明</h4>
                <p className="text-sm text-emerald-800 leading-relaxed font-medium">
                   探测器通过 googleSearch 强制检索最新现价。如果建议潜伏区（如 8.00）与现价（如 12.00）差距巨大，代表 AI 判定目前处于 **“过热期”**，需耐心等待主力进行 **“大级别回撤”** 触碰原始建仓位后再进行潜伏。若标的处于 **Stirring (萌动)** 状态，则建议价将更贴近现价。
                </p>
             </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
           <div className="relative">
              <History className="w-24 h-24 text-emerald-100 mb-8" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
           </div>
           <p className="text-slate-400 font-black text-3xl tracking-tight">扫描远古基因，锁定现价对齐先机</p>
           <p className="text-slate-300 text-base mt-4 max-w-lg mx-auto leading-relaxed">
              AI 正在调取过去 180 天的龙虎数据，并强制同步最新盘面价格。
           </p>
        </div>
      )}
    </div>
  );
};
