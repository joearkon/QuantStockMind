
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
  market?: MarketType;
}

export interface MarketIndex {
  name: string;
  value: string;
  change: string;
  direction: 'up' | 'down';
}

export interface AllocationModel {
  description: string;
  allocation: {
    equity_growth: number; // Percentage
    equity_value: number; // Percentage
    bonds_cash: number; // Percentage
  };
  suggested_picks: string[];
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

export interface StockQuery {
  code: string;
  name: string;
}

export interface UserSettings {
  hunyuanKey?: string;
  geminiKey?: string;
}

export interface MarketParams {
  period: 'day' | 'month';
  focus: 'funds' | 'rotation' | 'sentiment';
}
