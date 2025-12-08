
import React, { useState } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Disclaimer } from './components/Disclaimer';
import { MarketAnalysis } from './components/MarketAnalysis';
import { StockAnalysis } from './components/StockAnalysis';
import { SettingsModal } from './components/SettingsModal';
import { APP_NAME, MODEL_OPTIONS, NAV_ITEMS, MARKET_OPTIONS } from './constants';
import { ModelProvider, UserSettings, AnalysisResult, MarketType } from './types';
import { Settings, BrainCircuit, Globe, FlaskConical } from 'lucide-react';

const App: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<ModelProvider>(ModelProvider.GEMINI_INTL);
  const [selectedMarket, setSelectedMarket] = useState<MarketType>(MarketType.CN);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // -- Global State for Persistence --
  // Market Analysis State
  const [marketResult, setMarketResult] = useState<AnalysisResult | null>(null);
  const [marketPeriod, setMarketPeriod] = useState<'day' | 'month'>('day');

  // Stock Analysis State
  const [stockResult, setStockResult] = useState<AnalysisResult | null>(null);
  const [stockQuery, setStockQuery] = useState('');

  // Initialize settings with environment variables or local storage
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

    // Cloudflare Worker Injected Variables
    const injectedEnv = window.__ENV__ || {};

    // Check Hunyuan Env Vars (Priority: Injected -> Vite Env -> Process Env)
    const hunyuanKey = 
      injectedEnv.VITE_HUNYUAN_API_KEY ||
      // @ts-ignore
      import.meta.env?.VITE_HUNYUAN_API_KEY || 
      // @ts-ignore
      import.meta.env?.HUNYUAN_API_KEY ||
      process.env.VITE_HUNYUAN_API_KEY || 
      process.env.HUNYUAN_API_KEY;

    // Check Gemini Env Vars (Priority: Injected -> Vite Env -> Process Env)
    const geminiKey = 
      injectedEnv.VITE_GEMINI_API_KEY ||
      // @ts-ignore
      import.meta.env?.VITE_GEMINI_API_KEY ||
      // @ts-ignore
      import.meta.env?.VITE_API_KEY || // Common fallback
      // @ts-ignore
      import.meta.env?.API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.VITE_API_KEY ||
      process.env.API_KEY;

    return {
      hunyuanKey: parsed.hunyuanKey || hunyuanKey,
      geminiKey: parsed.geminiKey || geminiKey,
    };
  });

  const handleSaveSettings = (newSettings: UserSettings) => {
    setUserSettings(newSettings);
    localStorage.setItem('quantmind_settings', JSON.stringify(newSettings));
  };

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        {/* Header */}
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
                <span className="text-xl font-bold text-blue-700 sm:hidden">QM</span>
              </div>
              
              {/* Controls */}
              <div className="flex items-center gap-3">
                
                {/* Market Selector */}
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

                <div className="h-6 w-px bg-slate-300 mx-1 hidden md:block"></div>

                {/* Model Selector */}
                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as ModelProvider)}
                  className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none max-w-[120px] sm:max-w-none"
                >
                  {MODEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="API Key 设置"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-3">
              <nav className="space-y-2 sticky top-24">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.id}
                    to={`/${item.id}`}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-white text-blue-600 shadow-md border border-slate-100'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </NavLink>
                ))}
                
                <div className="mt-8 p-4 bg-slate-100 rounded-xl text-xs text-slate-500 leading-relaxed">
                   <div className="flex items-center gap-2 mb-2 font-semibold text-slate-700">
                      <Globe className="w-3 h-3" />
                      当前市场: {MARKET_OPTIONS.find(m => m.value === selectedMarket)?.label}
                   </div>
                   <p className="mb-2">
                     {selectedMarket === MarketType.CN && "聚焦沪深京A股市场，包含科创板与创业板。"}
                     {selectedMarket === MarketType.HK && "覆盖港股主板、恒生科技指数及南向资金动向。"}
                     {selectedMarket === MarketType.US && "覆盖美股三大指数(道指/纳指/标普)及中概股。"}
                   </p>
                   <div className="h-px bg-slate-200 my-2"></div>
                   <p>
                     {selectedModel === ModelProvider.GEMINI_INTL 
                       ? "Gemini 2.5 具备全球联网能力，适合所有市场分析。"
                       : "混元模型对国内市场(A/H)理解较深，美股分析可能依赖搜索增强。"}
                   </p>
                </div>
              </nav>
            </aside>

            {/* Content Area */}
            <div className="lg:col-span-9">
              <Disclaimer />
              <div className="min-h-[500px]">
                <Routes>
                  <Route path="/" element={<Navigate to="/market" replace />} />
                  <Route 
                    path="/market" 
                    element={
                      <MarketAnalysis 
                        currentModel={selectedModel} 
                        currentMarket={selectedMarket}
                        settings={userSettings} 
                        onOpenSettings={() => setIsSettingsOpen(true)}
                        savedResult={marketResult}
                        onResultUpdate={setMarketResult}
                        savedPeriod={marketPeriod}
                        onPeriodUpdate={setMarketPeriod}
                      />
                    } 
                  />
                  <Route 
                    path="/stock" 
                    element={
                      <StockAnalysis 
                        currentModel={selectedModel} 
                        currentMarket={selectedMarket}
                        settings={userSettings}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                        savedResult={stockResult}
                        onResultUpdate={setStockResult}
                        savedQuery={stockQuery}
                        onQueryUpdate={setStockQuery}
                      />
                    } 
                  />
                </Routes>
              </div>
              
              <footer className="mt-12 border-t border-slate-200 pt-6 text-center text-slate-400 text-sm pb-8">
                 <p className="mb-2">&copy; {new Date().getFullYear()} QuantMind. Powered by Google Gemini 2.5 & Multi-LLM.</p>
                 <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 group cursor-default">
                       <div className="p-1 bg-indigo-50 rounded-full border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                         <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
                       </div>
                       <span className="font-medium text-slate-500 group-hover:text-indigo-700 transition-colors">陈子卓野 实验室</span>
                    </div>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="hover:text-slate-600 transition-colors">
                      沪ICP备2025153381号
                    </a>
                 </div>
              </footer>
            </div>
          </div>
        </main>
        
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)}
          settings={userSettings}
          onSave={handleSaveSettings}
        />
      </div>
    </HashRouter>
  );
};

export default App;
