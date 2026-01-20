
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
              <h2 className="text-4xl font-black text-slate-800 flex items-center gap-5 mb-5">
                <div className="p-4 bg-gradient-to-br from-rose-600 to-amber-600 rounded-[2rem] text-white shadow-2xl shadow-rose-100">
                  <Rocket className="w-10 h-10" />
                </div>
                小资金翻身战法 3.4 · 弹性审计
              </h2>
              <p className="text-slate-500 text-lg max-w-3xl font-medium leading-relaxed">
                <span className="text-rose-600 font-black">目标：8万资金极致复利。</span> 
                屏蔽钝重的“巨无霸”，锁定 **50-200亿市值**、具备 **补涨逻辑对齐** 的弹性标的。
              </p>
            </div>
            
            <button 
                onClick={handleScan}
                disabled={loading}
                className="px-14 h-16 bg-slate-900 text-white rounded-[1.8rem] font-black shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-4 active:scale-95 disabled:opacity-50 text-lg"
              >
                {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Search className="w-7 h-7" />}
                {loading ? `全网弹性回溯中 (${elapsed}s)` : '开启小资金复利审计'}
              </button>
          </div>

          <div className="flex flex-wrap gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-black shadow-sm">
                <Coins className="w-4 h-4" /> 市值量级强过滤
             </div>
             <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs font-black shadow-sm">
                <Shuffle className="w-4 h-4" /> 龙头补涨对齐
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
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border-b-[12px] border-rose-600">
             <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-l from-rose-500/20 to-transparent pointer-events-none"></div>
             <div className="relative z-10 flex flex-col lg:flex-row gap-10">
                <div className="flex-1">
                   <div className="text-[10px] font-black text-rose-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 animate-pulse" /> 8万资金 · 当日翻身策略总纲
                   </div>
                   <p className="text-2xl font-black italic leading-relaxed text-slate-200 mb-8">"{data.turnaround_strategy_summary}"</p>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                         <div className="text-xs font-black text-amber-400 uppercase mb-2 flex items-center gap-2">本期高弹性赛道 (Elastic Sectors)：</div>
                         <div className="flex flex-wrap gap-2">
                            {data.high_elastic_sectors?.map((s, i) => (
                               <span key={i} className="text-xs font-bold text-slate-300 bg-white/10 px-2.5 py-1 rounded-lg">⚡ {s}</span>
                            ))}
                         </div>
                      </div>
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                         <div className="text-xs font-black text-emerald-400 uppercase mb-2 flex items-center gap-2">游资考古洞察：</div>
                         <p className="text-[11px] text-slate-400 font-bold leading-relaxed">{data.rotation_insight}</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-black text-amber-800">[翻身指令] 本榜单已自动剔除浪潮、三花、中际等大市值重担标的。8万资金应聚焦底部、有龙头对标、市值小于 200 亿的“活跃品种”。</p>
            </div>
          </div>

          {/* Candidates Grid - Enhanced with Elasticity focus */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {data.candidates?.map((stock, idx) => (
                <div key={idx} className={`bg-white rounded-[2.8rem] border shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all border-slate-200 hover:border-rose-400`}>
                   {/* Card Header */}
                   <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex flex-col">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 border mb-1 bg-white border-slate-200 text-slate-500`}>
                           {stock.sector_name}
                        </div>
                        <div className="text-[9px] font-black text-amber-600 flex items-center gap-1 uppercase tracking-tighter">
                           <History className="w-3 h-3" /> 历史龙基因
                        </div>
                      </div>
                      <div className="text-right">
                         <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getPositionColor(stock.position_grade)}`}>
                            {stock.position_grade}
                         </div>
                         <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">位置置信: {stock.logic_confidence}%</div>
                      </div>
                   </div>

                   <div className="p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                         <div className="flex-1">
                            <h4 className="text-2xl font-black text-slate-800 group-hover:text-rose-600 transition-colors">{stock.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="text-xs font-mono text-slate-400">{stock.code}</span>
                               <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-black rounded border border-rose-100">{stock.market_cap_label}</span>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className={`text-2xl font-black tracking-tighter ${getElasticityColor(stock.elasticity_score).split(' ')[0]}`}>
                               {stock.elasticity_score}
                            </div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">翻身系数</div>
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
                         <p className="text-[10px] text-rose-500 mt-1 font-medium">该龙头已启动，此票作为“底部替身”具备极高套利空间。</p>
                      </div>

                      <div className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100 mb-6 group-hover:bg-indigo-50 transition-colors">
                         <div className="flex items-center gap-2 text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1.5">
                            <Activity className="w-3.5 h-3.5" /> 筹码状态特征
                         </div>
                         <p className="text-xs text-indigo-900 font-bold leading-relaxed italic">
                            "{stock.k_pattern_sign}"
                         </p>
                         <div className="mt-2 text-[9px] font-bold text-indigo-400 uppercase">已深度坑位沉寂 {stock.dormant_days} 天</div>
                      </div>

                      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex-1 mb-8 shadow-inner">
                         <h5 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" /> 翻身进攻逻辑 (Revival)
                         </h5>
                         <p className="text-sm text-slate-300 font-bold leading-relaxed italic">
                            "{stock.turnaround_logic}"
                         </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 mb-6">
                         <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                            <div className="text-[10px] font-black text-emerald-700 uppercase">相对坑位深度</div>
                            <div className="text-sm font-black text-emerald-600">-{stock.pit_depth_percent}%</div>
                         </div>
                      </div>

                      <button 
                        onClick={() => handleNavigateToStock(stock.code, stock.name)}
                        className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-lg bg-slate-900 text-white hover:bg-rose-600 shadow-rose-100`}
                      >
                         全量合力基因审计 <ArrowRight className="w-4 h-4" />
                      </button>
                   </div>
                </div>
             ))}
          </div>

          {/* Turnaround Principles */}
          <div className="bg-gradient-to-r from-rose-50 to-indigo-50 border border-rose-100 rounded-[2.5rem] p-8 flex items-start gap-6 shadow-sm">
             <div className="p-3 bg-white rounded-2xl shadow-sm"><Info className="w-7 h-7 text-rose-600" /></div>
             <div className="space-y-2">
                <h4 className="text-lg font-black text-slate-900">“翻身战法”三条铁律</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                   1. **活性第一**：小资金绝不买万亿市值股，哪怕它涨得再稳。我们要的是“平时不鸣，一鸣惊人”的小马。<br/>
                   2. **逻辑对齐**：永远盯着板块最强的那只（龙头），在它分歧或高位滞涨时，第一时间切入底部同逻辑的小盘股（补涨）。<br/>
                   3. **坑位择时**：地量十字星回踩年线是绝佳埋伏点。8万资金只需成功捕捉 3 次这样的 30%+ 机会，即可实现翻倍翻身。
                </p>
             </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
           <div className="relative">
              <Rocket className="w-24 h-24 text-rose-100 mb-8" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 rounded-full animate-ping opacity-20"></div>
           </div>
           <p className="text-slate-400 font-black text-3xl tracking-tight">扫描复利机会，开启小资金翻身</p>
           <p className="text-slate-300 text-base mt-4 max-w-lg mx-auto leading-relaxed">
              AI 正在回溯小市值活跃股池，寻找那些被市场错杀、正处于“补涨临界点”的影子标的。
           </p>
        </div>
      )}
    </div>
  );
};
