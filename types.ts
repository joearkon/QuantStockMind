

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

export interface PeriodicReviewData {
  score: number; // 0-100
  market_summary: string;
  market_trend: 'bull' | 'bear' | 'volatile';
  highlight: {
    title: string;
    description: string;
  };
  lowlight: {
    title: string;
    description: string;
  };
  execution: {
    score: number; // 0-100
    details: string;
    good_behaviors: string[]; // List of good habits
    bad_behaviors: string[]; // List of bad habits
  };
  next_period_focus: string[];
}

// --- Trading Plan Types ---
export interface PlanItem {
  id: string;
  symbol: string; // Stock Name/Code
  action: 'buy' | 'sell' | 'hold' | 'monitor' | 't_trade'; // t_trade for 做T
  price_target?: string;
  reason?: string;
  status: 'pending' | 'completed' | 'skipped' | 'failed';
}

export interface DailyTradingPlan {
  id: string;
  target_date: string; // YYYY-MM-DD (The day the plan is for)
  created_at: number;
  items: PlanItem[];
  strategy_summary: string; // Brief summary of overall strategy
}

export interface AnalysisResult {
  content: string; // Markdown formatted text or JSON string
  groundingSource?: GroundingSource[];
  timestamp: number;
  modelUsed: ModelProvider;
  isStructured?: boolean;
  structuredData?: MarketDashboardData;
  opportunityData?: OpportunityResponse; 
  institutionalData?: InstitutionalInsight; 
  historyData?: HistoricalYearData; 
  periodicData?: PeriodicReviewData; // New Field for Periodic Review
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

// New Interface for Volume Analysis
export interface MarketVolumeData {
  total_volume: string;     // e.g. "1.5万亿" or "150B"
  volume_delta: string;     // e.g. "放量2000亿" or "缩量5%"
  volume_trend: 'expansion' | 'contraction' | 'flat'; // visual indicator
  net_inflow: string;       // e.g. "主力净流入+50亿"
  capital_mood: string;     // e.g. "增量资金跑步进场" or "存量博弈"
}

export interface MarketDashboardData {
  data_date?: string; // Actual date of the data (YYYY-MM-DD) or "Realtime"
  market_indices?: MarketIndex[];
  
  // New Field
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
  positionRatio?: number; // New: Percentage (0-100) or decimal
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

// --- New Types for Opportunity Mining (Strategic Supply Chain) ---

export interface ChainOpportunity {
  stock_name: string;
  stock_code: string;
  relation_type: string; // e.g. "Upstream Supplier", "Peer", "Shadow Stock"
  logic_core: string;    // e.g. "Sole supplier of titanium alloy for Guoji"
  policy_match: string;  // e.g. "Matches 15th Plan High-end Equipment"
}

export interface ChainMapping {
  user_holding: string; // The stock user input (e.g., Zhongke Sugon)
  opportunities: ChainOpportunity[];
}

export interface RotationAdvice {
  current_sector: string;
  next_sector: string;
  reason: string;
  catalyst: string; // Trigger event
}

// -- NEW TYPES FOR CAPITAL DEPLOYMENT --

export interface RecommendedStock {
  name: string;
  code: string;
  sector: string;
  reason: string; // e.g. "Top Institution Net Buy 3 days"
  buy_point: string; // e.g. "Low suction at 5-day line"
  risk_tag: 'High' | 'Medium' | 'Low';
}

export interface DeploymentPlan {
  market_environment: string; // e.g. "Sentiment Warming, Volume Expanding"
  suggested_style: string; // e.g. "Aggressive on Leaders"
  focus_directions: {
    sector: string;
    logic: string;
    inflow_status: string; // e.g. "Net Inflow 500M"
  }[];
  top_picks: RecommendedStock[];
}

export interface OpportunityResponse {
  analysis_summary: string; // High level summary of the strategy
  policy_theme: string;     // Current National Strategy Theme (e.g. New Productive Forces)
  
  // Mode 1: Chain Mining
  supply_chain_matrix?: ChainMapping[];
  rotation_strategy?: RotationAdvice[];

  // Mode 2: Capital Deployment
  deployment_plan?: DeploymentPlan;
}

// --- New Types for Institutional Insights ---

export interface SurveyHotspot {
  sector_name: string;
  intensity: number; // 0-100
  top_stocks: string[]; // e.g. ["Hikvision", "CATL"]
  reason: string; // Why are they visiting?
}

export interface InstitutionView {
  institution_name: string; // e.g. "Morgan Stanley", "CITIC"
  type: 'foreign' | 'domestic';
  viewpoint: string; // Summary of their latest report
  target_sector: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface SmartMoneyFlow {
  concept_name: string;
  flow_status: 'net_inflow' | 'net_outflow';
  key_driver: string; // Why is smart money moving here?
}

export interface InstitutionalInsight {
  market_heat_summary: string; // Overall summary
  top_surveyed_sectors: SurveyHotspot[];
  key_institution_views: InstitutionView[];
  smart_money_trends: SmartMoneyFlow[];
}

// --- New Types for Historical Sector Review ---
export interface SectorPerformance {
  name: string;
  change_approx: string; // e.g. "+15%" or "大涨"
}

export interface MonthlyPerformance {
  month: number; // 1-12
  summary: string; // e.g. "微盘股崩盘，高股息护盘"
  winners: SectorPerformance[];
  losers: SectorPerformance[];
  key_event: string; // e.g. "新国九条发布"
}

export interface HistoricalYearData {
  year: string;
  yearly_summary: string;
  months: MonthlyPerformance[];
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