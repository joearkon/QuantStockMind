
import React, { useState } from 'react';
import { X, Key, Info, ShieldCheck, Cpu } from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [hunyuanKey, setHunyuanKey] = useState(settings.hunyuanKey || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      hunyuanKey,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            模型配置中心
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Gemini 说明 (自动) */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
             <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-2">
                <ShieldCheck className="w-4 h-4" /> Gemini 3 (海外版)
             </div>
             <p className="text-xs text-blue-600 leading-relaxed">
                该模型密钥已通过系统环境变量 (process.env.API_KEY) **自动托管**，您无需进行任何配置即可直接使用。
             </p>
             <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase">已就绪 (Auto Ready)</span>
             </div>
          </div>

          {/* Hunyuan 配置 (手动) */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                <Cpu className="w-4 h-4 text-indigo-600" /> 腾讯混元 (国内版)
             </div>
             <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500">Hunyuan API Key</label>
                <input
                  type="password"
                  value={hunyuanKey}
                  onChange={(e) => setHunyuanKey(e.target.value)}
                  placeholder="输入您的混元 API 密钥..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <p className="text-[10px] text-slate-400 italic">
                  国内用户建议配置混元模型以获得更稳定的网络连接。
                </p>
             </div>
          </div>

          <div className="p-3 bg-amber-50 text-amber-700 text-[11px] leading-relaxed rounded-lg border border-amber-100 flex gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              密钥将保存在您的浏览器本地缓存中。我们不会在服务器端存储您的任何私密信息。
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-md"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
};
