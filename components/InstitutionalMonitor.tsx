
import React, { useState, useEffect } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { fetchInstitutionalInsights } from '../services/institutionService';
import { Building2, Loader2, Search, Briefcase, Globe, Zap, Users, BarChart3, TrendingUp, AlertTriangle, ArrowRightCircle, Activity, LayoutGrid, Info } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface InstitutionalMonitorProps {
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: UserSettings;
  onOpenSettings?: () => void;
}

export const InstitutionalMonitor: React.FC<InstitutionalMonitorProps> = ({
  currentModel,
  currentMarket,
  settings,
  onOpenSettings
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

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchInstitutionalInsights(currentModel, currentMarket, settings);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "获取机构调研数据失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 relative overflow-hidden">
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
               <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-700 rounded-lg text-white shadow-lg shadow-violet-200">
                    <Building2 className="w-6 h-6" />
                  </div>
                  机构席位与高频资金动向
               </h2>
               <p className="text-slate-500 text-sm max-w-2xl">
                  重点监测：<b>龙虎榜机构席位</b>、<b>大宗交易溢价率</b>、<b>分时资金主动买卖差</b>。AI 优先分析“净额趋势”而非单一绝对值。
               </p>
            </div>
            
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? (
                 <>
                   <Loader2 className="w-5 h-5 animate-spin" />
                   <span>正在全网回溯监控点 ({elapsed}s)...</span>
                 </>
              ) : (
                 <>
                   <Search className="w-5 h-5" />
                   深度透析主力资金
                 </>
              )}
            </button>
         </div>
         <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-violet-50 to-transparent pointer-events-none"></div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && result.institutionalData && (
        <div className="space-y-6 animate-slide-up">
           
           {/* Top Signal Bar */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-xl border-l-4 border-indigo-500 shadow-sm">
                 <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                    <LayoutGrid className="w-3.5 h-3.5" /> 龙虎榜监控 (Dragon Tiger)
                 </div>
                 <p className="text-sm text-slate-700 font-medium leading-relaxed">
                    {result.institutionalData.detailed_signals?.lh_list || "今日暂未捕捉到重磅机构席位变动。"}
                 </p>
              </div>
              <div className="bg-white p-5 rounded-xl border-l-4 border-amber-500 shadow-sm">
                 <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" /> 大宗交易活跃度 (Block)
                 </div>
                 <p className="text-sm text-slate-700 font-medium leading-relaxed">
                    {result.institutionalData.detailed_signals?.block_trades || "大宗交易频率正常，溢价波动较小。"}
                 </p>
              </div>
              <div className="bg-white p-5 rounded-xl border-l-4 border-rose-500 shadow-sm">
                 <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> 分时买卖差趋势 (Spread)
                 </div>
                 <p className="text-sm text-slate-700 font-medium leading-relaxed">
                    {result.institutionalData.detailed_signals?.spread_trend || "主力资金流入节奏处于平稳阶段。"}
                 </p>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                 <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    国内机构调研热度 (Domestic Surveys)
                 </h3>
                 <div className="h-60 w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={result.institutionalData.top_surveyed_sectors || []} layout="vertical" margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="sector_name" width={100} tick={{fontSize: 12}} />
                          <Tooltip cursor={{fill: '#f1f5f9'}} />
                          <Bar dataKey="intensity" name="调研热度" radius={[0, 4, 4, 0]} barSize={20}>
                            {result.institutionalData.top_surveyed_sectors?.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#93c5fd'} />
                            ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.institutionalData.top_surveyed_sectors?.map((sector, idx) => (
                       <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                          <div className="flex justify-between items-start mb-2">
                             <span className="font-bold text-slate-700">{sector.sector_name}</span>
                             <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">热度: {sector.intensity}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                             {sector.top_stocks?.map((stock, sIdx) => (
                                <span key={sIdx} className="text-xs border border-slate-200 bg-white px-1.5 py-0.5 rounded text-slate-600">{stock}</span>
                             ))}
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{sector.reason}</p>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <Globe className="w-5 h-5 text-indigo-600" />
                       外资/投行观点
                    </h3>
                    <div className="space-y-4">
                       {result.institutionalData.key_institution_views?.map((view, idx) => (
                          <div key={idx} className="relative pl-3 border-l-2 border-indigo-200">
                             <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-xs text-indigo-700 uppercase">{view.institution_name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                   view.sentiment === 'bullish' ? 'bg-red-50 text-red-600' : 
                                   view.sentiment === 'bearish' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-600'
                                }`}>{view.sentiment}</span>
                             </div>
                             <p className="text-sm text-slate-700 font-medium leading-snug mb-1">{view.viewpoint}</p>
                             <div className="text-xs text-slate-400">关注: {view.target_sector}</div>
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <Zap className="w-5 h-5 text-amber-500" />
                       活跃资金 (Smart Money)
                    </h3>
                    <div className="space-y-3">
                       {result.institutionalData.smart_money_trends?.map((trend, idx) => (
                          <div key={idx} className="bg-amber-50 rounded-lg p-3 border border-amber-100 flex items-start gap-3">
                             <div className="mt-1 p-1 bg-white rounded shadow-sm">
                                {trend.signal_type === 'dragon_tiger' ? <TrendingUp className="w-3 h-3 text-indigo-600" /> : <Activity className="w-3 h-3 text-amber-600" />}
                             </div>
                             <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                   <span className="font-bold text-slate-800">{trend.concept_name}</span>
                                   <span className={`text-xs font-bold ${trend.flow_status === 'net_inflow' ? 'text-red-600' : 'text-green-600'}`}>
                                      {trend.flow_status === 'net_inflow' ? '趋势净买' : '趋势净卖'}
                                   </span>
                                </div>
                                <p className="text-xs text-slate-600">{trend.key_driver}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex items-start gap-3">
              <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-sm text-indigo-900 leading-relaxed">
                 <b>监控要点提醒</b>：盘中关注“净流入趋势”加速情况，大宗交易若出现高溢价，往往暗示后续有重大利好或机构抢筹。龙虎榜机构席位占比超过 30% 时，该股具备中线妖性。
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
