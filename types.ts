

export enum ModelProvider {
  GEMINI_INTL = 'Gemini 3 (海外版)',
  HUNYUAN_CN = '混元大模型 (国内版)',
}

export enum MarketType {
  CN = 'CN', // A-Share
  HK = 'HK', // Hong Kong
  US = 'US', // US Stocks
}

export interface MarketDashboardData {
  data_date?: string; 
  market_indices?: MarketIndex[];
  market_volume?: MarketVolumeData;
  market_sentiment: {
    score: number;
    summary: string;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  capital_rotation: {
    inflow_sectors: string[];
    inflow_reason: string;
    outflow_sectors: string[];
    outflow_reason: string;
    top_inflow_stocks?: string[]; // 增加流入前5个股
  };
  institutional_signals?: {
    dragon_tiger_summary: string;
    lh_top_10?: { name: string; net_buy: string; logic: string }[]; // 龙虎榜 Top 10
    block_trade_activity: string;
    active_money_flow_trend: string;
  };
  deep_logic?: {
    policy_driver: string;
    external_environment: string;
    market_valuation: string;
  };
  hot_topics?: string[];
  allocation_model?: any;
}

export interface MarketIndex {
  name: string;
  value: string;
  change: string;
  direction: 'up' | 'down';
}

export interface MarketVolumeData {
  total_volume: string;     
  volume_delta: string;     
  volume_trend: 'expansion' | 'contraction' | 'flat'; 
  net_inflow: string;       
  capital_mood: string;
  active_buy_spread?: string; 
}

export interface AnalysisResult {
  content: string; 
  groundingSource?: GroundingSource[];
  timestamp: number;
  modelUsed: ModelProvider;
  isStructured?: boolean;
  structuredData?: MarketDashboardData;
  market?: MarketType;
  periodicData?: any;
  historyData?: any;
  // Added domain specific data properties to fix TS errors
  opportunityData?: any;
  foresightData?: any;
  institutionalData?: any;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface UserSettings {
  hunyuanKey?: string;
  geminiKey?: string;
}

export interface JournalEntry {
  id: string;
  timestamp: number;
  snapshot: any;
  analysis: any;
  note?: string; 
}

export interface PlanItem {
  id: string;
  symbol: string; 
  action: 'buy' | 'sell' | 'hold' | 'monitor' | 't_trade'; 
  price_target?: string;
  reason?: string;
  status: 'pending' | 'completed' | 'skipped' | 'failed';
}

export interface DailyTradingPlan {
  id: string;
  target_date: string; 
  created_at: number;
  items: PlanItem[];
  strategy_summary: string; 
}

export interface HoldingsSnapshot {
  totalAssets: number;
  positionRatio?: number; 
  date: string;
  holdings: any[];
}

// Fixed missing exports reported in errors
export interface HistoricalYearData {
  year: number;
  performance: string;
}

export interface PeriodicReviewData {
  score: number;
  market_trend: 'bull' | 'bear' | 'sideways';
  market_summary: string;
  highlight: { title: string; description: string };
  lowlight: { title: string; description: string };
  execution: {
    score: number;
    details: string;
    good_behaviors: string[];
    bad_behaviors: string[];
  };
  next_period_focus: string[];
}

export interface HoldingItemDetailed {
  name: string;
  code: string;
  volume: number;
  costPrice: number;
  currentPrice: number;
  profit: number;
  profitRate: string;
  marketValue: number;
  horizon?: 'short' | 'medium' | 'long';
}

export interface OpportunityResponse {
  policy_theme: string;
  analysis_summary: string;
  supply_chain_matrix?: any[];
  deployment_plan?: any;
}

export interface ForesightReport {
  monthly_focus: string;
  catalysts: any[];
  rotation_warning: string;
  macro_policy_insight: string;
}

export interface InstitutionalInsight {
  market_heat_summary: string;
  top_surveyed_sectors: any[];
  key_institution_views: any[];
  smart_money_trends: any[];
  detailed_signals?: {
    lh_list: string;
    block_trades: string;
    spread_trend: string;
  };
}
