

import { ModelProvider, MarketType } from './types';
import { LayoutDashboard, TrendingUp, NotebookPen } from 'lucide-react';

export const APP_NAME = "QuantMind A-Share Assistant";
export const APP_VERSION = "v1.1.5";

export const MODEL_OPTIONS = [
  { value: ModelProvider.GEMINI_INTL, label: 'Gemini 3 (海外版)', recommended: true, region: 'Global' },
  { value: ModelProvider.HUNYUAN_CN, label: '腾讯混元 (国内版)', recommended: false, region: 'CN' },
];

export const MARKET_OPTIONS = [
  { value: MarketType.CN, label: '🇨🇳 A股市场', short: 'A股' },
  { value: MarketType.HK, label: '🇭🇰 港股市场', short: '港股' },
  { value: MarketType.US, label: '🇺🇸 美股市场', short: '美股' },
];

export const NAV_ITEMS = [
  { id: 'market', label: '市场全览', icon: LayoutDashboard },
  { id: 'stock', label: '个股量化', icon: TrendingUp },
  { id: 'holdings', label: '持仓复盘', icon: NotebookPen },
];

// Mock data for visualizations since we don't have a real DB
export const MOCK_FUND_FLOW_DATA = [
  { name: '半导体', value: 45, type: 'in' },
  { name: '计算机', value: 32, type: 'in' },
  { name: '证券', value: 28, type: 'in' },
  { name: '白酒', value: -15, type: 'out' },
  { name: '医药', value: -22, type: 'out' },
];