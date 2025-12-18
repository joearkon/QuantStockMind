

export enum ModelProvider {
  GEMINI_INTL = 'Gemini 3 (海外版)',
  HUNYUAN_CN = '混元大模型 (国内版)',
}

export enum MarketType {
  CN = 'CN', // A-Share
  HK = 'HK', // Hong Kong
  US = 'US', // US Stocks
}

// Added InstitutionalInsight interface to define the structure for institutional analysis
export interface InstitutionalInsight {
  market_heat_summary: string;
  top_surveyed_sectors: {
    sector_name: string;
    intensity: number;
    top_stocks: string[];
    reason: string;
  }[];
  key_institution_views: {
    institution_name: string;
    type: 'foreign' | 'domestic';
    viewpoint: string;
    target_sector: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
  }[];
  smart_money_trends: {
    concept_name: string;
    flow_status: 'net_inflow' | 'net_outflow';
    key_driver: string;
  }[];
}

export interface MacroDeductionData {
  summary: string;
  short_term_outlook: {
    period: string;
    top_sectors: {
      name: string;
      logic: string;
      catalysts: string[];
      heat_index: number; // 1-100
    }[];
  };
  strategic_planning_15th: {
    theme: string;
    vision: string;
    potential_winners: string[];
    key_policy_indicators: string[];
  };
  logic_chain: {
    event: string;
    impact: string;
    result: string;
  }[];
  risk_warning: string;
}

// Global declaration to fix window.__ENV__ TypeScript error
declare global {
  interface Window {
    __ENV__?: {
      VITE_GEMINI_API_KEY?: string;
      VITE_HUNYUAN_API_KEY?: string;
      [key: string]: any;
    };
  }
}

export interface AnalysisResult {
  content: string; 
  groundingSource?: GroundingSource[];
  timestamp: number;
  modelUsed: ModelProvider;
  isStructured?: boolean;
  structuredData?: MarketDashboardData;
  opportunityData?: OpportunityResponse; 
  historyData?: HistoricalYearData; 
  periodicData?: PeriodicReviewData; 
  macroData?: MacroDeductionData; 
  institutionalData?: InstitutionalInsight; // Added this property to AnalysisResult
  market?: MarketType;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface PeriodicReviewData {
  score: number;
  market_summary: string;
  market_trend: 'bull' | 'bear' | 'volatile';
  highlight: { title: string; description: string; };
  lowlight: { title: string; description: string; };
  execution: { score: number; details: string; good_behaviors: string[]; bad_behaviors: string[]; };
  next_period_focus: string[];
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

export interface MarketIndex {
  name: string;
  value: string;
  change: string;
  direction: 'up' | 'down';
}

export interface PortfolioItem {
  name: string;
  code: string;
  volume: string;
  weight: string;
  logic_tag: string;
}

export interface AllocationModel {
  strategy_name: string;
  description: string;
  action_plan: string[];
  portfolio_table: PortfolioItem[];
  core_advantage: string;
}

export interface MarketVolumeData {
  total_volume: string;
  volume_delta: string;
  volume_trend: 'expansion' | 'contraction' | 'flat';
  net_inflow: string;
  capital_mood: string;
}

export interface MarketDashboardData {
  data_date?: string;
  market_indices?: MarketIndex[];
  market_volume?: MarketVolumeData;
  market_sentiment: { score: number; summary: string; trend: 'bullish' | 'bearish' | 'neutral'; };
  capital_rotation: { inflow_sectors: string[]; inflow_reason: string; outflow_sectors: string[]; outflow_reason: string; };
  deep_logic: { policy_driver: string; external_environment: string; market_valuation: string; };
  hot_topics: string[];
  opportunity_analysis: { defensive_value: { logic: string; sectors: string[]; }; tech_growth: { logic: string; sectors: string[]; }; };
  strategist_verdict: string;
  allocation_model: { aggressive: AllocationModel; balanced: AllocationModel; };
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

export interface HoldingsSnapshot {
  totalAssets: number;
  positionRatio?: number;
  date: string;
  holdings: HoldingItemDetailed[];
}

export interface JournalEntry {
  id: string;
  timestamp: number;
  snapshot: HoldingsSnapshot;
  analysis: AnalysisResult | null;
  note?: string;
}

export interface UserSettings {
}

export interface OpportunityResponse {
  analysis_summary: string;
  policy_theme: string;
  supply_chain_matrix?: ChainMapping[];
  rotation_strategy?: RotationAdvice[];
  deployment_plan?: DeploymentPlan;
}

export interface ChainMapping { user_holding: string; opportunities: ChainOpportunity[]; }
export interface ChainOpportunity { stock_name: string; stock_code: string; relation_type: string; logic_core: string; policy_match: string; }
export interface RotationAdvice { current_sector: string; next_sector: string; reason: string; catalyst: string; }
export interface RecommendedStock { name: string; code: string; sector: string; reason: string; buy_point: string; risk_tag: 'High' | 'Medium' | 'Low'; }
export interface DeploymentPlan { market_environment: string; suggested_style: string; focus_directions: { sector: string; logic: string; inflow_status: string; }[]; top_picks: RecommendedStock[]; }

export interface SectorPerformance { name: string; change_approx: string; }
export interface MonthlyPerformance { month: number; summary: string; winners: SectorPerformance[]; losers: SectorPerformance[]; key_event: string; }
export interface HistoricalYearData { year: string; yearly_summary: string; months: MonthlyPerformance[]; }
