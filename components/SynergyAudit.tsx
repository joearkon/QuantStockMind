
import React, { useState, useRef, useEffect } from 'react';
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { stockSynergyWithLLM } from '../services/llmAdapter'; // 修改导入
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
    
    if (currentModel === ModelProvider.GEMINI_INTL && !settings.geminiKey) {
      onOpenSettings();
      return;
    }
    if (currentModel === ModelProvider.HUNYUAN_CN && !settings.hunyuanKey) {
      onOpenSettings();
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await stockSynergyWithLLM(currentModel, query, marketImg, holdingsImg, settings);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "合力审计失败");
    } finally {
      setLoading(false);
    }
  };

  const data = result?.stockSynergyData || (result?.isStructured ? result?.structuredData as any : null);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-rose-600';
    if (score >= 50) return 'text-amber-500';
    return 'text-slate-400';
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 md:p-10 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl text-white shadow-xl shadow-indigo-100">
              <ShieldCheck className="w-8 h-8" />
            </div>
            标的主力合力深度审计 (Dragon Synergy Audit)
          </h2>
          <p className="text-slate-500 text-sm mb-10 font-bold">混合模型支持：Gemini 3 与 腾讯混元已实现能力对齐。</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div onClick={() => marketRef.current?.click()} className={`group relative h-48 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${marketImg ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-400 bg-slate-50'}`}>
              <input type="file" ref={marketRef} className="hidden" accept="image/*" onChange={e => handleImg(e, 'market')} />
              {marketImg ? <img src={`data:image/jpeg;base64,${marketImg}`} className="h-full w-full object-contain rounded-3xl p-2" /> : <><Camera className="w-8 h-8 text-slate-300 mb-2 group-hover:text-indigo-400" /><span className="text-xs font-black text-slate-400 group-hover:text-indigo-600">上传 K 线 / 分时图 (必选)</span></>}
            </div>
            <div onClick={() => holdingsRef.current?.click()} className={`group relative h-48 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${holdingsImg ? 'border-amber-500 bg-amber-50/30' : 'border-slate-200 hover:border-amber-400 bg-slate-50'}`}>
              <input type="file" ref={holdingsRef} className="hidden" accept="image/*" onChange={e => handleImg(e, 'holdings')} />
              {holdingsImg ? <img src={`data:image/jpeg;base64,${holdingsImg}`} className="h-full w-full object-contain rounded-3xl p-2" /> : <><Wallet className="w-8 h-8 text-slate-300 mb-2 group-hover:text-amber-400" /><span className="text-xs font-black text-slate-400 group-hover:text-amber-600">上传持仓详情 (可选)</span></>}
            </div>
          </div>

          <div className="max-w-2xl flex gap-3 p-2 bg-slate-100 rounded-[2rem] border border-slate-200">
            <div className="relative flex-1"><input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="输入标的代码或简称..." className="w-full h-14 pl-12 pr-4 bg-white rounded-[1.5rem] border border-slate-200 focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-lg transition-all"/><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" /></div>
            <button onClick={handleAnalyze} disabled={loading || !query} className="px-10 h-14 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}{loading ? `审计中 (${elapsed}s)...` : '开始合力审计'}</button>
          </div>
        </div>
      </div>

      {data && (
        <div className="space-y-8 animate-slide-up">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col lg:flex-row justify-between items-center gap-10">
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-3"><span className="px-4 py-1.5 rounded-xl text-xs font-black bg-indigo-600">博弈定性报告</span><span className="text-sm font-bold text-slate-400">{data.market_position}</span></div>
              <h3 className="text-4xl font-black">{data.name || query} <span className="text-2xl font-mono text-slate-400">{data.code}</span></h3>
              <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10"><p className="text-xl font-bold italic leading-relaxed text-indigo-300">"{data.battle_verdict}"</p></div>
            </div>
            <div className="flex gap-4 shrink-0">
               <div className="text-center bg-white/10 p-6 rounded-[2.5rem] border border-white/10 w-40"><div className={`text-5xl font-black mb-1 tracking-tighter ${getScoreColor(data.synergy_score)}`}>{data.synergy_score}</div><div className="text-[10px] font-black text-slate-400">主力合力分</div></div>
               <div className="text-center bg-white/10 p-6 rounded-[2.5rem] border border-white/10 w-40"><div className={`text-5xl font-black mb-1 tracking-tighter ${data.dragon_potential_score > 70 ? 'text-rose-500' : 'text-slate-300'}`}>{data.dragon_potential_score}</div><div className="text-[10px] font-black text-slate-400">成妖指数</div></div>
            </div>
          </div>
          {/* ...其余结果展示保持 ... */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                 <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Crosshair className="w-4 h-4 text-indigo-500" /> 主力成本与安全垫</h4>
                 <div className="space-y-6">
                    <div className="flex justify-between items-end border-b pb-4"><span className="text-xs font-bold text-slate-500">锚定现价</span><span className="text-2xl font-black text-slate-800">¥ {data.used_current_price}</span></div>
                    <div className="flex justify-between items-end border-b pb-4"><span className="text-xs font-bold text-slate-500">预估成本</span><span className="text-xl font-black text-indigo-600">¥ {data.main_force_cost_anchor?.estimated_cost}</span></div>
                    <div className="p-5 bg-slate-50 rounded-2xl">
                       <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-black text-slate-400">安全垫</span><span className="text-sm font-black text-emerald-500">{data.main_force_cost_anchor?.safety_margin_percent}%</span></div>
                       <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{width: `${data.main_force_cost_anchor?.safety_margin_percent + 20}%`}}></div></div>
                    </div>
                 </div>
              </div>
            </div>
            <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-200 p-8">
               <h4 className="text-[11px] font-black text-slate-400 uppercase mb-6">T+1 势能预判</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div><div className="text-[10px] font-black text-slate-400 mb-2">开盘方向</div><div className="text-2xl font-black text-rose-600">{data.t_plus_1_prediction?.expected_direction}</div></div>
                  <div className="bg-slate-50 p-6 rounded-3xl"><p className="text-lg font-black italic">"{data.t_plus_1_prediction?.opening_strategy}"</p></div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
