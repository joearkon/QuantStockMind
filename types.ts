
export enum ModelProvider {
  GEMINI_INTL = 'Gemini 3 (海外版)',
  HUNYUAN_CN = '混元大模型 (国内版)',
  DEEPSEEK_CN = 'DeepSeek (国内版)',
}

export enum AnalysisType {
  MARKET_MACRO = 'MARKET_MACRO',
  STOCK_INDIVIDUAL = 'STOCK_INDIVIDUAL',
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface AnalysisResult {
  content: string; // Markdown formatted text or JSON string
  groundingSource?: GroundingChunk[];
  timestamp: number;
  modelUsed: ModelProvider;
  isStructured?: boolean;
  structuredData?: MarketDashboardData;
}

export interface MarketIndex {
  name: string;
  value: string;
  change: string;
  direction: 'up' | 'down';
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
}

export interface StockQuery {
  code: string;
  name: string;
}

export interface UserSettings {
  deepSeekKey?: string;
  hunyuanKey?: string;
}

export interface MarketParams {
  period: 'day' | 'month';
  focus: 'funds' | 'rotation' | 'sentiment';
}
