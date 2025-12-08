
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

export interface PortfolioItem {
  name: string;
  code: string;
  weight: string; // e.g. "30%" or "1500 shares"
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
