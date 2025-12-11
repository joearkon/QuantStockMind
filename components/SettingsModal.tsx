

import React, { useState, useEffect } from 'react';
import { X, Save, Key, Info } from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [hunyuanKey, setHunyuanKey] = useState(settings.hunyuanKey || '');
  const [geminiKey, setGeminiKey] = useState(settings.geminiKey || '');
  const [aliyunKey, setAliyunKey] = useState(settings.aliyunKey || '');

  useEffect(() => {
    if (isOpen) {
      setHunyuanKey(settings.hunyuanKey || '');
      setGeminiKey(settings.geminiKey || '');
      setAliyunKey(settings.aliyunKey || '');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      hunyuanKey: hunyuanKey.trim() || undefined,
      geminiKey: geminiKey.trim() || undefined,
      aliyunKey: aliyunKey.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            模型 API 配置
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="p-3 bg-blue-50 text-blue-700 text-xs leading-relaxed rounded-lg border border-blue-100 flex gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">环境变量配置说明</p>
              <p>为了安全起见，前端应用通常只读取以 <code>VITE_</code> 开头的环境变量。</p>
              <p className="mt-1">请在 EdgeOne, Vercel 或 Cloudflare 中配置:</p>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                <li><code>VITE_GEMINI_API_KEY</code></li>
                <li><code>VITE_HUNYUAN_API_KEY</code></li>
                <li><code>VITE_ALIYUN_API_KEY</code></li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            {/* Gemini Key */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Google Gemini API Key
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder={settings.geminiKey ? "已从环境加载 (可覆盖)" : "AIzaSy..."}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-mono"
              />
            </div>

            {/* Aliyun Key */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                阿里云通义千问 API Key
              </label>
              <input
                type="password"
                value={aliyunKey}
                onChange={(e) => setAliyunKey(e.target.value)}
                placeholder={settings.aliyunKey ? "已从环境加载 (可覆盖)" : "sk-..."}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-mono"
              />
            </div>

            {/* Hunyuan Key */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                腾讯混元 API Key
              </label>
              <input
                type="password"
                value={hunyuanKey}
                onChange={(e) => setHunyuanKey(e.target.value)}
                placeholder={settings.hunyuanKey ? "已从环境加载 (可覆盖)" : "SecretId / Key..."}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-mono"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
};