import React, { useState, useEffect } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { fetchInstitutionalInsights } from '../services/institutionService';
import { Building2, Loader2, Search, Briefcase, Globe, Zap, Users, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
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

  const marketLabel = MARKET_OPTIONS.find(m => m.value === currentMarket)?.label || currentMarket;

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
                  机构调研与主力动向
               </h2>
               <p className="text-slate-500 text-sm max-w-2xl">
                  实时追踪 <b>公募/私募实地调研</b> 频次，透视 <b>外资(如摩根/高盛)</b> 最新研报观点，以及 <b>游资(Smart Money)</b> 的最新攻击方向。
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
                   <span>正在全网搜索 ({elapsed}s)...</span>
                 </>
              ) : (
                 <>
                   <Search className="w-5 h-5" />
                   获取最新机构情报
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
           
           {/* 1. Summary Card */}
           <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-lg border-l-4 border-violet-500">
              <h3 className="text-violet-300 font-bold uppercase text-xs tracking-wider mb-2 flex items-center gap-2">
                 <Briefcase className="w-4 h-4" /> Market Pulse
              </h3>
              <p className="text-lg leading-relaxed font-medium opacity-90">
                 {result.institutionalData.market_heat_summary}
              </p>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* 2. Survey Heatmap (Domestic) */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                 <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    国内机构调研热度 (Domestic Surveys)
                 </h3>
                 
                 {/* Chart */}
                 <div className="h-60 w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={result.institutionalData.top_surveyed_sectors} layout="vertical" margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="sector_name" width={100} tick={{fontSize: 12}} />
                          <Tooltip cursor={{fill: '#f1f5f9'}} />
                          <Bar dataKey="intensity" name="调研热度" radius={[0, 4, 4, 0]} barSize={20}>
                            {result.institutionalData.top_surveyed_sectors.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#93c5fd'} />
                            ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>

                 {/* Detail Cards */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.institutionalData.top_surveyed_sectors.map((sector, idx) => (
                       <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                          <div className="flex justify-between items-start mb-2">
                             <span className="font-bold text-slate-700">{sector.sector_name}</span>
                             <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">热度: {sector.intensity}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                             {sector.top_stocks.map((stock, sIdx) => (
                                <span key={sIdx} className="text-xs border border-slate-200 bg-white px-1.5 py-0.5 rounded text-slate-600">{stock}</span>
                             ))}
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">
                             {sector.reason}
                          </p>
                       </div>
                    ))}
                 </div>
              </div>

              {/* 3. Foreign Views & Smart Money */}
              <div className="space-y-6">
                 
                 {/* Foreign Views */}
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <Globe className="w-5 h-5 text-indigo-600" />
                       外资/投行观点
                    </h3>
                    <div className="space-y-4">
                       {result.institutionalData.key_institution_views.map((view, idx) => (
                          <div key={idx} className="relative pl-3 border-l-2 border-indigo-200">
                             <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-xs text-indigo-700 uppercase">{view.institution_name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                   view.sentiment === 'bullish' ? 'bg-red-50 text-red-600' : 
                                   view.sentiment === 'bearish' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-600'
                                }`}>
                                   {view.sentiment}
                                </span>
                             </div>
                             <p className="text-sm text-slate-700 font-medium leading-snug mb-1">
                                {view.viewpoint}
                             </p>
                             <div className="text-xs text-slate-400">
                                关注: {view.target_sector}
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Smart Money */}
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <Zap className="w-5 h-5 text-amber-500" />
                       游资/聪明钱 (Smart Money)
                    </h3>
                    <div className="space-y-3">
                       {result.institutionalData.smart_money_trends.map((trend, idx) => (
                          <div key={idx} className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                             <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-slate-800">{trend.concept_name}</span>
                                {trend.flow_status === 'net_inflow' ? (
                                   <span className="flex items-center text-xs text-red-600 font-bold"><TrendingUp className="w-3 h-3 mr-1"/> 净流入</span>
                                ) : (
                                   <span className="text-xs text-green-600 font-bold">净流出</span>
                                )}
                             </div>
                             <p className="text-xs text-slate-600">
                                {trend.key_driver}
                             </p>
                          </div>
                       ))}
                    </div>
                 </div>

              </div>
           </div>
           
           <div className="text-center text-xs text-slate-400 mt-4">
              * 数据来源包含公募基金公告、券商研报及交易所公开信息，仅供参考。
           </div>
        </div>
      )}
    </div>
  );
};