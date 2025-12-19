
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, AnalysisResult, UserSettings, MarketType } from '../types';
import { fetchInstitutionalInsights } from '../services/institutionService';
import { Building2, Loader2, Search, Briefcase, Globe, Zap, Users, TrendingUp, AlertTriangle, ChevronRight, Trophy, Flame, Target, MessageSquareCode } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';

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
  const navigate = useNavigate();
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

  const handleGoToStock = (code: string, name: string) => {
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  const d = result?.institutionalData;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 relative overflow-hidden">
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
               <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-lg text-white">
                    <Building2 className="w-6 h-6" />
                  </div>
                  近一周 机构调研龙虎榜
               </h2>
               <p className="text-slate-500 text-sm max-w-2xl">
                  AI 深度扫描深交所、上交所调研记录，为您实时呈现本周机构访问频率最高的个股及其核心逻辑。
               </p>
            </div>
            
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? (
                 <>
                   <Loader2 className="w-5 h-5 animate-spin" />
                   <span>正在联网抓取数据 ({elapsed}s)...</span>
                 </>
              ) : (
                 <>
                   <Search className="w-5 h-5" />
                   开始情报检索
                 </>
              )}
            </button>
         </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {d && (
        <div className="space-y-6 animate-slide-up pb-12">
           
           {/* 1. 全局摘要 */}
           <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xl border-l-4 border-indigo-500">
              <h3 className="text-indigo-400 font-bold text-xs tracking-wider mb-2 flex items-center gap-2 uppercase">
                 <Briefcase className="w-4 h-4" /> 市场调研脉搏 (Weekly Review)
              </h3>
              <p className="text-lg leading-relaxed font-medium">
                 {d.market_heat_summary}
              </p>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* 2. 个股调研龙虎榜 (左侧重点) */}
              <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                       <Trophy className="w-5 h-5 text-amber-500" />
                       个股调研活跃度排行榜 (TOP 10)
                    </h3>
                    <span className="text-xs text-slate-400">近 7 个交易日</span>
                 </div>
                 <div className="divide-y divide-slate-100">
                    {d.top_companies?.map((company, idx) => (
                       <div key={idx} className="p-6 hover:bg-slate-50 transition-colors group">
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                             <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg font-black text-lg ${
                                idx < 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                             }`}>
                                {idx + 1}
                             </div>
                             <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                   <span className="text-xl font-bold text-slate-900">{company.name}</span>
                                   <span className="text-sm font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{company.code}</span>
                                   <div className="flex gap-1">
                                      {company.institution_types?.map((type, i) => (
                                         <span key={i} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 font-bold">{type}</span>
                                      ))}
                                   </div>
                                </div>
                                <div className="flex items-start gap-2 text-sm text-slate-600">
                                   <MessageSquareCode className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                                   <p className="leading-relaxed">{company.core_logic}</p>
                                </div>
                             </div>
                             <div className="md:text-right shrink-0">
                                <div className="text-sm font-bold text-indigo-600">{company.survey_count}</div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">SURVEY FREQUENCY</div>
                                <button 
                                  onClick={() => handleGoToStock(company.code, company.name)}
                                  className="mt-2 text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium transition-colors"
                                >
                                  深度诊断 <ChevronRight className="w-3 h-3" />
                                </button>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* 3. 右侧辅助：行业热点与聪明钱 */}
              <div className="lg:col-span-4 space-y-6">
                 
                 {/* 行业调研热力 */}
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <Flame className="w-5 h-5 text-orange-500" />
                       热门调研行业
                    </h3>
                    <div className="space-y-4">
                       {d.top_surveyed_sectors?.map((sector, idx) => (
                          <div key={idx} className="relative">
                             <div className="flex justify-between items-center mb-1 text-sm">
                                <span className="font-bold text-slate-700">{sector.sector_name}</span>
                                <span className="text-indigo-600 font-bold">{sector.intensity}%</span>
                             </div>
                             <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{width: `${sector.intensity}%`}}></div>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* 外部研报观点 */}
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <Globe className="w-5 h-5 text-blue-600" />
                       大行研报精要
                    </h3>
                    <div className="space-y-4">
                       {d.key_institution_views?.map((view, idx) => (
                          <div key={idx} className="border-l-4 border-slate-200 pl-3 py-1">
                             <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{view.institution_name}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                   view.sentiment === 'bullish' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                   {view.sentiment === 'bullish' ? '看多' : '看空'}
                                </span>
                             </div>
                             <p className="text-sm text-slate-700 leading-snug">{view.viewpoint}</p>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* 聪明钱流向 */}
                 <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-6">
                    <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                       <Zap className="w-5 h-5 text-amber-500" />
                       活跃资金动向
                    </h3>
                    <div className="space-y-3">
                       {d.smart_money_trends?.map((trend, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                             <Target className={`w-4 h-4 mt-0.5 ${trend.flow_status === 'net_inflow' ? 'text-rose-500' : 'text-emerald-500'}`} />
                             <div>
                                <div className="text-sm font-bold text-slate-800">{trend.concept_name}</div>
                                <p className="text-xs text-slate-500">{trend.key_driver}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>

              </div>
           </div>
           
           <div className="text-center text-xs text-slate-400">
              * 数据基于互联网公开调研记录整理。投资有风险，决策需谨慎。
           </div>
        </div>
      )}
    </div>
  );
};
