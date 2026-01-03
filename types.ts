
export enum ModelProvider {
  GEMINI_INTL = 'Gemini 3 (海外版)',
  HUNYUAN_CN = '混元大模型 (国内版)',
}

export enum MarketType {
  CN = 'CN', // A-Share
  HK = 'HK', // Hong Kong
  US = 'US', // US Stocks
}

// --- NEW: Dragon Sniper Interfaces ---
export interface SnipeTarget {
  name: string;
  code: string;
  reason_for_board: string; 
  theme_purity: number; 
  snipe_logic: string; 
  trigger_conditions: {
    auction_volume: string; 
    opening_strategy: string; 
    volume_ratio_target: string; 
  };
  stop_loss: string;
  confidence: number;
}

export interface AuctionDecisionResponse {
  verdict: '立即出击' | '持续观察' | '逻辑失效/放弃';
  match_score: number; // 0-100 匹配度
  reasoning: string; // 为什么做出此决定
  suggested_entry_type: string; // 排单/半路/打板
  risk_factor: string; // 竞价中暴露的额外风险
}

export interface SnipeVerificationResponse {
  actual_auction: string; 
  actual_opening: string; 
  actual_result: string; 
  is_success: boolean; 
  battle_review: string; 
  market_synchronization: string; 
}

export interface DragonSniperResponse {
  detected_main_theme: string; 
  theme_cycle_stage: '萌芽启动' | '主升过热' | '分歧博弈' | '衰退冰点'; 
  market_sentiment_audit: string; 
  selected_targets: SnipeTarget[];
  overall_verdict: '立即准备' | '观望为主' | '今日无机会';
  risk_warning: string;
}

export interface SniperHistoryEntry {
  id: string;
  timestamp: number;
  marketData: DragonSniperResponse;
  decisions: Record<number, AuctionDecisionResponse>;
  verifications: Record<number, SnipeVerificationResponse>;
}

export interface PeriodicReviewData {
  score: number;
  market_trend: 'bull' | 'bear' | 'neutral';
  market_summary: string;
  monthly_portfolio_summary?: string;
  stock_diagnostics: {
    name: string;
    verdict: string;
    issues: string[];
  }[];
  highlight: {
    title: string;
    description: string;
  };
  lowlight: {
    title: string;
    description: string;
  };
  execution: {
    score: number;
    details: string;
    good_behaviors: string[];
    bad_behaviors: string[];
  };
  improvement_advice: string[];
  next_period_focus: string[];
}

export interface KLineSynergyData {
  [key: string]: any;
}

export interface SectorLadderData {
  risk_score: number;
  cycle_stage: string;
  stage_label: string;
  sector_name: string;
  action_advice: string;
  ladder: {
    tier: string;
    stocks: {
      name: string;
      code: string;
      price: string;
      performance: string;
      status: string;
      health_score: number;
      logic: string;
    }[];
  }[];
  warning_signals: string[];
  support_points: string[];
  structural_integrity: {
    synergy_score: number;
    is_divergent: boolean;
    verdict: string;
  };
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

export interface DualBoardScanItem {
  name: string;
  code: string;
  board: string;
  control_score: number;
  cost_price: string;
  trend_momentum: string;
  rating: string;
  target_price: string;
  support_price: string;
  logic: string;
}

export interface MainBoardScanItem {
  name: string;
  code: string;
  board: string;
  limit_up_type: string;
  consecutive_days: number;
  capital_portrait: {
    main_type: string;
    key_players: string[];
    influence_verdict: string;
  };
  control_score: number;
  rating: string;
  target_price: string;
}

export interface LimitUpLadderSector {
  sector_name: string;
  sector_type: string;
  market_sentiment: string;
  total_count: number;
  integrity_score: number;
  dragon_leader: {
    name: string;
    code: string;
    strength_score: number;
    consecutive_days: number;
    reason: string;
  };
  ladder_matrix: {
    height: number;
    count: number;
    stocks: {
      name: string;
      logic: string;
    }[];
  }[];
}

export interface DragonSignalItem {
  name: string;
  code: string;
  signal_type: string;
  energy_score: number;
  alpha_logic: string;
  key_target: string;
  key_support: string;
  volume_status: string;
}

// --- NEW: Pattern Hunter Interfaces ---
export interface PatternVerificationResponse {
  stock_name: string;
  verdict: '立即伏击' | '继续观察' | '逻辑失效' | '等待放量';
  confidence_score: number; 
  visual_diagnostic: string; 
  volume_ratio_verdict: string; 
  trigger_condition: string; 
  stop_loss_point: string; 
  target_space: string;
  battle_logic: string; 
}

export interface PatternStockItem {
  name: string;
  code: string;
  current_tier: '二梯队' | '三梯队' | '潜伏期';
  vacuum_score: number; 
  volume_ratio_desc: string; 
  catalyst_alignment: string; 
  technical_setup: string; 
  entry_signal_trigger: string; 
  upside_potential: string; 
  risk_warning: string;
}

export interface PatternHunterResponse {
  sector_context: string;
  sector_leader: string; 
  market_stage: string; 
  stocks: PatternStockItem[];
}

export interface StockSynergyResponse {
  name: string;
  code: string;
  synergy_score: number; 
  trap_risk_score: number; 
  dragon_potential_score: number; 
  market_position: string;
  capital_consistency: string;
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
  synergy_factors: {
    label: string;
    score: number;
    description: string;
  }[];
  battle_verdict: string;
  action_guide: string;
  chase_safety_index: number; 
}

export interface DragonSignalResponse {
  scan_time: string;
  market_pulse: string; 
  dragon_energy: number; 
  signals: DragonSignalItem[];
}

export interface DualBoardScanResponse {
  scan_time: string;
  market_mood: string;
  hot_sectors: string[];
  stocks: DualBoardScanItem[];
}

export interface MainBoardScanResponse {
  scan_time: string;
  market_mood: string;
  hot_sectors: string[];
  stocks: MainBoardScanItem[];
}

export interface LimitUpLadderResponse {
  scan_time: string;
  total_limit_ups: number;
  sectors: LimitUpLadderSector[];
  market_conclusion: string;
}

export interface MarketDashboardData {
  data_date?: string; 
  market_indices?: any[];
  market_volume?: any;
  market_sentiment: any;
  capital_rotation: any;
  macro_logic?: any;
}

export interface AnalysisResult {
  content: string; 
  groundingSource?: any[];
  timestamp: number;
  modelUsed: ModelProvider;
  isStructured?: boolean;
  structuredData?: MarketDashboardData;
  market?: MarketType;
  periodicData?: PeriodicReviewData;
  historyData?: any;
  opportunityData?: OpportunityResponse;
  foresightData?: ForesightReport;
  institutionalData?: any;
  timingData?: any;
  hotlistData?: any;
  ladderData?: SectorLadderData; 
  batchTimingData?: any;
  klineSynergyData?: KLineSynergyData;
  dualBoardScanData?: DualBoardScanResponse;
  mainBoardScanData?: MainBoardScanResponse;
  limitUpLadderData?: LimitUpLadderResponse;
  dragonSignalData?: DragonSignalResponse;
  stockSynergyData?: StockSynergyResponse;
  patternHunterData?: PatternHunterResponse;
  patternVerificationData?: PatternVerificationResponse;
  dragonSniperData?: DragonSniperResponse;
  snipeVerificationData?: SnipeVerificationResponse;
  auctionDecisionData?: AuctionDecisionResponse; // NEW
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
  positionRatio: number;
  date: string;
  holdings: any[];
}
