
export enum ModelProvider {
  GEMINI_INTL = 'Gemini 3 (海外版)',
  HUNYUAN_CN = '混元大模型 (国内版)',
}

export enum MarketType {
  CN = 'CN', // A-Share
  HK = 'HK', // Hong Kong
  US = 'US', // US Stocks
}

export interface SectorLadderData {
  sector_name: string;
  cycle_stage: 'Starting' | 'Growing' | 'Climax' | 'End' | 'Receding';
  stage_label: string;
  risk_score: number;
  ladder: {
    tier: string; // "一梯队（龙头）", "二梯队（中军）", "三梯队（补涨）"
    stocks: { 
      name: string; 
      code: string; 
      status: 'Leading' | 'Stagnant' | 'Following' | 'Weakening'; 
      performance: string; // 涨跌幅及量能简述
      health_score: number; // 0-100
      logic: string 
    }[];
  }[];
  structural_integrity: {
    synergy_score: number;
    verdict: string;
    is_divergent: boolean;
  };
  support_points: string[]; // 行情延续支撑点
  warning_signals: string[]; // 行情终结警示信号
  action_advice: string;
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
    rotation_logic: string; 
    top_inflow_stocks?: string[]; 
  };
  macro_logic?: {
    policy_focus: string;
    macro_event: string;
    impact_level: 'High' | 'Medium' | 'Low';
  };
  institutional_signals?: {
    dragon_tiger_summary: string;
    lh_top_10?: { name: string; net_buy: string; logic: string }[]; 
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

export interface OpportunityResponse {
  policy_theme?: string;
  analysis_summary?: string;
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

export interface ForesightReport {
  monthly_focus: string;
  catalysts: {
    date_window: string;
    event_name: string;
    theme_label: string;
    logic_chain: string;
    opportunity_level: 'High' | 'Medium' | 'Low';
    suggested_stocks: string[];
  }[];
  rotation_warning: string;
  macro_policy_insight: string;
}

export interface InstitutionalInsightData {
  detailed_signals: {
    lh_list: string;
    block_trades: string;
    spread_trend: string;
  };
  top_surveyed_sectors: {
    sector_name: string;
    intensity: number;
    top_stocks: string[];
    reason: string;
  }[];
  key_institution_views: {
    institution_name: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    viewpoint: string;
    target_sector: string;
  }[];
  smart_money_trends: {
    signal_type: string;
    concept_name: string;
    flow_status: 'net_inflow' | 'net_outflow';
    key_driver: string;
  }[];
}

export interface AnalysisResult {
  content: string; 
  groundingSource?: GroundingSource[];
  timestamp: number;
  modelUsed: ModelProvider;
  isStructured?: boolean;
  structuredData?: MarketDashboardData;
  market?: MarketType;
  periodicData?: PeriodicReviewData;
  historyData?: any;
  opportunityData?: OpportunityResponse;
  foresightData?: ForesightReport;
  institutionalData?: InstitutionalInsightData;
  timingData?: TimingEvaluation;
  hotlistData?: InstitutionalHotlist;
  ladderData?: SectorLadderData; 
}

export interface TimingEvaluation {
  action: 'Buy' | 'Wait' | 'Sell' | 'Reduce';
  position_score: number;
  entry_logic: string;
  entry_price_window: string;
  stop_loss: string;
  target_profit: string;
  kline_analysis: string;
}

export interface InstitutionalHotlist {
  summary: string;
  ranking: {
    name: string;
    code: string;
    visit_frequency: string;
    institution_count: number;
    core_logic: string;
    potential_rating: 'High' | 'Medium';
  }[];
  sector_heat: { name: string; value: number }[];
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
