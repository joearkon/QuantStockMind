import React, { useState, useEffect } from 'react';
import { X, Save, Key } from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [deepSeekKey, setDeepSeekKey] = useState(settings.deepSeekKey || '');
  const [hunyuanKey, setHunyuanKey] = useState(settings.hunyuanKey || '');

  useEffect(() => {
    if (isOpen) {
      setDeepSeekKey(settings.deepSeekKey || '');
      setHunyuanKey(settings.hunyuanKey || '');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      deepSeekKey: deepSeekKey.trim() || undefined,
      hunyuanKey: hunyuanKey.trim() || undefined,
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
          <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-100">
            配置您的私有 API Key 以启用国内大模型。Key 仅保存在本地浏览器中。
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                DeepSeek API Key
              </label>
              <input
                type="password"
                value={deepSeekKey}
                onChange={(e) => setDeepSeekKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                腾讯混元 API Key
              </label>
              <input
                type="password"
                value={hunyuanKey}
                onChange={(e) => setHunyuanKey(e.target.value)}
                placeholder="SecretId / Key..."
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