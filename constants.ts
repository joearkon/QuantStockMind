
import { ModelProvider, MarketType } from './types';
import { LayoutDashboard, TrendingUp, NotebookPen, Radar, UserCheck, Layers, ListChecks, ScanEye, Gavel, Network, Zap, UsersRound, Target } from 'lucide-react';

export const APP_NAME = "QuantMind A-Share Assistant";
export const APP_VERSION = "v1.13.0";

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
  { id: 'holdings', label: '持仓复盘', icon: NotebookPen },
  { id: 'stock', label: '个股量化', icon: TrendingUp },
  { id: 'synergy', label: '标的合力审计', icon: UsersRound }, 
  { id: 'limit-up-ladder', label: '涨停题材梯队审计', icon: Network },
  { id: 'main-board-master', label: '沪深主板涨停', icon: Gavel },
  { id: 'pattern-hunter', label: '二三梯队·地量猎手', icon: Target },
  { id: 'dragon-signal', label: '龙脉信号审计', icon: Zap },
  { id: 'kline-master', label: '双创涨停扫描', icon: ScanEye },
  { id: 'sector-cycle', label: '板块梯队周期', icon: Layers },
  { id: 'batch-timing', label: '多股择时打分', icon: ListChecks },
  { id: 'vane', label: '机构风向标', icon: UserCheck },
  { id: 'mining', label: '产业链透视', icon: Radar },
];

export const MOCK_FUND_FLOW_DATA = [
  { name: '半导体', value: 45, type: 'in' },
  { name: '计算机', value: 32, type: 'in' },
  { name: '证券', value: 28, type: 'in' },
  { name: '白酒', value: -15, type: 'out' },
  { name: '医药', value: -22, type: 'out' },
];
