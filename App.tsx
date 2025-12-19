
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Disclaimer } from './components/Disclaimer';
import { MarketAnalysis } from './components/MarketAnalysis';
import { StockAnalysis } from './components/StockAnalysis';
import { HoldingsReview } from './components/HoldingsReview';
import { OpportunityMining } from './components/OpportunityMining';
import { MacroForecaster } from './components/MacroForecaster'; 
import { SettingsModal } from './components/SettingsModal';
import { APP_NAME, MODEL_OPTIONS, NAV_ITEMS, MARKET_OPTIONS } from './constants';
import { ModelProvider, UserSettings, AnalysisResult, MarketType } from './types';
import { Settings, BrainCircuit } from 'lucide-react';

// 立即同步 API Key 的辅助函数
const syncApiKey = (settings: UserSettings) => {
  const geminiKey = settings.geminiKey || (window as any).__ENV__?.VITE_GEMINI_API_KEY;
  if (geminiKey) {
    if (!window.process) window.process = { env: {} };
    else if (!window.process.env) window.process.env = {};
    window.process.env.API_KEY = geminiKey;
  }
};

const App: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<ModelProvider>(ModelProvider.GEMINI_INTL);
  const [selectedMarket, setSelectedMarket] = useState<MarketType>(MarketType.CN);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [marketResult, setMarketResult] = useState<AnalysisResult | null>(null);
  const [marketPeriod, setMarketPeriod] = useState<'day' | 'month'>('day');
  const [stockResult, setStockResult] = useState<AnalysisResult | null>(null);
  const [stockQuery, setStockQuery] = useState('');

  // 1. 初始化时立即读取并挂载 Key
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('quantmind_settings');
    const settings = saved ? JSON.parse(saved) : {};
    syncApiKey(settings); // 立即同步
    return settings;
  });

  // 2. 监听设置变化实时同步
  useEffect(() => {
    syncApiKey(userSettings);
  }, [userSettings]);

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
                <div className="bg-blue-600 p-2 rounded-lg"><BrainCircuit className="w-6 h-6 text-white" /></div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600 hidden sm:block">{APP_NAME}</span>
                <span className="text-xl font-bold text-blue-700 sm:hidden">QM</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                   {MARKET_OPTIONS.map((m) => (
                      <button key={m.value} onClick={() => setSelectedMarket(m.value)} className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${selectedMarket === m.value ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{m.short}</button>
                   ))}
                </div>
                <div className="h-6 w-px bg-slate-300 mx-1 hidden md:block"></div>
                <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value as ModelProvider)} className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg block p-2 outline-none max-w-[120px] sm:max-w-none">
                  {MODEL_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"><Settings className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <aside className="lg:col-span-3">
              <nav className="space-y-2 sticky top-24">
                {NAV_ITEMS.map((item) => (
                  <NavLink key={item.id} to={`/${item.id}`} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${isActive ? 'bg-white text-blue-600 shadow-md border border-slate-100' : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'}`}>
                    <item.icon className="w-5 h-5" />{item.label}
                  </NavLink>
                ))}
              </nav>
            </aside>

            <div className="lg:col-span-9">
              <Disclaimer />
              <div className="min-h-[500px]">
                <Routes>
                  <Route path="/" element={<Navigate to="/market" replace />} />
                  <Route path="/market" element={<MarketAnalysis currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} onOpenSettings={() => setIsSettingsOpen(true)} savedResult={marketResult} onResultUpdate={setMarketResult} savedPeriod={marketPeriod} onPeriodUpdate={setMarketPeriod} />} />
                  <Route path="/stock" element={<StockAnalysis currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} onOpenSettings={() => setIsSettingsOpen(true)} savedResult={stockResult} onResultUpdate={setStockResult} savedQuery={stockQuery} onQueryUpdate={setStockQuery} />} />
                  <Route path="/mining" element={<OpportunityMining currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} onOpenSettings={() => setIsSettingsOpen(true)} />} />
                  <Route path="/forecaster" element={<MacroForecaster currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} onOpenSettings={() => setIsSettingsOpen(true)} />} />
                  <Route path="/holdings" element={<HoldingsReview currentModel={selectedModel} currentMarket={selectedMarket} settings={userSettings} onOpenSettings={() => setIsSettingsOpen(true)} />} />
                </Routes>
              </div>
            </div>
          </div>
        </main>
        
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={userSettings} onSave={handleSaveSettings} />
      </div>
    </HashRouter>
  );
};

export default App;
