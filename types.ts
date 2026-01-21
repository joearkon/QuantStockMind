
export enum ModelProvider {
  GEMINI_INTL = 'Gemini 3 (海外版)',
  HUNYUAN_CN = '混元大模型 (国内版)',
}

export enum MarketType {
  CN = 'CN', // A-Share
  HK = 'HK', // Hong Kong
  US = 'US', // US Stocks
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

export interface PeriodicReviewData {
  score: number;
  market_trend: 'bull' | 'bear' | 'sideways';
  market_summary: string;
  monthly_portfolio_summary?: string;
  highlight: { title: string; description: string };
  lowlight: { title: string; description: string };
  execution: {
    score: number;
    details: string;
    good_behaviors: string[];
    bad_behaviors: string[];
  };
  stock_diagnostics: {
    name: string;
    issues: string[];
    verdict: string;
  }[];
  next_period_focus: string[];
  improvement_advice: string[];
}

// Added missing MarketDashboardData interface
export interface MarketDashboardData {
  data_date: string;
  market_indices: {
    name: string;
    value: string;
    percent: string;
    direction: 'up' | 'down';
  }[];
  market_volume: {
    total_volume: string;
    volume_delta: string;
    volume_trend: 'expansion' | 'contraction' | 'flat';
    capital_mood: string;
  };
  market_sentiment: {
    score: number;
    summary: string;
    warning_level: string;
  };
  capital_composition: CapitalTypeData[];
  macro_logic: {
    external_impact: string;
    policy_focus: string;
    core_verdict: string;
  };
  capital_rotation: {
    inflow_sectors: string[];
    outflow_sectors: string[];
    rotation_logic: string;
  };
}

// Added missing CapitalTypeData interface
export interface CapitalTypeData {
  label: string;
  type: 'Retail' | 'Foreign' | 'Institutional' | string;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'flat';
  description: string;
}

// Added missing OpportunityResponse interface
export interface OpportunityResponse {
  policy_theme: string;
  analysis_summary: string;
  supply_chain_matrix?: {
    user_holding: string;
    opportunities: {
      stock_name: string;
      stock_code: string;
      relation_type: string;
      logic_core: string;
      policy_match: string;
    }[];
  }[];
  deployment_plan?: {
    focus_directions: {
      sector: string;
      inflow_status: string;
      logic: string;
    }[];
    top_picks: {
      name: string;
      code: string;
      sector: string;
      risk_tag: string;
      reason: string;
      buy_point: string;
    }[];
  };
}

// Added missing ForesightReport interface
export interface ForesightReport {
  monthly_focus: string;
  catalysts: {
    date_window: string;
    event_name: string;
    theme_label: string;
    logic_chain: string;
    opportunity_level: string;
    suggested_stocks: string[];
  }[];
  rotation_warning: string;
  macro_policy_insight: string;
}

// Added missing BatchStockScore interface
export interface BatchStockScore {
  name: string;
  code: string;
  win_rate: number;
  verdict: 'Immediate' | 'Pullback' | 'Wait' | 'Avoid';
  verdict_label: string;
  sector_heat: number;
  capital_flow: 'Inflow' | 'Neutral' | 'Outflow';
  technical_score: number;
  logic_summary: string;
  key_price: string;
}

// Added missing DualBoardScanItem interface
export interface DualBoardScanItem {
  name: string;
  code: string;
  board: string;
  consecutive_days: number;
  control_score: number;
  capital_detail: {
    net_buy_amount: string;
    large_order_ratio: string;
    seats: string[];
  };
  rating: string;
  logic: string;
}

// Added missing MainBoardScanItem interface
export interface MainBoardScanItem {
  name: string;
  code: string;
  board: string;
  consecutive_days: number;
  capital_detail: {
    net_buy_amount: string;
    large_order_ratio: string;
    seats: string[];
  };
  rating: string;
  logic: string;
}

// Added missing LimitUpLadderSector interface
export interface LimitUpLadderSector {
  sector_name: string;
  sector_type: 'Main' | 'Side';
  market_sentiment: string;
  total_count: number;
  integrity_score: number;
  dragon_leader: {
    name: string;
    code: string;
    consecutive_days: number;
    strength_score: number;
    reason: string;
  };
  dragon_seeds?: {
    name: string;
    code: string;
    capital_intensity: string;
    evolution_stage: string;
    seat_analysis: string;
    incubation_logic: string;
  }[];
  ladder_matrix: {
    height: number;
    count: number;
    stocks: { name: string; logic: string }[];
  }[];
}

export interface AnalysisResult {
  content: string; 
  timestamp: number;
  modelUsed: ModelProvider;
  isStructured?: boolean;
  periodicData?: PeriodicReviewData;
  stockSynergyData?: any;
  structuredData?: any;
  // Added properties to fix missing property errors
  market?: MarketType;
  opportunityData?: OpportunityResponse;
  foresightData?: ForesightReport;
  hotlistData?: any;
  institutionalData?: any;
  timingData?: any;
  batchTimingData?: any;
  ladderData?: any;
  dualBoardScanData?: any;
  mainBoardScanData?: any;
  limitUpLadderData?: any;
}

export interface UserSettings {
  hunyuanKey?: string;
  geminiKey?: string;
}

export interface JournalEntry {
  id: string;
  timestamp: number;
  snapshot: HoldingsSnapshot;
  analysis: AnalysisResult | null;
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
  holdings: HoldingItemDetailed[];
}
