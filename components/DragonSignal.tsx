
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, MarketType, AnalysisResult, DragonSignalItem } from '../types';
import { fetchDragonSignals } from '../services/geminiService';
import { Zap, Loader2, ArrowRight, Activity, Flame, Target, ShieldAlert, Rocket, Search, Globe, ChevronRight, Gauge, TrendingUp, Sparkles, Star } from 'lucide-react';

export const DragonSignal: React.FC<{
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
      const data = await fetchDragonSignals(settings.geminiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "信号扫描失败，请检查 API 配置。");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToStock = (code: string, name: string) => {
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  const data = result?.dragonSignalData;

  const getSignalBadge = (type: string) => {
    switch (type) {
      case '龙回头': return 'bg-amber-100 text-amber-700 border-amber-200';
      case '一进二': return 'bg-rose-100 text-rose-700 border-rose-200';
      case '底部反转': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Search Header */}
      <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 md:p-14 relative overflow-hidden border-b-8 border-indigo-500">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
            <div>
              <h2 className="text-4xl font-black text-white flex items-center gap-4 mb-3 tracking-tight">
                <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl">
                  <Zap className="w-8 h-8" />
                </div>
                龙脉信号审计 (Dragon Signal)
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl font-medium">
                扫描全市场 **龙头股**、**底部金叉** 及 **极值回踩** 信号。过滤 Alpha 级别催化剂，锁定绝对强势。
              </p>
            </div>
            
            <button 
              onClick={handleScan}
              disabled={loading}
              className="px-12 h-16 bg-white text-slate-900 rounded-[1.5rem] font-black shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-600" /> : <Rocket className="w-6 h-6 text-indigo-600" />}
              {loading ? `全网龙脉探测中 (${elapsed}s)...` : '启动全市场信号审计'}
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
             <div className="px-5 py-2.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-slate-300 text-xs font-black flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" /> 缩量极值回踩
             </div>
             <div className="px-5 py-2.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-slate-300 text-xs font-black flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> 竞价超预期一进二
             </div>
             <div className="px-5 py-2.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-slate-300 text-xs font-black flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" /> 全网 Alpha 催化过滤
             </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] text-rose-700 flex items-center gap-4 shadow-sm animate-fade-in">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {data && (
        <div className="space-y-10 animate-slide-up">
           {/* Summary Dashboard */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">市场脉搏诊断</div>
                 <p className="text-xl font-black text-slate-800 leading-relaxed italic">"{data.market_pulse}"</p>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">龙头活跃能级</div>
                 <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                       <circle cx="48" cy="48" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                       <circle cx="48" cy="48" r="40" fill="none" stroke="#6366f1" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - data.dragon_energy/100)} className="transition-all duration-1000" />
                    </svg>
                    <span className="absolute text-2xl font-black text-slate-800">{data.dragon_energy}</span>
                 </div>
              </div>
              <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-center">
                 <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-2">审计完成时间</div>
                 <div className="text-3xl font-black tracking-tight">{data.scan_time}</div>
                 <div className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-200">
                    <Activity className="w-4 h-4" /> 扫描节点: 5,000+ A股全量标的
                 </div>
              </div>
           </div>

           {/* Signal Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {data.signals.map((signal, idx) => (
                 <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-2xl transition-all group flex flex-col">
                    <div className="p-8 pb-4">
                       <div className="flex justify-between items-start mb-6">
                          <div>
                             <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getSignalBadge(signal.signal_type)}`}>
                                {signal.signal_type}
                             </span>
                             <h3 className="text-2xl font-black text-slate-800 mt-3">{signal.name}</h3>
                             <div className="text-xs font-mono text-slate-400 mt-0.5">{signal.code}</div>
                          </div>
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black border-2 ${
                             signal.energy_score >= 80 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                          }`}>
                             {signal.energy_score}
                          </div>
                       </div>

                       <div className="bg-slate-50 rounded-[2rem] p-6 mb-6 border border-slate-100">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                             <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Alpha 量化逻辑
                          </div>
                          <p className="text-sm text-slate-600 font-bold leading-relaxed">{signal.alpha_logic}</p>
                       </div>

                       <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-white border border-slate-100 p-4 rounded-2xl">
                             <div className="text-[10px] font-black text-slate-400 uppercase mb-1">关键压力位</div>
                             <div className="text-lg font-black text-rose-600">{signal.key_target}</div>
                          </div>
                          <div className="bg-white border border-slate-100 p-4 rounded-2xl">
                             <div className="text-[10px] font-black text-slate-400 uppercase mb-1">核心止损位</div>
                             <div className="text-lg font-black text-emerald-600">{signal.key_support}</div>
                          </div>
                       </div>
                    </div>

                    <div className="mt-auto px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase">量能评级</span>
                          <span className="text-xs font-bold text-slate-700">{signal.volume_status}</span>
                       </div>
                       <button 
                         onClick={() => handleNavigateToStock(signal.code, signal.name)}
                         className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all group-hover:scale-110"
                       >
                         <ArrowRight className="w-5 h-5" />
                       </button>
                    </div>
                 </div>
              ))}
           </div>

           <div className="flex flex-col md:flex-row gap-6 justify-center items-center py-10">
              <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-slate-200 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                 <Star className="w-4 h-4 text-amber-500" /> 评分 85+ 代表主力资金入场确定性极高
              </div>
              <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-slate-200 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                 <Target className="w-4 h-4 text-indigo-500" /> 目标位已考虑行业平均 Beta 波动
              </div>
           </div>
        </div>
      )}

      {!result && !loading && (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200">
           <div className="p-6 bg-indigo-50 rounded-full mb-8">
              <Search className="w-16 h-16 text-indigo-200" />
           </div>
           <p className="text-slate-400 font-black text-2xl tracking-tight">准备好狙击全市场龙脉信号了吗？</p>
           <p className="text-slate-300 text-sm mt-4 max-w-md mx-auto leading-relaxed">
              AI 将实时同步全网研报、公告及盘面异动数据，通过“龙回头”、“一进二”等高胜率战法对 5,000+ A股进行毫秒级审计。
           </p>
        </div>
      )}
    </div>
  );
};
