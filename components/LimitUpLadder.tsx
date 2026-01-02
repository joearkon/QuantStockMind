
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelProvider, MarketType, AnalysisResult, LimitUpLadderSector } from '../types';
import { fetchLimitUpLadder } from '../services/geminiService';
import { Network, Loader2, Search, ArrowRight, Zap, Target, Flame, ShieldAlert, BarChart3, Rocket, Crown, Star, Layers, Activity, Info, Trophy, ChevronRight, LayoutGrid } from 'lucide-react';

export const LimitUpLadder: React.FC<{
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
      const data = await fetchLimitUpLadder(settings.geminiKey);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "梯队扫描失败，请检查网络或 API 配置");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToStock = (code: string, name: string) => {
    navigate(`/stock?q=${encodeURIComponent(code + " " + name)}`);
  };

  const ladderData = result?.limitUpLadderData;

  const getSentimentStyle = (sentiment: string) => {
    switch (sentiment) {
      case 'Climax': return 'bg-rose-500 text-white';
      case 'Rising': return 'bg-emerald-500 text-white';
      case 'Diverging': return 'bg-amber-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      {/* Search Header */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 md:p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 mb-2">
                <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl text-white shadow-xl shadow-indigo-100">
                  <Network className="w-8 h-8" />
                </div>
                涨停题材梯队审计 (Ladder Audit)
              </h2>
              <p className="text-slate-500 text-base max-w-2xl font-medium">
                AI 实时扫描全市场涨停标的，按 **题材板块** 深度聚合。识别 5-3-2-1 **梯队完整度**，锁定绝对主线。
              </p>
            </div>
            
            <button 
              onClick={handleScan}
              disabled={loading}
              className="px-10 h-16 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Rocket className="w-6 h-6" />}
              {loading ? `全市场梯队审计中 (${elapsed}s)...` : '今日涨停梯队全扫描'}
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-xs font-black">
              <Layers className="w-4 h-4" /> 题材分类 (大类+细分)
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-black">
              <Trophy className="w-4 h-4" /> 梯队完整度判研
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs font-black">
              <Crown className="w-4 h-4" /> 自动锁定灵魂龙头
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 flex items-center gap-4 shadow-sm animate-fade-in">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {ladderData && (
        <div className="space-y-10 animate-slide-up">
          {/* Market Conclusion Banner */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl border-t-8 border-indigo-600 relative overflow-hidden">
             <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none"></div>
             <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                <div className="flex-1">
                   <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">全市场涨停审计 · 核心研判 (${ladderData.scan_time})</div>
                   <p className="text-xl font-black italic leading-relaxed text-slate-200">"{ladderData.market_conclusion}"</p>
                </div>
                <div className="text-center bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 w-40">
                   <div className="text-4xl font-black mb-1">{ladderData.total_limit_ups}</div>
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">今日涨停总数</div>
                </div>
             </div>
          </div>

          {/* Sector Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {ladderData.sectors.map((sector, idx) => (
              <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl transition-all flex flex-col">
                <div className="p-8 pb-4">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${sector.sector_type === 'Main' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {sector.sector_type === 'Main' ? '核心题材' : '子项支线'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${getSentimentStyle(sector.market_sentiment)}`}>
                          {sector.market_sentiment}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-slate-800">{sector.sector_name}</h3>
                    </div>
                    <div className="text-right">
                       <div className="text-3xl font-black text-indigo-600 tracking-tighter">{sector.total_count}只</div>
                       <div className="text-[10px] font-bold text-slate-400">板块涨停家数</div>
                    </div>
                  </div>

                  {/* Dragon Leader Highlight */}
                  <div className="bg-slate-900 rounded-3xl p-6 text-white mb-8 relative overflow-hidden shadow-xl border-b-4 border-amber-500">
                    <div className="absolute right-0 top-0 p-4 opacity-10">
                      <Crown className="w-16 h-16 text-amber-400" />
                    </div>
                    <div className="flex justify-between items-center mb-4">
                       <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest">
                          <Crown className="w-4 h-4" /> 灵魂龙头 (Dragon)
                       </div>
                       <div className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-full">强度: {sector.dragon_leader.strength_score}</div>
                    </div>
                    <div className="flex justify-between items-end">
                       <div onClick={() => handleNavigateToStock(sector.dragon_leader.code, sector.dragon_leader.name)} className="cursor-pointer group">
                          <div className="text-2xl font-black group-hover:text-amber-400 transition-colors">{sector.dragon_leader.name}</div>
                          <div className="text-xs font-mono text-slate-400">{sector.dragon_leader.code}</div>
                       </div>
                       <div className="text-right">
                          <div className="text-3xl font-black text-rose-500">{sector.dragon_leader.consecutive_days}连板</div>
                          <div className="text-[10px] font-bold text-slate-500 italic">"{sector.dragon_leader.reason}"</div>
                       </div>
                    </div>
                  </div>

                  {/* Ladder Matrix Visualization */}
                  <div className="space-y-4 mb-8">
                     <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5" /> 梯队矩阵 (Ladder Matrix)
                        </span>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-slate-500">梯队完整度</span>
                           <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{width: `${sector.integrity_score}%`}}></div>
                           </div>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 gap-2">
                        {sector.ladder_matrix.sort((a, b) => b.height - a.height).map((row, rIdx) => (
                          <div key={rIdx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4 hover:bg-slate-100 transition-all">
                             <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black shadow-sm ${row.height > 1 ? 'bg-rose-500 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                <div className="text-lg">{row.height}</div>
                                <div className="text-[8px] uppercase -mt-1">Board</div>
                             </div>
                             <div className="flex-1">
                                <div className="flex flex-wrap gap-2">
                                   {row.stocks.map((s, si) => (
                                      <span key={si} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-indigo-400 transition-colors cursor-help" title={s.logic}>
                                        {s.name}
                                      </span>
                                   ))}
                                </div>
                             </div>
                             <div className="text-right shrink-0">
                                <div className="text-xs font-black text-slate-400">{row.count}只</div>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Guidelines Footer */}
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center py-10">
             <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-slate-200 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                <Flame className="w-4 h-4 text-rose-500" /> 梯队完整 (5-3-2-1)：说明板块具备中线主线潜力
             </div>
             <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-slate-200 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                <Star className="w-4 h-4 text-amber-500" /> 灵魂龙头：梯队顶端、具备极强情绪带动力的标的
             </div>
             <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-slate-200 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                <Info className="w-4 h-4 text-indigo-500" /> 细分切换：当老题材退潮，需关注新梯队的萌芽
             </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200">
           <LayoutGrid className="w-20 h-20 text-indigo-100 mb-8" />
           <p className="text-slate-400 font-black text-2xl tracking-tight">扫描全市场，研判题材梯队</p>
           <p className="text-slate-300 text-sm mt-4 max-w-md mx-auto leading-relaxed">
              AI 将全网搜索今日涨停标的，为您智能归类板块并拆解梯队结构，识别真正的 **强势主线** 与 **市场龙头**。
           </p>
        </div>
      )}
    </div>
  );
};
