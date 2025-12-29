
import React, { useState, useEffect } from 'react';
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { fetchInstitutionalChipAnalysis } from '../services/geminiService';
import { PieChart, Loader2, Search, Zap, ShieldCheck, Target, TrendingUp, Info, Activity, Fingerprint, Coins, Scale, Users, ShieldAlert, Compass } from 'lucide-react';

export const ChipMaster: React.FC<{
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

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => setElapsed(p => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleAnalyze = async () => {
    if (!query) return;
    if (!settings.geminiKey) {
      onOpenSettings();
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchInstitutionalChipAnalysis(query, settings.geminiKey, currentMarket);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "筹码研判失败");
    } finally {
      setLoading(false);
    }
  };

  const cdata = result?.chipData;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-rose-500 stroke-rose-500';
    if (score >= 50) return 'text-indigo-500 stroke-indigo-500';
    return 'text-slate-400 stroke-slate-400';
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Header Card */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-12 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl text-white shadow-xl">
              <PieChart className="w-8 h-8" />
            </div>
            筹码大师·主力控盘分析
          </h2>
          <p className="text-slate-500 text-base max-w-2xl font-medium mb-10">
            深度审计标的主力底仓成本。结合龙虎榜、股东人数变动及大宗交易，透视资金真实的锁仓强度。
          </p>

          <div className="max-w-2xl flex gap-3 p-2 bg-slate-100 rounded-[2rem] border border-slate-200">
             <div className="relative flex-1">
                <input 
                  type="text" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="输入标的代码或名称 (如: 贵州茅台)..."
                  className="w-full h-14 pl-12 pr-4 bg-white rounded-[1.5rem] border border-slate-200 focus:ring-4 focus:ring-slate-100 outline-none font-bold text-lg"
                  onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                />
                <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
             </div>
             <button 
              onClick={handleAnalyze}
              disabled={loading || !query}
              className="px-10 h-14 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
             >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                开始筹码扫描
             </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 flex items-center gap-4 animate-fade-in">
          <Info className="w-6 h-6 shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {cdata && (
        <div className="space-y-8 animate-slide-up">
          
          {/* Main Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             
             {/* 1. 控盘度大转盘 */}
             <div className="lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col items-center justify-center">
                <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none"></div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">主力控盘度 (Control)</div>
                <div className="relative flex items-center justify-center">
                   <svg className="w-48 h-48 transform -rotate-90">
                      <circle cx="96" cy="96" r="80" fill="none" stroke="#1e293b" strokeWidth="12" />
                      <circle 
                        cx="96" cy="96" r="80" 
                        fill="none" 
                        strokeWidth="12" 
                        strokeLinecap="round"
                        strokeDasharray="502.4" 
                        strokeDashoffset={502.4 * (1 - cdata.control_score / 100)} 
                        className={`transition-all duration-1000 ${getScoreColor(cdata.control_score)}`}
                      />
                   </svg>
                   <div className="absolute flex flex-col items-center">
                      <span className="text-6xl font-black tracking-tighter">{cdata.control_score}</span>
                      <span className={`text-xs font-black uppercase tracking-widest mt-2 ${getScoreColor(cdata.control_score)}`}>
                         {cdata.control_status === 'High' ? '高度锁仓' : cdata.control_status === 'Medium' ? '中度控盘' : '筹码涣散'}
                      </span>
                   </div>
                </div>
             </div>

             {/* 2. 核心成本透视 */}
             <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 flex flex-col justify-center">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                   <div>
                      <h3 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                         {cdata.name} <span className="text-sm font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border">{cdata.code}</span>
                      </h3>
                      <p className="text-slate-400 text-xs font-bold mt-2 flex items-center gap-1">
                         <Target className="w-3 h-3" /> 数据基准点：{new Date().toLocaleDateString()}
                      </p>
                   </div>
                   <div className="text-right">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">当前股价</div>
                      <div className="text-4xl font-black text-slate-900 tracking-tighter">{cdata.current_price}</div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="p-8 bg-slate-900 rounded-3xl text-white relative overflow-hidden group">
                      <Coins className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform" />
                      <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">主力平均成本 (Est. Cost)</div>
                      <div className="text-5xl font-black mb-4 tracking-tighter">{cdata.main_cost}</div>
                      <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black border-2 ${
                        parseFloat(cdata.cost_distance) >= 0 ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      }`}>
                         安全垫：{cdata.cost_distance}
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center flex flex-col justify-center">
                         <div className="text-[10px] font-black text-slate-400 uppercase mb-2">获利盘比例</div>
                         <div className="text-2xl font-black text-slate-800">{cdata.profit_ratio}</div>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center flex flex-col justify-center">
                         <div className="text-[10px] font-black text-slate-400 uppercase mb-2">筹码集中度</div>
                         <div className="text-2xl font-black text-slate-800">{cdata.chip_concentration}</div>
                      </div>
                      <div className="col-span-2 p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-center gap-4">
                         <Activity className="w-6 h-6 text-indigo-500 shrink-0" />
                         <div>
                            <div className="text-[10px] font-black text-indigo-400 uppercase mb-1">近期大单净流向</div>
                            <div className="text-sm font-bold text-indigo-900">{cdata.recent_big_flow}</div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Institutional Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                   <Users className="w-5 h-5 text-indigo-500" /> 机构仓位透视 (Position Audit)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {cdata.positions.map((pos, idx) => (
                      <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative group overflow-hidden">
                         <div className={`absolute top-0 left-0 w-1 h-full ${pos.change.includes('增') ? 'bg-rose-500' : 'bg-slate-300'}`}></div>
                         <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{pos.type}</div>
                         <div className={`text-lg font-black mb-3 ${pos.change.includes('增') ? 'text-rose-600' : 'text-slate-600'}`}>
                            {pos.change}
                         </div>
                         <p className="text-xs text-slate-500 font-medium leading-relaxed italic line-clamp-3">"{pos.description}"</p>
                      </div>
                   ))}
                </div>
             </div>

             <div className="lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative">
                <Compass className="absolute -right-4 -top-4 w-24 h-24 text-white/5" />
                <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                   <ShieldCheck className="w-4 h-4" /> 筹码博弈结论 (Verdict)
                </h4>
                <p className="text-lg font-black leading-relaxed text-indigo-100 italic">
                   "{cdata.battle_verdict}"
                </p>
                <div className="mt-8 pt-6 border-t border-slate-800">
                   <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                      <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-400 font-medium">
                         主力成本为动态推算，受派发与回补影响，仅供参考。获利盘超过 85% 时需警惕随时可能到来的集体获利了结抛压。
                      </p>
                   </div>
                </div>
             </div>
          </div>

          <div className="text-center py-12">
             <div className="inline-flex items-center gap-3 px-8 py-3 bg-slate-100 rounded-full text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                <Activity className="w-4 h-4 text-slate-300" /> 分析引擎已对齐最新的股东人数变动及大宗交易数据
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
