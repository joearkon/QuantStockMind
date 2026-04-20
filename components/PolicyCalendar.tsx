
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, MarketType, AnalysisResult, CatalystEvent } from '../types';
import { fetchPolicyCalendar } from '../services/geminiService';
import { Calendar, Loader2, Search, ArrowRight, Zap, Flame, ShieldCheck, Activity, Target, Info, Sparkles, TrendingUp, AlertTriangle, Eye, Rocket, Battery, Cpu, BarChart4, CpuIcon, Layers, CalendarDays, ExternalLink, Timer, ArrowUpRight } from 'lucide-react';

export const PolicyCalendar: React.FC<{
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
  const [selectedMonth, setSelectedMonth] = useState('2026年4月');

  const months = [
    '2026年4月',
    '2026年5月',
    '2026年6月',
    '2026年7月',
  ];

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
      const data = await fetchPolicyCalendar(settings.geminiKey, selectedMonth);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "政策日历获取失败");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToStock = (code: string, name: string) => {
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  const data = result?.policyCalendarData;

  const getEventIcon = (type: string, name: string) => {
    if (name.includes('航天') || name.includes('卫星')) return <Rocket className="w-5 h-5" />;
    if (name.includes('宁德') || name.includes('电池')) return <Battery className="w-5 h-5" />;
    if (name.includes('算力') || name.includes('Cloud') || name.includes('AI')) return <CpuIcon className="w-5 h-5" />;
    if (type === 'Financial') return <BarChart4 className="w-5 h-5" />;
    return <CalendarDays className="w-5 h-5" />;
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'Policy': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'Event': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Financial': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'S': return 'bg-rose-500 text-white shadow-lg shadow-rose-200';
      case 'A': return 'bg-amber-500 text-white shadow-lg shadow-amber-200';
      case 'B': return 'bg-blue-500 text-white shadow-lg shadow-blue-200';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-24">
      {/* Search Header */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-14 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-rose-50 to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
          <div className="flex-1">
            <h2 className="text-4xl font-black text-slate-800 flex items-center gap-5 mb-6">
              <div className="p-4 bg-rose-500 rounded-3xl text-white shadow-2xl shadow-rose-100">
                <Calendar className="w-10 h-10" />
              </div>
              政策与产业催化日历
            </h2>
            <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-3xl mb-8">
              深度审计全市场重磅政策、财报截止、及产业峰会。为您识别具有“确定性爆发”潜力的时间窗口，辅助左侧埋伏与龙头卡位。
            </p>
            <div className="flex flex-wrap gap-4 mb-8">
              <span className="px-4 py-2 bg-slate-900 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Timer className="w-4 h-4 text-rose-500" /> {selectedMonth} 重点期
              </span>
              <span className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-500" /> 亨通光电等核心标的监控
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-2">
              <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">选择审计月份 (Future Months):</span>
              <div className="flex flex-wrap gap-2">
                 {months.map(m => (
                   <button
                     key={m}
                     onClick={() => setSelectedMonth(m)}
                     className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                       selectedMonth === m 
                       ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 scale-105' 
                       : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                     }`}
                   >
                     {m}
                   </button>
                 ))}
              </div>
            </div>
          </div>
          <button 
            onClick={handleScan}
            disabled={loading}
            className="w-full lg:w-auto px-14 h-20 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Sparkles className="w-8 h-8 text-rose-400" />}
            {loading ? `正在审计 ${selectedMonth} (${elapsed}s)` : `扫描 ${selectedMonth} 全网催化`}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-8 bg-rose-50 border border-rose-100 rounded-[2rem] text-rose-700 flex items-center gap-5 shadow-sm animate-fade-in italic font-bold text-lg">
          <AlertTriangle className="w-8 h-8 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <div className="space-y-12 animate-slide-up">
          {/* Strategy View */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl border border-slate-800 relative z-10 overflow-hidden">
             <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.15),transparent_70%)]"></div>
             <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                <div className="w-40 h-40 rounded-full bg-slate-800 border-4 border-slate-700 flex flex-col items-center justify-center shrink-0">
                   <span className="text-sm font-black text-slate-500 tracking-[0.2em] uppercase mb-1">月份</span>
                   <span className="text-4xl font-black text-rose-500 tracking-tighter">{data.month}</span>
                </div>
                <div className="flex-1 text-center md:text-left">
                   <h3 className="text-2xl font-black mb-4 flex items-center gap-3 justify-center md:justify-start">
                      <TrendingUp className="w-7 h-7 text-emerald-400" />
                      全月博弈主基调 (Strategy)
                   </h3>
                   <p className="text-xl text-slate-300 font-medium italic leading-relaxed opacity-90">
                      "{data.overall_strategy}"
                   </p>
                </div>
             </div>
          </div>

          {/* Timeline View */}
          <div className="relative">
             {/* Middle Rail */}
             <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-100 hidden lg:block -translate-x-1/2"></div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-12">
                {data.events.map((event, idx) => (
                  <div 
                    key={idx} 
                    className={`relative ${idx % 2 === 0 ? 'lg:pr-4' : 'lg:pl-4 lg:mt-12'}`}
                  >
                    {/* Dot on Rail */}
                    <div className="absolute left-1/2 top-10 w-6 h-6 bg-white border-4 border-rose-500 rounded-full hidden lg:block -translate-x-1/2 z-20 shadow-xl"></div>
                    
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-2xl transition-all hover:-translate-y-2 group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${getTypeStyle(event.type)} border flex items-center justify-center`}>
                            {getEventIcon(event.type, event.event_name)}
                          </div>
                          <div>
                            <div className="text-2xl font-black text-slate-800 group-hover:text-rose-500 transition-colors uppercase tabular-nums">
                              {event.date_window}
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              级别: <span className={`px-2 py-0.5 rounded-full ml-1 ${getLevelStyle(event.opportunity_level)} text-[8px]`}>{event.opportunity_level}</span>
                            </span>
                          </div>
                        </div>
                        {event.type === 'Policy' && (
                          <div className="px-3 py-1 bg-indigo-500 text-white rounded-lg text-[10px] font-black flex items-center gap-1">
                            <Layers className="w-3 h-3" /> 重磅政策
                          </div>
                        )}
                      </div>

                      <h4 className="text-2xl font-black text-slate-800 mb-4 leading-tight">
                        {event.event_name}
                      </h4>
                      
                      <div className="px-4 py-2 bg-rose-50 text-rose-600 inline-block rounded-xl font-black text-xs mb-6 border border-rose-100">
                        主题: {event.theme_label}
                      </div>

                      <div className="space-y-4 mb-8">
                         <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">核心逻辑 (Logic)</span>
                            <p className="text-sm text-slate-600 font-bold leading-relaxed">{event.logic_chain}</p>
                         </div>
                         <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">影响领域 (Impact)</span>
                            <div className="flex flex-wrap gap-2">
                              {event.impact_sectors.map((s, i) => (
                                <span key={i} className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg border border-slate-200">{s}</span>
                              ))}
                            </div>
                         </div>
                      </div>

                      <div className="border-t border-slate-100 pt-6">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block">直接利好标的 (Alpha)</span>
                         <div className="grid grid-cols-1 gap-3">
                           {event.suggested_stocks.map((stock, si) => (
                             <div 
                               key={si}
                               onClick={() => handleNavigateToStock(stock.code, stock.name)}
                               className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-rose-400 hover:bg-rose-50 transition-all cursor-pointer flex items-center justify-between group/stock"
                             >
                               <div>
                                  <div className="font-black text-slate-800 flex items-center gap-2">
                                     {stock.name} <span className="text-[10px] font-mono opacity-40">{stock.code}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium mt-1 italic">{stock.logic}</div>
                               </div>
                               <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover/stock:text-rose-500 transition-colors" />
                             </div>
                           ))}
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-100 rounded-[2.5rem] p-10 flex items-start gap-8 shadow-xl shadow-amber-500/5">
             <div className="p-4 bg-amber-500 rounded-3xl text-white">
                <Info className="w-10 h-10" />
             </div>
             <div className="flex-1">
                <h4 className="text-xl font-black text-amber-900 mb-3">操盘提醒：财报季末端效应</h4>
                <p className="text-amber-800/80 leading-relaxed font-medium">
                  4月25日至4月30日是财报强制披露的最后窗口期，全市场“优生”通常已交卷，剩下的标的虽然不乏惊喜，但“爆雷”概率显著增加。建议重点盯紧已披露业绩远超预期的【光模块/AI/航天】核心龙头，若出现政策利好叠加业绩兑现的回调，往往是极佳的右侧进场点。
                </p>
             </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="py-44 text-center flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200">
           <div className="relative">
              <CalendarDays className="w-24 h-24 text-rose-100 mb-10" />
              <div className="absolute -top-4 -right-4 w-10 h-10 bg-indigo-500 rounded-3xl animate-bounce flex items-center justify-center text-white font-black text-xs">GO</div>
           </div>
           <p className="text-slate-400 font-black text-3xl tracking-tight">开启全维度催化日历，抢占时间先机</p>
           <p className="text-slate-300 text-base mt-6 max-w-xl mx-auto leading-relaxed font-medium">
              AI 将深度扫描本月及跨月的产业发布会、政策落地节点、及财报关键日期，并为您自动锚定对应的核心受益标的。
           </p>
        </div>
      )}
    </div>
  );
};
