
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { fetchQuantSynergy, discoverQuantSynergy } from '../services/geminiService';
import { Cpu, Loader2, Search, Zap, Flame, ShieldCheck, Activity, UserCheck, ShieldAlert, Target, Info, Sparkles, TrendingUp, ArrowRight, Gauge, Camera, X, Eye, Terminal, Layers, Crosshair, AlertTriangle, Radar, CrosshairIcon, Wallet, Swords, Network, Radio } from 'lucide-react';

export const QuantSynergyTracker: React.FC<{
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: any;
  onOpenSettings: () => void;
}> = ({ currentModel, currentMarket, settings, onOpenSettings }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [mode, setMode] = useState<'discover' | 'audit'>('discover');

  const [marketImg, setMarketImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => setElapsed(p => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setMarketImg(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDiscovery = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await discoverQuantSynergy("");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "量化嗅探失败");
    } finally {
      setLoading(false);
    }
  };

  const handleAudit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchQuantSynergy(query, marketImg, "");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "量化审计失败");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToStock = (code: string, name: string) => {
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  const discData = result?.quantDiscoveryData;
  const auditData = result?.quantSynergyData;

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Follow_Buy': return 'text-rose-500 bg-rose-50 border-rose-200';
      case 'Follow_Sell': return 'text-emerald-500 bg-emerald-50 border-emerald-200';
      case 'Avoid': return 'text-slate-400 bg-slate-50 border-slate-200';
      default: return 'text-amber-500 bg-amber-50 border-amber-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-800 p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none">
           <Radar className="w-[800px] h-[800px] -mr-40 -mt-40 animate-spin-slow" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
             <div>
                <h2 className="text-3xl font-black text-white flex items-center gap-4 mb-2">
                  <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-900/50">
                    <Cpu className="w-8 h-8" />
                  </div>
                  量化兵团合力猎杀雷达
                </h2>
                <p className="text-slate-400 text-base max-w-2xl font-medium">
                  由 AI 主动探测**量化算法密集度**最高的板块。捕捉全行业同步异动信号，识别领涨“点火标的”与“兵团扫货”趋势。
                </p>
             </div>
             <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
                <button 
                  onClick={() => { setMode('discover'); setResult(null); }}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'discover' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  板块兵团嗅探
                </button>
                <button 
                  onClick={() => { setMode('audit'); setResult(null); }}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'audit' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  单股算法审计
                </button>
             </div>
          </div>

          {mode === 'discover' ? (
             <div className="flex flex-col items-center justify-center py-10 text-center space-y-8">
                <div className="relative group">
                   <div className="absolute -inset-10 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all animate-pulse"></div>
                   <button 
                     onClick={handleDiscovery}
                     disabled={loading}
                     className="relative w-48 h-48 bg-slate-800 border-4 border-slate-700 rounded-full flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-2xl disabled:opacity-50"
                   >
                      {loading ? <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" /> : <Swords className="w-12 h-12 text-indigo-400" />}
                      <span className="text-xs font-black text-white uppercase tracking-tighter">
                        {loading ? `板块雷达扫描中 (${elapsed}s)` : '开启板块猛攻雷达'}
                      </span>
                   </button>
                </div>
                <div className="flex flex-wrap justify-center gap-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                   <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> 板块同步脉冲</span>
                   <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> 算法集群扫货</span>
                   <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> 领涨点火识别</span>
                </div>
             </div>
          ) : (
             <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                      <div className="relative">
                        <input 
                          type="text" 
                          value={query}
                          onChange={e => setQuery(e.target.value)}
                          placeholder="输入审计代码 (如: 000001)..."
                          className="w-full h-16 pl-14 pr-4 bg-slate-800 border border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 outline-none font-black text-xl text-white transition-all"
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 w-6 h-6" />
                      </div>
                  </div>
                  <button 
                      onClick={handleAudit}
                      disabled={loading || !query}
                      className="h-16 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                  >
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                      {loading ? `单股审计中 (${elapsed}s)...` : '启动合力审计'}
                  </button>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                   <div className="flex-1 flex gap-3">
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImg} />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex-1 h-12 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all ${marketImg ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-indigo-500'}`}
                      >
                        {marketImg ? <Eye className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                        <span className="text-xs font-black uppercase tracking-widest">{marketImg ? '分时数据已对齐' : '上传分时截图提高胜率'}</span>
                      </button>
                      {marketImg && (
                        <button onClick={() => setMarketImg(null)} className="h-12 w-12 flex items-center justify-center bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500">
                          <X className="w-5 h-5" />
                        </button>
                      )}
                   </div>
                </div>
             </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 flex items-center gap-4 shadow-sm animate-fade-in">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {/* Mode 1 Results: Discovery Radar Upgrade */}
      {discData && mode === 'discover' && (
        <div className="space-y-10 animate-slide-up">
           
           {/* Section 1: Sector Cohesion Battlefield */}
           <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-900 px-10 py-6 flex justify-between items-center">
                 <h3 className="text-white font-black flex items-center gap-3">
                    <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
                    当前算法集结板块 (Battlefield Heat)
                 </h3>
                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">探测时间: {discData.scan_time}</span>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                 {discData.quant_cluster_sectors.map((sector, idx) => (
                    <div key={idx} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:shadow-lg transition-all border-t-8 border-t-rose-500">
                       <div className="flex justify-between items-start mb-4">
                          <span className="text-lg font-black text-slate-800">{sector.name}</span>
                          <div className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">强度: {sector.attack_intensity}%</div>
                       </div>
                       <p className="text-xs text-slate-500 font-bold leading-relaxed mb-4 italic">"{sector.description}"</p>
                       <div className="flex flex-wrap gap-2">
                          {sector.hot_peers.map((p, i) => (
                             <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-400">{p}</span>
                          ))}
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Section 2: High Cohesion Targets */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {discData.top_targets.map((target, idx) => (
                 <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all hover:border-indigo-400">
                    <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                       <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${target.sector_cohesion_level > 80 ? 'bg-rose-500 animate-pulse' : 'bg-indigo-500'}`}></div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">板块协同: {target.sector_cohesion_level}%</span>
                       </div>
                       {target.is_sector_leader && (
                         <span className="px-2 py-0.5 bg-rose-600 text-white text-[8px] font-black rounded uppercase tracking-tighter shadow-sm">算法点火领涨</span>
                       )}
                    </div>
                    <div className="p-8 flex-1 flex flex-col">
                       <div className="flex justify-between items-start mb-6">
                          <div>
                             <h4 className="text-2xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{target.name}</h4>
                             <span className="text-xs font-mono text-slate-400 mt-1 block">{target.code}</span>
                          </div>
                          <div className="text-right">
                             <div className="text-sm font-black text-rose-600">进攻位: {target.entry_point}</div>
                             <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">预期: {target.potential_gain}</div>
                          </div>
                       </div>

                       <div className="flex flex-wrap gap-2 mb-6">
                          <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg shadow-md flex items-center gap-1">
                             <Zap className="w-3 h-3" /> {target.algo_tag}
                          </span>
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg border border-slate-200 flex items-center gap-1">
                             <Network className="w-3 h-3" /> 同步标的: {target.peer_count}只
                          </span>
                       </div>

                       <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex-1 mb-6">
                          <p className="text-sm text-slate-600 font-bold leading-relaxed italic">
                             "{target.battle_logic}"
                          </p>
                       </div>

                       <button 
                         onClick={() => handleNavigateToStock(target.code, target.name)}
                         className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-lg"
                       >
                          深度跟庄研判 <ArrowRight className="w-4 h-4" />
                       </button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* Mode 2: Single Stock Audit (No changes needed) */}
      {auditData && mode === 'audit' && (
        <div className="space-y-8 animate-slide-up">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className={`lg:col-span-2 p-10 rounded-[3rem] border-b-8 shadow-2xl relative overflow-hidden flex flex-col justify-center ${getActionColor(auditData.execution_model.action)}`}>
                <div className="relative z-10">
                   <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.3em] mb-4 opacity-70">
                      <Terminal className="w-4 h-4" /> 算法跟随执行指令 (Execution)
                   </div>
                   <h3 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter">
                      {auditData.execution_model.action === 'Follow_Buy' ? '全速买入跟随' : 
                       auditData.execution_model.action === 'Follow_Sell' ? '建议止盈撤离' : 
                       auditData.execution_model.action === 'Avoid' ? '空仓回避' : '持仓动态监控'}
                   </h3>
                   <div className="bg-black/5 p-6 rounded-[2rem] border border-black/5">
                      <p className="text-lg font-black italic leading-relaxed">"{auditData.execution_model.strategy_logic}"</p>
                   </div>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                   <Cpu className="w-64 h-64 -mr-12 -mb-12" />
                </div>
             </div>

             <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">合力共振分 (Consensus)</div>
                <div className="relative flex items-center justify-center">
                   <svg className="w-40 h-40">
                      <circle cx="80" cy="80" r="72" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                      <circle 
                        cx="80" cy="80" r="72" 
                        fill="none" 
                        stroke={auditData.synergy_score > 75 ? '#f43f5e' : auditData.synergy_score > 40 ? '#6366f1' : '#94a3b8'} 
                        strokeWidth="12" 
                        strokeDasharray="452" 
                        strokeDashoffset={452 * (1 - auditData.synergy_score/100)} 
                        className="transition-all duration-1000"
                        strokeLinecap="round"
                      />
                   </svg>
                   <div className="absolute flex flex-col items-center">
                      <span className="text-5xl font-black text-slate-800">{auditData.synergy_score}</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200">
           <Radar className="w-20 h-20 text-indigo-100 mb-8 animate-pulse" />
           <p className="text-slate-400 font-black text-2xl tracking-tight">
             {mode === 'discover' ? '算法猎手已就绪，准备扫描全网“板块扫货”印记' : '输入代码或上传分时图进行合力审计'}
           </p>
           <p className="text-slate-300 text-sm mt-4 max-w-lg mx-auto leading-relaxed">
             AI 将实时寻找板块标的同步运动、相关性突然飙升的区域，锁定那些被量化资金大批量突袭的机会。
           </p>
        </div>
      )}
    </div>
  );
};
