
export enum ModelProvider {
  GEMINI_INTL = 'Gemini 3 (海外版)',
  HUNYUAN_CN = '混元大模型 (国内版)',
}

export enum MarketType {
  CN = 'CN', 
  HK = 'HK', 
  US = 'US', 
}

// --- Capital Composition Sub-interface ---
export interface CapitalTypeData {
  type: 'Foreign' | 'Institutional' | 'HotMoney' | 'Retail';
  label: string;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  description: string;
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

export interface SectorLadderData {
  sector_name: string;
  cycle_stage: 'Starting' | 'Growing' | 'Climax' | 'End' | 'Receding';
  stage_label: string;
  risk_score: number;
  ladder: {
    tier: string;
    stocks: {
      name: string;
      code: string;
      price: string;
      status: 'Leading' | 'Stagnant' | 'Following' | 'Weakening';
      performance: string;
      health_score: number;
      logic: string;
    }[];
  }[];
  structural_integrity: {
    synergy_score: number;
    verdict: string;
    is_divergent: boolean;
  };
  support_points: string[];
  warning_signals: string[];
  action_advice: string;
}

export interface KLineSynergyData {
  [key: string]: any;
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
    sentiment: "bullish" | "bearish" | "neutral";
    viewpoint: string;
    target_sector: string;
  }[];
  smart_money_trends: {
    signal_type: string;
    concept_name: string;
    flow_status: "net_inflow" | "net_outflow";
    key_driver: string;
  }[];
}

// --- ENHANCED: Hot Money Ambush Interface (Logic 3.0 Edition) ---
export interface HotMoneyAmbushStock {
  name: string;
  code: string;
  current_price: string; 
  dragon_blood_score: number; 
  historical_glory_period: string; // 追溯: 上次活跃期 (如: 60天前)
  historical_main_force: string; // 追溯: 历史进驻的顶级游资或机构名称
  dormant_days: number; // 沉寂天数 (60-80天为佳)
  pit_depth_percent: number; 
  sector_name: string; 
  sector_heat_status: 'Ice' | 'Warm' | 'Boiling'; 
  catalyst_jan_strength: number; 
  k_pattern_sign: string; // K线形态特征：如“地量十字星”、“变盘孕线”
  institutional_participation: boolean;
  ambush_rating: 'Strong' | 'Normal' | 'Avoid';
  ambush_logic: string;
  target_entry_price: string; 
  stop_loss_price: string;
  phase: 'GoldenPit' | 'Dormant' | 'Stirring'; 
  position_height: 'Low' | 'Medium' | 'High';
}

