
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, MarketType, AnalysisResult, HotMoneyAmbushStock } from '../types';
import { fetchHotMoneyAmbush } from '../services/geminiService';
import { Binoculars, Loader2, Search, ArrowRight, Zap, Flame, ShieldCheck, Activity, UserCheck, ShieldAlert, Target, Info, Sparkles, TrendingUp, Compass, LayoutGrid, AlertTriangle, Eye, Landmark, Clock, ChevronRight, Tags, BarChart, ArrowDownToLine, MoveUp, History, Gem, Star, Anchor, DollarSign, RefreshCw, Thermometer, Snowflake, Waves, Calendar, ArrowRightCircle } from 'lucide-react';

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

  const getHeatIcon = (status: string) => {
    switch (status) {
      case 'Ice': return <Snowflake className="w-4 h-4 text-blue-400" />;
      case 'Boiling': return <Flame className="w-4 h-4 text-rose-500 animate-pulse" />;
      default: return <Waves className="w-4 h-4 text-amber-500" />;
    }
  };

  const getHeatColor = (status: string) => {
    switch (status) {
      case 'Ice': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Boiling': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Search Header */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-14 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-emerald-50/30 to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-slate-800 flex items-center gap-5 mb-5">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2rem] text-white shadow-2xl shadow-indigo-100">
              <Binoculars className="w-10 h-10" />
            </div>
            龙虎潜伏哨 3.2 · 逻辑对齐版
          </h2>
          <p className="text-slate-500 text-lg max-w-3xl font-medium mb-10 leading-relaxed">
            核心战法：**以前阔过（60-80天大资金）** + **现在冰点（地量十字星）**。 
            <span className="text-rose-600 font-bold ml-2">已优化：锚定波动区间，规避联网价格滞后风险。</span>
          </p>

          <div className="flex flex-col md:flex-row gap-5 items-center">
             <div className="flex flex-wrap gap-3 flex-1">
                <span className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-xs font-black flex items-center gap-2 shadow-sm">
                  <History className="w-4 h-4" /> 历史基因优先
                </span>
                <span className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-black flex items-center gap-2 shadow-sm">
                  <Target className="w-4 h-4" /> 地量十字星变盘
                </span>
                <span className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs font-black flex items-center gap-2 shadow-sm">
                  <Sparkles className="w-4 h-4" /> 1月催化对齐
                </span>
             </div>
             <button 
                onClick={handleScan}
                disabled={loading}
                className="px-14 h-16 bg-slate-900 text-white rounded-[1.8rem] font-black shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-4 active:scale-95 disabled:opacity-50 text-lg"
              >
                {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Search className="w-7 h-7" />}
                {loading ? `全网逻辑回溯中 (${elapsed}s)` : '开启错位潜伏审计'}
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
          {/* Market Insight Banner */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border-b-[12px] border-indigo-600">
             <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none"></div>
             <div className="relative z-10 flex flex-col lg:flex-row gap-10">
                <div className="flex-1">
                   <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                      <History className="w-4 h-4 animate-pulse" /> 名门基因与逻辑对齐研判
                   </div>
                   <p className="text-2xl font-black italic leading-relaxed text-slate-200 mb-6">"{data.market_summary}"</p>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                         <div className="text-xs font-black text-rose-400 uppercase mb-2 flex items-center gap-2">规避高位题材 (Hot Zones)：</div>
                         <div className="flex flex-wrap gap-2">
                            {data.rotation_avoid_list?.map((s, i) => (
                               <span key={i} className="text-xs font-bold text-slate-300 bg-white/10 px-2.5 py-1 rounded-lg"># {s}</span>
                            ))}
                         </div>
                      </div>
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                         <div className="text-xs font-black text-emerald-400 uppercase mb-2 flex items-center gap-2">1月核心催化 (Catalysts)：</div>
                         <div className="flex flex-wrap gap-2">
                            {data.jan_catalyst_focus?.map((s, i) => (
                               <span key={i} className="text-xs font-bold text-slate-300 bg-white/10 px-2.5 py-1 rounded-lg">✨ {s}</span>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
                <div className="w-full lg:w-80 shrink-0">
                   <div className="bg-indigo-600/20 backdrop-blur-md p-8 rounded-[2rem] border border-indigo-500/30 text-center flex flex-col items-center justify-center h-full">
                      <div className="text-[10px] text-indigo-300 font-bold uppercase mb-3 tracking-widest">考古定性结论</div>
                      <p className="text-sm font-bold text-indigo-100 leading-relaxed italic">"{data.rotation_insight}"</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 shadow-sm no-print">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs font-bold text-amber-800">
              [风险提示] 联网数据存在 15-30 分钟或更久的滞后。价格区间仅供逻辑锚定参考，请务必以实盘价格为准。
            </p>
          </div>

          {/* Candidates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {data.candidates.map((stock, idx) => (
                <div key={idx} className={`bg-white rounded-[2.8rem] border shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all ${
                   stock.ambush_rating === 'Avoid' ? 'border-slate-100 opacity-60 grayscale' : 'border-slate-200 hover:border-indigo-400'
                }`}>
                   {/* Card Header with Historical Badge */}
                   <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex flex-col">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 border mb-1 ${getHeatColor(stock.sector_heat_status)}`}>
                           {getHeatIcon(stock.sector_heat_status)} {stock.sector_name}
                        </div>
                        <div className="text-[9px] font-black text-indigo-500 flex items-center gap-1">
                           <History className="w-3 h-3" /> 历史名门
                        </div>
                      </div>
                      <div className="text-right">
                         <div className="text-[10px] font-black text-slate-400 flex items-center gap-1 justify-end">
                            <Sparkles className="w-3 h-3 text-amber-500" /> 1月催化强度: {stock.catalyst_jan_strength}%
                         </div>
                         <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 rounded inline-block mt-1">基因分: {stock.dragon_blood_score}</div>
                      </div>
                   </div>

                   <div className="p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                         <div className="flex-1">
                            <div className="flex items-center gap-2">
                               <h4 className="text-2xl font-black text-slate-800">{stock.name}</h4>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="text-xs font-mono text-slate-400">{stock.code}</span>
                               <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-md">锚定: {stock.anchor_price_range}</span>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="text-lg font-black text-emerald-600">-{stock.pit_depth_percent}%</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase">相对深坑</div>
                         </div>
                      </div>

                      {/* Pattern Alert - Like "Tianji Cross Star" */}
                      <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 mb-4 group-hover:bg-amber-100 transition-colors">
                         <div className="flex items-center gap-2 text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1.5">
                            <Activity className="w-3.5 h-3.5" /> 实时形态特征 (Pattern)
                         </div>
                         <p className="text-xs text-amber-900 font-bold leading-relaxed flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> {stock.k_pattern_sign}
                         </p>
                      </div>

                      <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 mb-6 group-hover:bg-indigo-100 transition-colors">
                         <div className="flex items-center gap-2 text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1.5">
                            <UserCheck className="w-3.5 h-3.5" /> 60-80D 考古历史资金
                         </div>
                         <p className="text-xs text-indigo-900 font-bold leading-relaxed">
                            {stock.historical_main_force}
                         </p>
                         <div className="mt-2 text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">已深度洗盘沉寂 {stock.dormant_days} 天</div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex-1 mb-8">
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-blue-500" /> 潜伏研判 (Ambush Logic)
                         </h5>
                         <p className="text-sm text-slate-600 font-bold leading-relaxed italic">
                            "{stock.ambush_logic}"
                         </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                         <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center text-center">
                            <div className="text-[9px] font-black text-blue-400 uppercase mb-1">建议潜伏区间</div>
                            <div className="text-xs font-black text-blue-700">{stock.target_entry_range}</div>
                         </div>
                         <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                            <div className="text-[9px] font-black text-slate-400 uppercase mb-1">止损防御锚点</div>
                            <div className="text-xs font-black text-slate-700">{stock.stop_loss_anchor}</div>
                         </div>
                      </div>

                      <button 
                        onClick={() => handleNavigateToStock(stock.code, stock.name)}
                        className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-lg ${
                           stock.ambush_rating === 'Avoid' ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-indigo-100'
                        }`}
                        disabled={stock.ambush_rating === 'Avoid'}
                      >
                         {stock.ambush_rating === 'Avoid' ? '标的过热 · 暂避' : '全量合力基因审计'} <ArrowRight className="w-4 h-4" />
                      </button>
                   </div>
                </div>
             ))}
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-[2.5rem] p-8 flex items-start gap-6 shadow-sm">
             <div className="p-3 bg-white rounded-2xl shadow-sm"><Info className="w-7 h-7 text-indigo-600" /></div>
             <div className="space-y-2">
                <h4 className="text-lg font-black text-indigo-900">“名门考古”实战准则</h4>
                <p className="text-sm text-blue-800 leading-relaxed font-medium">
                   真正的高胜率在于“错位”。当三花智控、工业富联等标的经历 60-80 天缩量深度洗盘，且形态重现 **地量十字星** 时，配合 1 月份算力、机器人等强催化，其爆发确定性远高于追涨。工具已改为展示 **波动区间**，请以实盘盘口确认最后买点。
                </p>
             </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
           <div className="relative">
              <History className="w-24 h-24 text-indigo-100 mb-8" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
           </div>
           <p className="text-slate-400 font-black text-3xl tracking-tight">扫描冰点名门，锁定 1月 爆发</p>
           <p className="text-slate-300 text-base mt-4 max-w-lg mx-auto leading-relaxed">
              AI 正在回溯 A 股龙虎考古数据，剔除价格噪音，锁定高胜率潜伏坑位。
           </p>
        </div>
      )}
    </div>
  );
};
