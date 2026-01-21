
import React, { useState } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Disclaimer } from './components/Disclaimer';
import { MarketAnalysis } from './components/MarketAnalysis';
import { StockAnalysis } from './components/StockAnalysis';
import { InstitutionalHotlist } from './components/InstitutionalHotlist';
import { HoldingsReview } from './components/HoldingsReview';
import { OpportunityMining } from './components/OpportunityMining';
import { SectorCycleAnalysis } from './components/SectorCycleAnalysis'; 
import { BatchTimingAnalysis } from './components/BatchTimingAnalysis';
import { KLineMaster } from './components/KLineMaster';
import { MainBoardMaster } from './components/MainBoardMaster';
import { LimitUpLadder } from './components/LimitUpLadder';
import { SynergyAudit } from './components/SynergyAudit'; // NEW
import { SettingsModal } from './components/SettingsModal';
import { APP_NAME, MODEL_OPTIONS, NAV_ITEMS, MARKET_OPTIONS, APP_VERSION } from './constants';
import { ModelProvider, UserSettings, AnalysisResult, MarketType } from './types';
import { Settings, BrainCircuit, Globe, FlaskConical } from 'lucide-react';

const App: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<ModelProvider>(ModelProvider.GEMINI_INTL);
  const [selectedMarket, setSelectedMarket] = useState<MarketType>(MarketType.CN);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [marketResult, setMarketResult] = useState<AnalysisResult | null>(null);
  const [marketPeriod, setMarketPeriod] = useState<'day' | 'month'>('day');

  const [stockResult, setStockResult] = useState<AnalysisResult | null>(null);
  const [stockQuery, setStockQuery] = useState('');

  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('quantmind_settings');
    let parsed: UserSettings = {};
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    const injectedEnv = (window as any).__ENV__ || {};
    return {
      hunyuanKey: parsed.hunyuanKey || injectedEnv.VITE_HUNYUAN_API_KEY || "",
      geminiKey: parsed.geminiKey || injectedEnv.VITE_GEMINI_API_KEY || "",
    };
  });

  const handleSaveSettings = (newSettings: UserSettings) => {
    setUserSettings(newSettings);
    localStorage.setItem('quantmind_settings', JSON.stringify(newSettings));
  };

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                   <BrainCircuit className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600 hidden sm:block">
                  {APP_NAME}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                   {MARKET_OPTIONS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setSelectedMarket(m.value)}
                        className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                          selectedMarket === m.value 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {m.short}
                      </button>
                   ))}
                </div>

                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as ModelProvider)}
                  className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg p-2 outline-none"
                >
                  {MODEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <aside className="lg:col-span-3">
              <nav className="space-y-2 sticky top-24">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.id}
                    to={`/${item.id}`}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl transition-all duration-200 ${
                        isActive ? 'bg-white text-indigo-600 shadow-md border border-slate-100 scale-105' : 'text-slate-500 hover:bg-white hover:text-slate-900'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </aside>

            <div className="lg:col-span-9">
              <Disclaimer />
              <Routes>
                <Route path="/" element={<Navigate to="/market" replace />} />
                <Route path="/market" element={<MarketAnalysis currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} savedResult={marketResult} onResultUpdate={setMarketResult} savedPeriod={marketPeriod} onPeriodUpdate={setMarketPeriod} />} />
                <Route path="/synergy" element={<SynergyAudit currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} onOpenSettings={() => setIsSettingsOpen(true)} />} />
                <Route path="/holdings" element={<HoldingsReview currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} onOpenSettings={() => setIsSettingsOpen(true)} />} />
                <Route path="/sector-cycle" element={<SectorCycleAnalysis currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} onOpenSettings={() => setIsSettingsOpen(true)} />} />
                <Route path="/batch-timing" element={<BatchTimingAnalysis currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} onOpenSettings={() => setIsSettingsOpen(true)} />} />
                <Route path="/kline-master" element={<KLineMaster currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} onOpenSettings={() => setIsSettingsOpen(true)} />} />
                <Route path="/main-board-master" element={<MainBoardMaster currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} onOpenSettings={() => setIsSettingsOpen(true)} />} />
                <Route path="/limit-up-ladder" element={<LimitUpLadder currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} onOpenSettings={() => setIsSettingsOpen(true)} />} />
                <Route path="/stock" element={<StockAnalysis currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} savedResult={stockResult} onResultUpdate={setStockResult} savedQuery={stockQuery} onQueryUpdate={setStockQuery} />} />
                <Route path="/vane" element={<InstitutionalHotlist currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} />} />
                <Route path="/mining" element={<OpportunityMining currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} onOpenSettings={() => setIsSettingsOpen(true)} />} />
              </Routes>
              
              <footer className="mt-12 border-t border-slate-200 pt-6 text-center text-slate-400 text-sm pb-8">
                 <p className="flex items-center justify-center gap-2">
                   <span>&copy; {new Date().getFullYear()} QuantMind</span>
                   <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-mono">{APP_VERSION}</span>
                 </p>
                 <div className="flex items-center justify-center gap-2 mt-2">
                    <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-medium text-slate-500">陈子卓野 实验室</span>
                    <span className="text-slate-300">|</span>
                    <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="hover:text-slate-600">沪ICP备2025153381号</a>
                 </div>
              </footer>
            </div>
          </div>
        </main>
        
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={userSettings} onSave={handleSaveSettings} />
      </div>
    </HashRouter>
  );
};

export default App;
