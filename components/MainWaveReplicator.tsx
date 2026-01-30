
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { replicateMainWaveTactic } from '../services/geminiService';
import { Rocket, Loader2, Search, Zap, Flame, ShieldCheck, Activity, Target, Info, Sparkles, TrendingUp, ArrowRight, Gauge, Clock, Building2, MousePointer2, Scissors, Repeat, ChevronRight } from 'lucide-react';

export const MainWaveReplicator: React.FC<{
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

  const handleReplicate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await replicateMainWaveTactic("");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "战术复刻扫描失败");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToStock = (code: string, name: string) => {
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  const waveData = result?.mainWaveData;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Tactical Hero Section */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-black rounded-[2.5rem] shadow-2xl border border-indigo-500/30 p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
           <TrendingUp className="w-[800px] h-[800px] -mr-40 -mt-40 text-indigo-400" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
          <div className="flex-1">
             <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 bg-amber-500 text-black text-[10px] font-black rounded uppercase tracking-[0.2em] shadow-lg">实战成功案例复刻</span>
                <span className="text-slate-400 text-xs font-bold">参考标的：金海通 (1月下旬)</span>
             </div>
             <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
               主升浪“金海通模式”<br/>战术复刻雷达
             </h2>
             <p className="text-slate-300 text-lg max-w-2xl font-medium leading-relaxed">
               由 AI 深度扫描具备**“机构深度调研 + 主升中继启动 + 尾盘2:30异动”**特征的标的。助你复制“金海通”从180到240后再接再厉的主升行情。
             </p>
             <div className="mt-8 flex flex-wrap gap-4 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                <span className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20"><Building2 className="w-4 h-4" /> 机构背书筛选</span>
                <span className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20"><Clock className="w-4 h-4" /> 14:30 狙击位测算</span>
                <span className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20"><Scissors className="w-4 h-4" /> 日内趋势做T网格</span>
             </div>
          </div>

          <div className="shrink-0 flex flex-col items-center">
             <button 
               onClick={handleReplicate}
               disabled={loading}
               className="w-48 h-48 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_50px_rgba(79,70,229,0.4)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex flex-col items-center justify-center gap-3 border-4 border-indigo-400/30 group"
             >
                {loading ? <Loader2 className="w-12 h-12 animate-spin" /> : <Repeat className="w-12 h-12 group-hover:rotate-180 transition-transform duration-700" />}
                <span className="text-xs font-black uppercase tracking-tighter">
                   {loading ? `全网复刻扫描 (${elapsed}s)` : '开启战术复刻'}
                </span>
             </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 flex items-center gap-4 shadow-sm animate-fade-in">
          <Info className="w-6 h-6 shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {waveData && (
        <div className="space-y-8 animate-slide-up">
           {/* Market Context Banner */}
           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                 <div className="p-4 bg-indigo-50 rounded-2xl">
                    <Activity className="w-8 h-8 text-indigo-600" />
                 </div>
                 <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">当前市场复刻环境</div>
                    <p className="text-xl font-black text-slate-800 italic">"{waveData.market_momentum}"</p>
                 </div>
              </div>
              <div className="text-right">
                 <div className="text-sm font-black text-indigo-600 mb-1">扫描标的池: 5000+</div>
                 <div className="text-[10px] font-bold text-slate-400 uppercase">探测时间: {waveData.scan_time}</div>
              </div>
           </div>

           {/* Clone Grid */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {waveData.top_clones.map((target, idx) => (
                 <div key={idx} className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all hover:border-indigo-400 relative">
                    {/* Score Ribbon */}
                    <div className="absolute top-6 right-6 flex flex-col items-center">
                       <div className="text-3xl font-black text-indigo-600 tracking-tighter">{target.replicate_score}%</div>
                       <div className="text-[8px] font-black text-slate-400 uppercase">复刻契合度</div>
                    </div>

                    <div className="p-10 flex-1 flex flex-col">
                       <div className="mb-8">
                          <div className="flex items-center gap-3 mb-2">
                             <h4 className="text-3xl font-black text-slate-800">{target.name}</h4>
                             <span className="text-sm font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">{target.code}</span>
                          </div>
                          <div className="flex gap-2">
                             <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                target.trend_stage === 'Start' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                target.trend_stage === 'Middle' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                'bg-rose-50 text-rose-600 border border-rose-100'
                             }`}>
                                浪形位置: {target.trend_stage === 'Start' ? '主升初期' : target.trend_stage === 'Middle' ? '主升中继' : '高潮分歧'}
                             </span>
                             <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-rose-500" /> 已涨: {target.wave_gain_so_far}
                             </span>
                          </div>
                       </div>

                       <div className="space-y-6 flex-1">
                          <div className="flex items-start gap-4">
                             <div className="p-2 bg-indigo-50 rounded-xl mt-1 shrink-0"><Building2 className="w-4 h-4 text-indigo-600" /></div>
                             <div>
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">机构调研/基本面背书 (Signal)</h5>
                                <p className="text-sm text-slate-700 font-bold leading-relaxed">{target.institutional_backing}</p>
                             </div>
                          </div>

                          <div className="flex items-start gap-4">
                             <div className="p-2 bg-rose-50 rounded-xl mt-1 shrink-0"><Clock className="w-4 h-4 text-rose-600" /></div>
                             <div>
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">2:30 尾盘狙击指令 (Entry)</h5>
                                <p className="text-sm text-rose-600 font-black leading-relaxed italic">"{target.two_thirty_verdict}"</p>
                             </div>
                          </div>

                          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                             <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500" /> 战术复刻逻辑 (Why it matches)
                             </h5>
                             <p className="text-xs text-slate-500 font-bold leading-relaxed">
                                {target.copy_logic}
                             </p>
                          </div>
                       </div>

                       {/* T-Trading Grid */}
                       <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-100 pt-8">
                          <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 flex flex-col items-center">
                             <span className="text-[9px] font-black text-rose-500 uppercase mb-1">主升做T：日内压力位</span>
                             <span className="text-xl font-black text-rose-700">{target.t_trading_plan.high_sell}</span>
                          </div>
                          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center">
                             <span className="text-[9px] font-black text-emerald-500 uppercase mb-1">主升做T：日内支撑位</span>
                             <span className="text-xl font-black text-emerald-700">{target.t_trading_plan.low_buy}</span>
                          </div>
                       </div>

                       <button 
                         onClick={() => handleNavigateToStock(target.code, target.name)}
                         className="w-full mt-8 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-xl group"
                       >
                          深度诊断该“金海通二号”标的 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                       </button>
                    </div>
                 </div>
              ))}
           </div>

           <div className="p-10 bg-indigo-900 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                 <Flame className="w-64 h-64 -mr-12 -mb-12" />
              </div>
              <div className="relative z-10">
                 <h3 className="text-xl font-black mb-4 flex items-center gap-3">
                    <Zap className="w-6 h-6 text-amber-400" /> 复刻大师·核心心法总结 (Tactical Summary)
                 </h3>
                 <p className="text-lg font-bold text-indigo-100 leading-relaxed italic">
                    "{waveData.tactical_advice}"
                 </p>
                 <div className="mt-8 flex gap-8">
                    <div className="flex flex-col">
                       <span className="text-[10px] text-indigo-400 font-bold uppercase mb-1">核心卖点</span>
                       <span className="text-sm font-black">趋势破位或量能衰竭</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] text-indigo-400 font-bold uppercase mb-1">持股周期</span>
                       <span className="text-sm font-black">3-15 交易日 (主升中继)</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] text-indigo-400 font-bold uppercase mb-1">做T纪律</span>
                       <span className="text-sm font-black">只在趋势向上时低吸</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200">
           <Rocket className="w-20 h-20 text-indigo-100 mb-8 animate-bounce" />
           <p className="text-slate-400 font-black text-2xl tracking-tight">准备好寻找下一个“金海通”了吗？</p>
           <p className="text-slate-300 text-sm mt-4 max-w-lg mx-auto leading-relaxed">
              AI 将自动化回溯最近一周的市场基因，通过联网检索识别那些被机构深度调研、处于主升中继、且分时图呈现“2:30 暴力拉升”潜质的标的。
           </p>
        </div>
      )}
    </div>
  );
};
