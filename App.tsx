
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Disclaimer } from './components/Disclaimer';
import { MarketAnalysis } from './components/MarketAnalysis';
import { StockAnalysis } from './components/StockAnalysis';
import { SettingsModal } from './components/SettingsModal';
import { APP_NAME, MODEL_OPTIONS, NAV_ITEMS } from './constants';
import { ModelProvider, UserSettings } from './types';
import { Settings, BrainCircuit } from 'lucide-react';

const App: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<ModelProvider>(ModelProvider.GEMINI_INTL);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
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

    // Support both standard and VITE_ prefixed variables for better compatibility
    const envDeepSeek = process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY;
    const envHunyuan = process.env.HUNYUAN_API_KEY || process.env.VITE_HUNYUAN_API_KEY;

    return {
      deepSeekKey: parsed.deepSeekKey || envDeepSeek,
      hunyuanKey: parsed.hunyuanKey || envHunyuan,
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
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
                  {APP_NAME}
                </span>
              </div>
              
              {/* Model Selector & Settings */}
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
                    <BrainCircuit className="w-4 h-4" />
                    <span>模型:</span>
                </div>
                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as ModelProvider)}
                  className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none min-w-[160px]"
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
                   <p className="font-semibold mb-2">关于模型适配</p>
                   {selectedModel === ModelProvider.GEMINI_INTL 
                     ? "当前使用 Google Gemini 2.5。若需使用 DeepSeek 或 混元，请在右上角设置中配置 API Key。"
                     : "当前选择国内模型。请确保已在设置中填入对应的 API Key 以启用分析。"}
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
                        settings={userSettings} 
                        onOpenSettings={() => setIsSettingsOpen(true)}
                      />
                    } 
                  />
                  <Route 
                    path="/stock" 
                    element={
                      <StockAnalysis 
                        currentModel={selectedModel} 
                        settings={userSettings}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                      />
                    } 
                  />
                </Routes>
              </div>
              
              <footer className="mt-12 border-t border-slate-200 pt-6 text-center text-slate-400 text-sm">
                 <p>&copy; {new Date().getFullYear()} QuantMind. Powered by Google Gemini 2.5 & Multi-LLM.</p>
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
