

export enum ModelProvider {
  GEMINI_INTL = 'Gemini 3 (海外版)',
  HUNYUAN_CN = '混元大模型 (国内版)',
}

export enum MarketType {
  CN = 'CN', // A-Share
  HK = 'HK', // Hong Kong
  US = 'US', // US Stocks
}

export enum AnalysisType {
  MARKET_MACRO = 'MARKET_MACRO',
  STOCK_INDIVIDUAL = 'STOCK_INDIVIDUAL',
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface AnalysisResult {
  content: string; // Markdown formatted text or JSON string
  groundingSource?: GroundingSource[];
  timestamp: number;
  modelUsed: ModelProvider;
  isStructured?: boolean;
  structuredData?: MarketDashboardData;
  // Generic field for other structured types
  opportunityData?: OpportunityResponse; 
  market?: MarketType;
}

export interface MarketIndex {
  name: string;
  value: string;
  change: string;
  direction: 'up' | 'down';
}

export interface PortfolioItem {
  name: string;
  code: string;
  volume: string; // e.g. "800股" or "约2000元"
  weight: string; // e.g. "34%"
  logic_tag: string; // e.g. "New Productive Forces"
}

export interface AllocationModel {
  strategy_name: string;
  description: string;
  action_plan: string[]; // Step by step instructions
  portfolio_table: PortfolioItem[];
  core_advantage: string;
}

export interface MarketDashboardData {
  market_indices?: MarketIndex[];
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
  };
  deep_logic: {
    policy_driver: string;
    external_environment: string;
    market_valuation: string;
  };
  hot_topics: string[];
  
  // New Strategy Fields
  opportunity_analysis: {
    defensive_value: {
      logic: string;
      sectors: string[];
    };
    tech_growth: {
      logic: string;
      sectors: string[];
    };
  };
  strategist_verdict: string;
  allocation_model: {
    aggressive: AllocationModel;
    balanced: AllocationModel;
  };
}

// --- New Types for Holdings Review ---

export interface HoldingItemDetailed {
  name: string;
  code: string;
  volume: number;      // 持仓股数
  costPrice: number;   // 成本价
  currentPrice: number;// 现价
  profit: number;      // 浮动盈亏
  profitRate: string;  // 盈亏比例 (e.g. "+15%")
  marketValue: number; // 持仓市值
  horizon?: 'short' | 'medium' | 'long'; // New: Investment Horizon
}

export interface HoldingsSnapshot {
  totalAssets: number;
  date: string;
  holdings: HoldingItemDetailed[];
}

export interface JournalEntry {
  id: string;
  timestamp: number;
  snapshot: HoldingsSnapshot;
  analysis: AnalysisResult | null;
  note?: string; // User manual notes
}

export interface StockQuery {
  code: string;
  name: string;
}

export interface UserSettings {
  hunyuanKey?: string;
  geminiKey?: string;
}

// --- New Types for Opportunity Mining (Short-term Wizard) ---

export interface OpportunityStock {
  name: string;
  code: string;
  current_price: string;
  logic: string;
}

export interface OpportunityItem {
  sector_name: string;
  reason_seasonality: string; // e.g. "Historically in Dec, Consumer rises 80% of the time"
  reason_fund_flow: string;   // e.g. "Main force net inflow 3 days, price stagnant"
  avoid_reason: string;       // Why is this NOT a hyped sector?
  representative_stocks: OpportunityStock[];
}

export interface OpportunityResponse {
  month: string;
  market_phase: string; // e.g. "Year-end Window Dressing" or "Spring Festival Layout"
  opportunities: OpportunityItem[];
}

// Global definition for injected variables from Cloudflare Worker
declare global {
  interface Window {
    __ENV__?: {
      VITE_GEMINI_API_KEY?: string;
      VITE_HUNYUAN_API_KEY?: string;
      [key: string]: string | undefined;
    };
  }
}