export interface HotMoneyAmbushResponse {
  scan_time: string;
  market_summary: string;
  rotation_avoid_list: string[]; 
  jan_catalyst_focus: string[]; 
  candidates: HotMoneyAmbushStock[];
  rotation_insight: string;
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
  timingData?: any;
  hotlistData?: any;
  ladderData?: SectorLadderData; 
  batchTimingData?: any;
  klineSynergyData?: KLineSynergyData;
  dualBoardScanData?: DualBoardScanResponse;
  mainBoardScanData?: MainBoardScanResponse;
  limit_up_ladder_data?: LimitUpLadderResponse; 
  limitUpLadderData?: LimitUpLadderResponse;
  stockSynergyData?: StockSynergyResponse; 
  opportunityData?: OpportunityResponse;
  foresightData?: ForesightReport;
  institutionalData?: InstitutionalInsightData;
  hotMoneyAmbushData?: HotMoneyAmbushResponse; 
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

export interface DailyTradingPlan {
  id: string;
  target_date: string; 
  created_at: number;
  items: PlanItem[];
  strategy_summary: string; 
}

export interface PlanItem {
  id: string;
  symbol: string; 
  action: 'buy' | 'sell' | 'hold' | 'monitor' | 't_trade'; 
  price_target?: string;
  reason?: string;
  status: 'pending' | 'completed' | 'skipped' | 'failed';
}

export interface HoldingsSnapshot {
  totalAssets: number;
  positionRatio?: number; 
  date: string;
  holdings: HoldingItemDetailed[];
}

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

export interface MarketDashboardData {
  data_date?: string; 
  market_indices?: MarketIndex[];
  market_volume?: MarketVolumeData;
  market_sentiment: {
    score: number;
    summary: string;
    trend: 'bullish' | 'bearish' | 'neutral';
    warning_level?: 'Normal' | 'Overheated' | 'Extreme'; 
  };
  capital_composition?: CapitalTypeData[]; 
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
    external_impact?: string;
    core_verdict?: string;
    macro_event?: string;
    impact_level?: 'High' | 'Medium' | 'Low';
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
  percent: string;
}

export interface MarketVolumeData {
  total_volume: string;     
  volume_delta: string;     
  volume_trend: 'expansion' | 'contraction' | 'flat'; 
  net_inflow: string;       
  capital_mood: string;
  active_buy_spread?: string; 
}

export interface StockSynergyResponse {
  name: string;
  code: string;
  used_current_price: string; 
  synergy_score: number; 
  trap_risk_score: number; 
  dragon_potential_score: number; 
  market_position: string; 
  capital_consistency: string; 
  main_force_cost_anchor: {
    estimated_cost: string; 
    safety_margin_percent: number; 
    risk_level: string; 
  };
  turnover_eval: {
    current_rate: string;
    is_sufficient: boolean;
    verdict: string;
  };
  main_force_portrait: {
    lead_type: string; 
    entry_cost_est: string;
    hold_status: string; 
  };
  t_plus_1_prediction: {
    expected_direction: string; 
    confidence: number;
    price_range: string;
    opening_strategy: string; 
    logic: string;
  };
  synergy_factors: { label: string; score: number; description: string }[];
  battle_verdict: string; 
  action_guide: string; 
  chase_safety_index: number; 
}

export interface DualBoardScanResponse {
  scan_time: string;
  market_mood: string;
  hot_sectors: string[];
  stocks: DualBoardScanItem[];
}

export interface DualBoardScanItem {
  name: string;
  code: string;
  board: '创业板' | '科创板';
  consecutive_days: number;
  control_score: number; 
  cost_price: string;    
  trend_momentum: string; 
  rating: '起爆' | '锁筹' | '分歧' | '出货' | '潜伏';
  volume_ratio: string;  
  logic: string;         
  target_price: string;  
  support_price: string; 
  capital_detail: {
    net_buy_amount: string;
    large_order_ratio: string;
    seats: string[];
  };
}

export interface MainBoardScanResponse {
  scan_time: string;
  market_mood: string;
  hot_sectors: string[];
  stocks: MainBoardScanItem[];
}

export interface MainBoardScanItem {
  name: string;
  code: string;
  board: '沪市主板' | '深市主板';
  limit_up_type: '首板' | '连板';
  consecutive_days: number; 
  control_score: number;
  cost_price: string;
  trend_momentum: string;
  rating: '起爆' | '锁筹' | '分歧' | '出货' | '潜伏';
  volume_ratio: string;  
  logic: string;
  target_price: string;
  support_price: string;
  capital_detail: {
    net_buy_amount: string;
    large_order_ratio: string;
    seats: string[];
  };
}

export interface LimitUpLadderResponse {
  scan_time: string;
  total_limit_ups: number;
  sectors: LimitUpLadderSector[];
  market_conclusion: string;
}

export interface LimitUpLadderSector {
  sector_name: string;
  sector_type: 'Main' | 'Sub'; 
  total_count: number;
  max_height: number;
  ladder_matrix: {
    height: number; 
    count: number;
    stocks: { name: string; code: string; logic: string }[];
  }[];
  dragon_leader: {
    name: string;
    code: string;
    consecutive_days: number;
    strength_score: number;
    reason: string;
  };
  dragon_seeds?: DragonSeed[]; 
  integrity_score: number; 
  market_sentiment: 'Rising' | 'Climax' | 'Diverging' | 'Falling';
}

export interface DragonSeed {
  name: string;
  code: string;
  capital_intensity: 'Extreme' | 'High' | 'Normal'; 
  seat_analysis: string; 
  incubation_logic: string; 
  evolution_stage: 'Seeding' | 'Sprouting' | 'Competing'; 
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
