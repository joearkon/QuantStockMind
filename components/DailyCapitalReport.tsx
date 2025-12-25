
import React, { useState, useEffect } from 'react';
import { AnalysisResult, MarketType } from '../types';
import { fetchDailyCapitalFlowReport } from '../services/institutionService';
import { Flame, Loader2, Search, TrendingUp, TrendingDown, Wallet, Trophy, Target, AlertCircle, Info, ArrowUpRight, BarChart3, Activity, Zap, Coins, Globe, MousePointer2, ChevronRight, PieChart } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';

interface DailyCapitalReportProps {
  currentMarket: MarketType;
}

export const DailyCapitalReport: React.FC<DailyCapitalReportProps> = ({
  currentMarket
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchDailyCapitalFlowReport(currentMarket);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "获取资金研报失败");
    } finally {
      setLoading(false);
    }
  };

  const data = result?.capitalFlowData;

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-24">
      {/* 1. 顶部控制中心 - 极简流线设计 */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-slate-950 rounded-2xl text-rose-500 shadow-2xl shadow-rose-200/50">
            <Flame className="w-8 h-8 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              当日主力与龙虎榜数据
              <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-black rounded-md uppercase tracking-wider">Live</span>
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-1 truncate">
              基于全网实时研报与交易所公开明细，AI 自动化扫描主力博弈成色。
            </p>
          </div>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="relative group overflow-hidden px-8 py-4 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl font-black transition-all shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <div className="relative z-10 flex items-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 text-amber-400" />}
            {loading ? `同步数据 (${elapsed}s)` : '获取主力实时研报'}
          </div>
          {!loading && <div className="absolute inset-0 bg-gradient-to-r from-rose-600/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>}
        </button>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-center gap-4 text-rose-700 shadow-sm animate-shake">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {data && (
        <div className="space-y-8 animate-slide-up">
           
           {/* 2. 核心 KPI 区域 - 拒绝刺眼，强化呼吸感 */}
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* 主力流入大屏 - 解决文字溢出 Bug */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-slate-950 text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden h-full">
                   <div className="absolute -right-10 -top-10 opacity-10">
                      <Coins className="w-64 h-64 text-rose-500 rotate-12" />
                   </div>
                   <div className="relative z-10 space-y-10">
                      <div className="flex items-center justify-between">
                         <h4 className="text-[11px] font-black text-rose-400 uppercase tracking-[0.3em] flex items-center gap-2">
                            <Activity className="w-4 h-4" /> 市场主力净流入
                         </h4>
                         <span className="text-[10px] font-bold text-slate-500">今日更新于 {new Date().toLocaleTimeString()}</span>
                      </div>
                      
                      <div className="min-w-0">
                         {/* 关键修复：针对超长 summary 的处理，确保金额显示突出 */}
                         <div className={`text-6xl md:text-7xl font-black tracking-tighter leading-none mb-6 ${data.total_main_inflow.includes('-') ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {data.total_main_inflow.split(' ')[0] || '--'}
                         </div>
                         <div className="flex flex-wrap items-center gap-3">
                            <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-black text-slate-300 uppercase tracking-widest">{data.market_sentiment_tag}</span>
                            <span className="text-slate-500 text-xs font-bold">主力情绪状态</span>
                         </div>
                      </div>

                      <div className="pt-8 border-t border-white/5">
                         <p className="text-slate-400 text-sm leading-relaxed font-bold italic line-clamp-3">
                            "{data.summary}"
                         </p>
                      </div>
                   </div>
                </div>
              </div>

              {/* 板块资金柱状图 - 修复 Recharts 宽度 Bug */}
              <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col min-h-[450px]">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 px-4">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                          <PieChart className="w-5 h-5" />
                       </div>
                       <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">行业主力分布</h3>
                    </div>
                    <div className="flex items-center gap-4 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                       <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div><span className="text-[10px] font-black text-slate-500">净流入</span></div>
                       <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div><span className="text-[10px] font-black text-slate-500">净流出</span></div>
                    </div>
                 </div>
                 
                 <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                       <BarChart data={data.sector_flow_ranking} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 11, fontWeight: 800, fill: '#64748b'}} 
                            interval={0}
                          />
                          <YAxis hide />
                          <Tooltip 
                             cursor={{fill: 'rgba(241, 245, 249, 0.4)'}}
                             contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px'}}
                          />
                          <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={28}>
                            {data.sector_flow_ranking.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.type === 'in' ? '#f43f5e' : '#10b981'} />
                            ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>

           {/* 3. 资金成色审计 - 类似审计报告的正式排版 */}
           <div className="bg-indigo-900 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                <Globe className="w-80 h-80 text-white" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
                 <div className="p-6 bg-white/10 rounded-[2rem] border border-white/20 backdrop-blur-md shrink-0">
                    <ShieldCheck className="w-12 h-12 text-indigo-200" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-black text-indigo-300 uppercase tracking-[0.4em] mb-4">AI 资金成色审计报告 (Quality Audit)</h5>
                    {/* 关键修复：确保文字在此处正常折行，不产生挤压 */}
                    <p className="text-lg md:text-xl font-bold text-white leading-relaxed break-words italic">
                       "{data.money_quality_analysis}"
                    </p>
                 </div>
              </div>
           </div>

           {/* 4. 龙虎榜明细 - 卡片化布局，告别表格沉闷 */}
           <div className="space-y-6">
              <div className="flex items-center justify-between px-6">
                 <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                   <Trophy className="w-6 h-6 text-amber-500" />
                   核心龙虎榜标的明细
                 </h3>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200">筛选当日核心异动</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {data.lhb_list.map((entry, idx) => (
                    <div key={idx} className="group bg-white border border-slate-200 rounded-3xl p-6 md:p-8 hover:shadow-2xl hover:border-rose-300 transition-all duration-300 relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       
                       <div className="relative z-10 flex justify-between items-start mb-8">
                          <div className="flex items-center gap-5">
                             <div className="w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl group-hover:scale-110 transition-transform">
                                {idx + 1}
                             </div>
                             <div className="min-w-0">
                                <h4 className="text-2xl font-black text-slate-800 tracking-tight truncate">{entry.name}</h4>
                                <span className="text-xs font-mono font-bold text-slate-400 uppercase bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg mt-1 inline-block">{entry.code}</span>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">机构/游资净买入</div>
                             <div className="text-2xl font-black text-rose-500 tracking-tighter">{entry.net_buy}</div>
                          </div>
                       </div>
                       
                       <div className="relative z-10 space-y-6">
                          <div className="flex items-center gap-4">
                             <div className="flex-1">
                                <div className="flex justify-between items-center mb-2">
                                   <span className="text-[9px] font-black text-slate-400 uppercase">博弈强度</span>
                                   <span className="text-[9px] font-black text-rose-500">{entry.hot_money_participation}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                   <div className={`h-full rounded-full transition-all duration-1000 ${entry.hot_money_participation.includes('High') ? 'bg-rose-500 w-[90%]' : 'bg-amber-500 w-[60%]'}`}></div>
                                </div>
                             </div>
                             <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl shadow-lg shrink-0">
                                <Target className="w-4 h-4 text-rose-500" />
                                <span className="text-[11px] font-black text-white">{entry.impact_level} Impact</span>
                             </div>
                          </div>

                          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-600 text-sm leading-relaxed italic group-hover:text-slate-900 group-hover:bg-rose-50/30 transition-all break-words">
                             "{entry.logic}"
                          </div>
                          
                          <div className="flex items-center justify-end gap-2 text-rose-600 font-black text-[10px] uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                             View Analysis <ChevronRight className="w-4 h-4" />
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

        </div>
      )}

      {!data && !loading && (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[3.5rem] border border-dashed border-slate-200 shadow-sm animate-fade-in">
           <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
             <Search className="w-10 h-10 text-slate-200" />
           </div>
           <p className="text-slate-900 font-black text-2xl tracking-tight">暂无当日主力研报数据</p>
           <p className="text-slate-400 text-sm mt-3 font-medium max-w-sm mx-auto leading-relaxed">
             点击右上角按钮，AI 将自动化抓取最新盘后龙虎榜明细，并生成结构化诊断建议。
           </p>
        </div>
      )}
    </div>
  );
};

// 辅助图标
const ShieldCheck = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
);
