
export enum ModelProvider {
  GEMINI_INTL = 'Gemini 3 (海外版)',
  HUNYUAN_CN = '混元大模型 (国内版)',
}

export enum MarketType {
  CN = 'CN', // A-Share
  HK = 'HK', // Hong Kong
  US = 'US', // US Stocks
}

export interface DualBoardScanItem {
  name: string;
  code: string;
  board: '创业板' | '科创板';
  control_score: number; // 0-100 主力控盘分
  cost_price: string;    // 主力核心成本
  trend_momentum: string; // 短期趋势动能 (如: 强力进攻, 缩量洗盘, 平台突破)
  rating: '起爆' | '锁筹' | '分歧' | '出货' | '潜伏';
  volume_ratio: string;  // 量比
  logic: string;         // 控盘逻辑简述
  target_price: string;  // 明日压力位
  support_price: string; // 明日支撑位
}

export interface DualBoardScanResponse {
  scan_time: string;
  market_mood: string;
  hot_sectors: string[];
  stocks: DualBoardScanItem[];
}

export interface MainBoardScanItem {
  name: string;
  code: string;
  board: '沪市主板' | '深市主板';
  limit_up_type: '首板' | '连板';
  consecutive_days: number; // 连板天数，首板为1
  control_score: number;
  cost_price: string;
  trend_momentum: string;
  rating: '起爆' | '锁筹' | '分歧' | '出货' | '潜伏';
  volume_ratio: string;
  logic: string;
  target_price: string;
  support_price: string;
}

export interface MainBoardScanResponse {
  scan_time: string;
  market_mood: string;
  hot_sectors: string[];
  stocks: MainBoardScanItem[];
}

export interface KLineSynergyData {
  pattern_name: string;
  synergy_score: number; // 0-100
  time_frame: string; // "3-Day" | "5-Day"
  logic_timeline: {
    day: string;
    action: string;
    psychology: string; // 市场心理描述
  }[];
  synergy_factors: {
    volume_resonance: number; // 量能共振
    price_strength: number;   // 价格强度
    capital_alignment: number; // 资金合力
  };
  prediction: {
    trend: 'Bullish' | 'Bearish' | 'Neutral';
    probability: string;
    target_window: string; // 未来几日
    key_observation: string;
  };
  battle_summary: string; // 多空博弈总结
}

export interface BatchStockScore {
  name: string;
  code: string;
  win_rate: number; // 0-100
  verdict: 'Immediate' | 'Pullback' | 'Wait' | 'Avoid';
  verdict_label: string; // "现价买入", "回踩买入", "观望", "放弃"
  sector_heat: number; // 0-100
  capital_flow: 'Inflow' | 'Neutral' | 'Outflow';
  technical_score: number;
  logic_summary: string;
  key_price: string; // 核心入场价
}

export interface BatchTimingResponse {
  market_context: string;
  overall_risk_score: number;
  stocks: BatchStockScore[];
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
      logic: string 
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
  stock_diagnostics: {
    name: string;
    issues: string[];
    verdict: string;
  }[];
  next_period_focus: string[];
  improvement_advice: string[];
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
  batchTimingData?: BatchTimingResponse;
  klineSynergyData?: KLineSynergyData;
  dualBoardScanData?: DualBoardScanResponse;
  mainBoardScanData?: MainBoardScanResponse;
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
