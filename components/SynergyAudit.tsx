
import React, { useState, useRef, useEffect } from 'react';
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { fetchStockSynergy } from '../services/geminiService';
import { ShieldCheck, Loader2, Search, Camera, Activity, Zap, Target, Info, Flame, TrendingUp, Compass, ShieldAlert, Rocket, Lock, Share2, Skull, CheckCircle, Crosshair, Wallet, UserCheck, AlertTriangle, ArrowRight, Gauge } from 'lucide-react';

export const SynergyAudit: React.FC<{
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: any;
  onOpenSettings: () => void;
}> = ({ currentModel, currentMarket, settings, onOpenSettings }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Images state
  const [marketImg, setMarketImg] = useState<string | null>(null);
  const [holdingsImg, setHoldingsImg] = useState<string | null>(null);
  
  const marketRef = useRef<HTMLInputElement>(null);
  const holdingsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => setElapsed(p => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>, type: 'market' | 'holdings') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        if (type === 'market') setMarketImg(base64);
        else setHoldingsImg(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    if (!settings.geminiKey) {
      onOpenSettings();
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchStockSynergy(query, marketImg, holdingsImg, settings.geminiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "合力审计失败");
    } finally {
      setLoading(false);
    }
  };

  const data = result?.stockSynergyData;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-rose-600';
    if (score >= 50) return 'text-amber-500';
    return 'text-slate-400';
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Control Panel */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 md:p-10 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl text-white shadow-xl shadow-indigo-100">
              <ShieldCheck className="w-8 h-8" />
            </div>
            标的主力合力深度审计 (Dragon Synergy Audit)
          </h2>
          <p className="text-slate-500 text-base max-w-2xl font-medium mb-10">
            针对 **连板标的** 或 **人气龙头**。AI 将视觉扫描 K 线确认形态，并搜索龙虎榜审计顶级游资 (如章盟主) 的筹码集中度，预判次日胜率。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Input 1: Market Image */}
            <div 
              onClick={() => marketRef.current?.click()}
              className={`group relative h-48 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${marketImg ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-400 bg-slate-50'}`}
            >
              <input type="file" ref={marketRef} className="hidden" accept="image/*" onChange={e => handleImg(e, 'market')} />
              {marketImg ? (
                <img src={`data:image/jpeg;base64,${marketImg}`} className="h-full w-full object-contain rounded-3xl p-2" />
              ) : (
                <>
                  <Camera className="w-8 h-8 text-slate-300 mb-2 group-hover:text-indigo-400" />
                  <span className="text-xs font-black text-slate-400 group-hover:text-indigo-600">上传 K 线 / 分时图 (必选)</span>
                </>
              )}
              {marketImg && <div className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm"><CheckCircle className="w-4 h-4 text-emerald-500" /></div>}
            </div>

            {/* Input 2: Holding Image */}
            <div 
              onClick={() => holdingsRef.current?.click()}
              className={`group relative h-48 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${holdingsImg ? 'border-amber-500 bg-amber-50/30' : 'border-slate-200 hover:border-amber-400 bg-slate-50'}`}
            >
              <input type="file" ref={holdingsRef} className="hidden" accept="image/*" onChange={e => handleImg(e, 'holdings')} />
              {holdingsImg ? (
                <img src={`data:image/jpeg;base64,${holdingsImg}`} className="h-full w-full object-contain rounded-3xl p-2" />
              ) : (
                <>
                  <Wallet className="w-8 h-8 text-slate-300 mb-2 group-hover:text-amber-400" />
                  <span className="text-xs font-black text-slate-400 group-hover:text-amber-600">上传持仓详情 (可选 · 自动适配成本)</span>
                </>
              )}
            </div>
          </div>

          <div className="max-w-2xl flex gap-3 p-2 bg-slate-100 rounded-[2rem] border border-slate-200">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="输入标的代码或简称 (如: 东方财富)..."
                className="w-full h-14 pl-12 pr-4 bg-white rounded-[1.5rem] border border-slate-200 focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-lg transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
            </div>
            <button 
              onClick={handleAnalyze}
              disabled={loading || !query}
              className="px-10 h-14 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {loading ? `主力筹码审计中 (${elapsed}s)...` : '开始合力审计'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 flex items-center gap-4 animate-fade-in shadow-sm">
          <AlertTriangle className="w-6 h-6" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {data && (
        <div className="space-y-8 animate-slide-up">
          {/* Header Summary */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col lg:flex-row justify-between items-center gap-10">
            <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none"></div>
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-3">
                <span className="px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-indigo-600">博弈定性报告</span>
                <span className="text-sm font-bold text-slate-400">{data.market_position}</span>
              </div>
              <h3 className="text-4xl font-black">{data.name} <span className="text-2xl font-mono text-slate-400">{data.code}</span></h3>
              <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10">
                <p className="text-xl font-bold italic leading-relaxed text-indigo-300">"{data.battle_verdict}"</p>
              </div>
            </div>
            
            <div className="flex gap-4 shrink-0">
               <div className="text-center bg-white/10 p-6 rounded-[2.5rem] border border-white/10 w-40">
                  <div className={`text-5xl font-black mb-1 tracking-tighter ${getScoreColor(data.synergy_score || 0)}`}>{data.synergy_score}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">主力合力分</div>
               </div>
               <div className="text-center bg-white/10 p-6 rounded-[2.5rem] border border-white/10 w-40">
                  <div className={`text-5xl font-black mb-1 tracking-tighter ${(data.dragon_potential_score || 0) > 70 ? 'text-rose-500' : 'text-slate-300'}`}>{data.dragon_potential_score}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">成妖指数</div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Cost & Capital */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-indigo-500" /> 主力成本与安全垫
                </h4>
                <div className="space-y-6">
                   <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-slate-500">审计锚定现价</span>
                      <span className="text-2xl font-black text-slate-800 tracking-tight">¥ {data.used_current_price}</span>
                   </div>
                   <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-slate-500">预估主力成本</span>
                      <span className="text-xl font-black text-indigo-600 tracking-tight">¥ {data.main_force_cost_anchor?.estimated_cost}</span>
                   </div>
                   <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase">实时安全垫</span>
                        <span className={`text-sm font-black ${(data.main_force_cost_anchor?.safety_margin_percent || 0) > 10 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {(data.main_force_cost_anchor?.safety_margin_percent || 0) > 0 ? '+' : ''}{data.main_force_cost_anchor?.safety_margin_percent}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all" style={{width: `${Math.min(Math.max((data.main_force_cost_anchor?.safety_margin_percent || 0) + 20, 0), 100)}%`}}></div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 mt-2">等级评定：<span className="text-slate-800">{data.main_force_cost_anchor?.risk_level}</span></p>
                   </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-xl p-8 text-white">
                <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /> 主力角色画像
                </h4>
                <div className="space-y-5">
                   <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                      <div className="text-[10px] text-slate-400 font-bold mb-1">主导资金类型</div>
                      <div className="text-lg font-black text-indigo-300">{data.main_force_portrait?.lead_type}</div>
                   </div>
                   <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                      <div className="text-[10px] text-slate-400 font-bold mb-1">持仓状态研判</div>
                      <div className="text-lg font-black text-emerald-400">{data.main_force_portrait?.hold_status}</div>
                   </div>
                   <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                      <p className="text-xs font-bold text-indigo-200 leading-relaxed italic">
                        "{data.capital_consistency}"
                      </p>
                   </div>
                </div>
              </div>
            </div>

            {/* Right Column: Prediction & Strategy */}
            <div className="lg:col-span-8 space-y-8">
              {/* T+1 Prediction Card */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                 <div className="bg-indigo-50 px-8 py-5 border-b border-indigo-100 flex justify-between items-center">
                    <span className="font-black text-indigo-700 flex items-center gap-3 text-lg">
                      <TrendingUp className="w-5 h-5" /> T+1 势能预判 (Visual Analysis Result)
                    </span>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase">预测胜率</span>
                       <span className="text-xl font-black text-indigo-600">{data.t_plus_1_prediction?.confidence}%</span>
                    </div>
                 </div>
                 <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase mb-2">预期开盘动作</div>
                          <div className={`text-2xl font-black ${data.t_plus_1_prediction?.expected_direction?.includes('高') ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {data.t_plus_1_prediction?.expected_direction}
                          </div>
                       </div>
                       <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase mb-2">核心博弈逻辑</div>
                          <p className="text-sm text-slate-600 font-bold leading-relaxed">{data.t_plus_1_prediction?.logic}</p>
                       </div>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-inner flex flex-col justify-center">
                       <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">操盘手实战策略</div>
                       <p className="text-lg font-black text-slate-800 leading-relaxed italic">"{data.t_plus_1_prediction?.opening_strategy}"</p>
                       <div className="mt-4 pt-4 border-t border-slate-200">
                          <span className="text-[10px] font-black text-slate-400">预期波动区间：</span>
                          <span className="text-xs font-mono font-bold text-slate-700">{data.t_plus_1_prediction?.price_range}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Action Guide & Synergy Factors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-rose-50 rounded-[2.5rem] border border-rose-100 p-8 shadow-sm">
                    <h4 className="text-[11px] font-black text-rose-700 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                       <Target className="w-5 h-5" /> 实战操盘指引 (Action Guide)
                    </h4>
                    <p className="text-lg font-black text-rose-900 leading-relaxed bg-white/60 p-6 rounded-3xl border border-rose-100 shadow-inner">
                       {data.action_guide}
                    </p>
                    <div className="mt-6 flex items-center gap-3 px-5 py-3 bg-rose-600 rounded-2xl text-white">
                       <ShieldAlert className="w-5 h-5 animate-pulse" />
                       <span className="text-xs font-black tracking-widest uppercase">追涨安全指数：{data.chase_safety_index}/100</span>
                    </div>
                 </div>

                 <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                       <Activity className="w-5 h-5 text-indigo-500" /> 多维合力因子审计
                    </h4>
                    <div className="space-y-4">
                       {data.synergy_factors?.map((f: any, i: number) => (
                          <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-black text-slate-700">{f.label}</span>
                                <span className="text-xs font-black text-indigo-600">{f.score}/100</span>
                             </div>
                             <p className="text-[10px] text-slate-500 font-medium">{f.description}</p>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-900 border border-indigo-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
             <div className="flex items-start gap-4 relative z-10">
                <Info className="w-6 h-6 text-indigo-400 shrink-0 mt-1" />
                <div className="text-sm font-medium leading-relaxed opacity-80">
                  <b>审计声明</b>：合力审计结果优先基于视觉截图提供的最新行情（解决联网数据 15-30 分钟延迟）。合力分高于 85 且主力成本安全垫大于 10% 的标的，具备极强的“跨分歧”连板能力。
                </div>
             </div>
             <div className="absolute left-0 bottom-0 opacity-10 pointer-events-none">
                <Gauge className="w-48 h-48 -ml-12 -mb-12" />
             </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200">
           <Crosshair className="w-20 h-20 text-indigo-100 mb-8" />
           <p className="text-slate-400 font-black text-2xl tracking-tight">准备好审计标的主力合力了吗？</p>
           <p className="text-slate-300 text-sm mt-4 max-w-lg mx-auto leading-relaxed">
              请上传 K 线截图以激活视觉识别。AI 将锁定实时价位，审计主力席位（如：章盟主、呼家楼）的筹码博弈一致性，助您预判“连板能否持续”。
           </p>
        </div>
      )}
    </div>
  );
};
