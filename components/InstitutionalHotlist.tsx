
import React, { useState, useEffect } from 'react';
import { ModelProvider, MarketType, AnalysisResult } from '../types';
import { fetchHighFreqSurveys } from '../services/institutionService';
import { UserCheck, Loader2, Award, Users, Search, TrendingUp, BarChart3, ArrowRight, ShieldCheck, Flame } from 'lucide-react';

export const InstitutionalHotlist: React.FC<{
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: any;
}> = ({ currentModel, currentMarket, settings }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    if (!settings.geminiKey) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHighFreqSurveys(currentMarket, settings.geminiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hot = result?.hotlistData;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <UserCheck className="w-6 h-6" />
            </div>
            机构风向标 (Hot Survey Radar)
          </h2>
          <p className="text-slate-500 text-sm">重点监控被机构调研“最频繁”的标的，识别基本面异动。潜伏在风口爆发前。</p>
        </div>
        <button 
          onClick={handleFetch}
          disabled={loading}
          className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          扫描高频调研榜单
        </button>
      </div>

      {hot && (
        <div className="space-y-8 animate-slide-up">
          <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl border-l-4 border-indigo-400">
             <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Flame className="w-3 h-3 text-rose-500" /> 机构共识研判
             </div>
             <p className="text-lg font-bold italic leading-relaxed">"{hot.summary}"</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hot.ranking.map((stock, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-indigo-600">#{idx + 1}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${stock.potential_rating === 'High' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {stock.potential_rating === 'High' ? '高潜' : '稳健'}
                      </span>
                   </div>
                   <div className="text-[10px] font-black text-slate-400">{stock.code}</div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <h4 className="text-xl font-black text-slate-800">{stock.name}</h4>
                    <div className="text-xs font-bold text-indigo-500 mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> 近期调研: {stock.visit_frequency} ({stock.institution_count}家机构)
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 leading-relaxed min-h-[80px]">
                    {stock.core_logic}
                  </div>
                  <button className="w-full py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center justify-center gap-2">
                    详情诊断 <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" /> 板块调研热度分布
             </h3>
             <div className="flex flex-wrap gap-4">
                {hot.sector_heat.map((s, i) => (
                   <div key={i} className="flex-1 min-w-[120px] bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                      <div className="text-xs font-black text-slate-400 mb-1 uppercase tracking-widest">{s.name}</div>
                      <div className="text-xl font-black text-indigo-600">{s.value}%</div>
                   </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
