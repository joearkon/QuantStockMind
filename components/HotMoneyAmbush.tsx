
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, MarketType, AnalysisResult, HotMoneyAmbushStock } from '../types';
import { fetchHotMoneyAmbush } from '../services/geminiService';
import { Binoculars, Loader2, Search, ArrowRight, Zap, Flame, ShieldCheck, Activity, UserCheck, ShieldAlert, Target, Info, Sparkles, TrendingUp, Compass, LayoutGrid, AlertTriangle, Eye, Landmark } from 'lucide-react';

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

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Search Header */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 md:p-12 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-50 to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-1">
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 mb-4">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100">
                <Binoculars className="w-8 h-8" />
              </div>
              龙虎潜伏哨 (LH Ambush Scout)
            </h2>
            <p className="text-slate-500 text-base max-w-2xl font-medium mb-6">
              AI 深度回溯近 10 个交易日的龙虎榜，识别顶级游资与机构正在“默默建仓”的标的。专抓那些正在走强、却还未全面爆发或处于二波启动点的“准华胜天成”。
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Flame className="w-3 h-3" /> 陈小群席位追踪
              </span>
              <span className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Landmark className="w-3 h-3" /> 机构持续买入
              </span>
              <span className="px-3 py-1 bg-amber-50 border border-amber-100 rounded-lg text-amber-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Compass className="w-3 h-3" /> 回踩支撑潜伏
              </span>
            </div>
          </div>
          <button 
            onClick={handleScan}
            disabled={loading}
            className="px-12 h-16 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
            {loading ? `全网审计数据中 (${elapsed}s)` : '立即开启全网潜伏审计'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 flex items-center gap-4 shadow-sm animate-fade-in">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {data && (
        <div className="space-y-8 animate-slide-up">
          {/* Summary Banner */}
          <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
             <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none"></div>
             <div className="flex-1 relative z-10">
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                   <Activity className="w-4 h-4" /> 龙虎合力审计报告 (${data.scan_time})
                </div>
                <p className="text-xl font-black italic leading-relaxed text-slate-200">"{data.market_summary}"</p>
             </div>
             {data.seat_focus && (
                <div className="flex gap-4 relative z-10">
                   {data.seat_focus.map((seat, i) => (
                      <div key={i} className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 flex flex-col items-center">
                         <span className="text-[9px] text-indigo-300 font-bold uppercase">{seat.seat_name}</span>
                         <span className={`text-xs font-black ${seat.bias_direction === 'Buy' ? 'text-rose-400' : 'text-slate-400'}`}>{seat.bias_direction}</span>
                      </div>
                   ))}
                </div>
             )}
          </div>

          {/* Candidates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {data.candidates.map((stock, idx) => (
                <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all hover:border-indigo-400">
                   <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                         <div className={`w-3 h-3 rounded-full ${stock.ambush_rating === 'Strong' ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`}></div>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">潜力指数: {stock.ambush_rating}</span>
                      </div>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">上榜 {stock.recent_lh_count} 次</span>
                   </div>
                   <div className="p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                         <div>
                            <h4 className="text-2xl font-black text-slate-800">{stock.name}</h4>
                            <span className="text-xs font-mono text-slate-400 mt-1 block">{stock.code}</span>
                         </div>
                         <div className="text-right">
                            <div className="text-sm font-black text-rose-600">入场位: {stock.target_entry_price}</div>
                            <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">止损位: {stock.stop_loss_price}</div>
                         </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-6">
                         {stock.top_seats.map((seat, si) => (
                            <span key={si} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg border border-indigo-100 flex items-center gap-1">
                               <UserCheck className="w-3 h-3" /> {seat}
                            </span>
                         ))}
                         {stock.institutional_participation && (
                            <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg border border-amber-100 flex items-center gap-1">
                               <Landmark className="w-3 h-3" /> 机构抢筹
                            </span>
                         )}
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex-1 mb-6">
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-indigo-500" /> 潜伏逻辑 (Insight)
                         </h5>
                         <p className="text-sm text-slate-600 font-bold leading-relaxed italic">
                            "{stock.ambush_logic}"
                         </p>
                      </div>

                      <button 
                        onClick={() => handleNavigateToStock(stock.code, stock.name)}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-lg"
                      >
                         深度诊断合力 <ArrowRight className="w-4 h-4" />
                      </button>
                   </div>
                </div>
             ))}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex items-start gap-4">
             <Info className="w-6 h-6 text-amber-600 shrink-0" />
             <div className="text-sm text-amber-900 leading-relaxed font-medium">
                <b>潜伏核心提示</b>：本功能侧重于寻找“席位溢价”与“回调承接”的共鸣点。如果顶级席位如“陈小群”在标的收阴线时依然大幅买入，通常代表主力在进行强势洗盘，此时结合 AI 测算的“入场位”进行分批潜伏，胜率最高。
             </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200">
           <div className="relative">
              <Binoculars className="w-20 h-20 text-indigo-100 mb-8" />
              <div className="absolute top-0 right-0 w-6 h-6 bg-rose-500 rounded-full animate-ping opacity-20"></div>
           </div>
           <p className="text-slate-400 font-black text-2xl tracking-tight">开启雷达，扫描游资与机构的“潜伏印记”</p>
           <p className="text-slate-300 text-sm mt-4 max-w-lg mx-auto leading-relaxed">
              AI 将自动化审计龙虎榜成交记录，为您捕捉那些顶级席位正在密集介入、但股价尚未完全透支空间的潜力股。
           </p>
        </div>
      )}
    </div>
  );
};
