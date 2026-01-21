
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { 
  AnalysisResult, 
  ModelProvider, 
  MarketType, 
  MarketDashboardData, 
  HoldingsSnapshot, 
  PeriodicReviewData, 
  PlanItem, 
  KLineSynergyData, 
  DualBoardScanResponse, 
  MainBoardScanResponse, 
  LimitUpLadderResponse,
  StockSynergyResponse,
  SectorLadderData,
  JournalEntry
} from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 

const stockSynergySchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    code: { type: Type.STRING },
    used_current_price: { type: Type.STRING },
    synergy_score: { type: Type.NUMBER },
    trap_risk_score: { type: Type.NUMBER },
    dragon_potential_score: { type: Type.NUMBER },
    market_position: { type: Type.STRING },
    capital_consistency: { type: Type.STRING },
    main_force_cost_anchor: {
      type: Type.OBJECT,
      properties: {
        estimated_cost: { type: Type.STRING },
        safety_margin_percent: { type: Type.NUMBER },
        risk_level: { type: Type.STRING, enum: ["低风险", "中等溢价", "高危泡沫", "成本线下/黄金区"] }
      },
      required: ["estimated_cost", "safety_margin_percent", "risk_level"]
    },
    turnover_eval: {
      type: Type.OBJECT,
      properties: {
        current_rate: { type: Type.STRING },
        is_sufficient: { type: Type.BOOLEAN },
        verdict: { type: Type.STRING }
      },
      required: ["current_rate", "is_sufficient", "verdict"]
    },
    main_force_portrait: {
      type: Type.OBJECT,
      properties: {
        lead_type: { type: Type.STRING },
        entry_cost_est: { type: Type.STRING },
        hold_status: { type: Type.STRING }
      },
      required: ["lead_type", "entry_cost_est", "hold_status"]
    },
    t_plus_1_prediction: {
      type: Type.OBJECT,
      properties: {
        expected_direction: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
        price_range: { type: Type.STRING },
        opening_strategy: { type: Type.STRING },
        logic: { type: Type.STRING }
      },
      required: ["expected_direction", "confidence", "price_range", "opening_strategy", "logic"]
    },
    synergy_factors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          score: { type: Type.NUMBER },
          description: { type: Type.STRING }
        },
        required: ["label", "score", "description"]
      }
    },
    battle_verdict: { type: Type.STRING },
    action_guide: { type: Type.STRING },
    chase_safety_index: { type: Type.NUMBER }
  },
  required: [
    "name", "code", "used_current_price", "synergy_score", "trap_risk_score", "dragon_potential_score", "market_position", 
    "capital_consistency", "main_force_cost_anchor", "turnover_eval", "main_force_portrait", 
    "t_plus_1_prediction", "synergy_factors", "battle_verdict", "action_guide", "chase_safety_index"
  ]
};

const capitalDetailSchema = {
  type: Type.OBJECT,
  properties: {
    net_buy_amount: { type: Type.STRING, description: "今日龙虎榜或主力买卖净额" },
    large_order_ratio: { type: Type.STRING, description: "主力大单介入占比" },
    seats: { type: Type.ARRAY, items: { type: Type.STRING }, description: "核心参与席位或游资名称" }
  },
  required: ["net_buy_amount", "large_order_ratio", "seats"]
};

const dualBoardScanSchema = { 
  type: Type.OBJECT, 
  properties: { 
    scan_time: { type: Type.STRING }, 
    market_mood: { type: Type.STRING }, 
    hot_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, 
    stocks: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: { 
          name: { type: Type.STRING }, 
          code: { type: Type.STRING }, 
          board: { type: Type.STRING, enum: ['创业板', '科创板'] }, 
          consecutive_days: { type: Type.NUMBER },
          control_score: { type: Type.NUMBER }, 
          cost_price: { type: Type.STRING }, 
          trend_momentum: { type: Type.STRING }, 
          rating: { type: Type.STRING, enum: ['起爆', '锁筹', '分歧', '出货', '潜伏'] }, 
          volume_ratio: { type: Type.STRING }, 
          logic: { type: Type.STRING }, 
          target_price: { type: Type.STRING }, 
          support_price: { type: Type.STRING },
          capital_detail: capitalDetailSchema
        },
        required: ["name", "code", "consecutive_days", "control_score", "capital_detail"]
      } 
    } 
  } 
};

const mainBoardScanSchema = { 
  type: Type.OBJECT, 
  properties: { 
    scan_time: { type: Type.STRING }, 
    market_mood: { type: Type.STRING }, 
    hot_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, 
    stocks: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: { 
          name: { type: Type.STRING }, 
          code: { type: Type.STRING }, 
          board: { type: Type.STRING, enum: ['沪市主板', '深市主板'] }, 
          limit_up_type: { type: Type.STRING, enum: ['首板', '连板'] }, 
          consecutive_days: { type: Type.NUMBER }, 
          control_score: { type: Type.NUMBER }, 
          cost_price: { type: Type.STRING }, 
          trend_momentum: { type: Type.STRING }, 
          rating: { type: Type.STRING, enum: ['起爆', '锁筹', '分歧', '出货', '潜伏'] }, 
          volume_ratio: { type: Type.STRING }, 
          logic: { type: Type.STRING }, 
          target_price: { type: Type.STRING }, 
          support_price: { type: Type.STRING },
          capital_detail: capitalDetailSchema
        },
        required: ["name", "code", "consecutive_days", "control_score", "capital_detail"]
      } 
    } 
  } 
};

const marketDashboardSchema = { type: Type.OBJECT, properties: { data_date: { type: Type.STRING }, market_indices: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.STRING }, change: { type: Type.STRING }, percent: { type: Type.STRING }, direction: { type: Type.STRING, enum: ['up', 'down'] } } } }, market_volume: { type: Type.OBJECT, properties: { total_volume: { type: Type.STRING }, volume_delta: { type: Type.STRING }, volume_trend: { type: Type.STRING, enum: ['expansion', 'contraction', 'flat'] }, capital_mood: { type: Type.STRING } } }, market_sentiment: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, summary: { type: Type.STRING }, trend: { type: Type.STRING, enum: ['bullish', 'bearish', 'neutral'] } } }, capital_rotation: { type: Type.OBJECT, properties: { inflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, outflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, rotation_logic: { type: Type.STRING } } }, macro_logic: { type: Type.OBJECT, properties: { policy_focus: { type: Type.STRING }, external_impact: { type: Type.STRING }, core_verdict: { type: Type.STRING } } } } };
const holdingsSnapshotSchema = { 
  type: Type.OBJECT, 
  properties: { 
    totalAssets: { type: Type.NUMBER }, 
    positionRatio: { type: Type.NUMBER }, 
    date: { type: Type.STRING }, 
    holdings: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: { 
          name: { type: Type.STRING }, 
          code: { type: Type.STRING }, 
          volume: { type: Type.NUMBER }, 
          availableVolume: { type: Type.NUMBER }, // 新增
          costPrice: { type: Type.NUMBER }, 
          currentPrice: { type: Type.NUMBER }, 
          profit: { type: Type.NUMBER }, 
          profitRate: { type: Type.STRING }, 
          marketValue: { type: Type.NUMBER } 
        } 
      } 
    } 
  } 
};
const periodicReviewSchema = { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, market_trend: { type: Type.STRING, enum: ['bull', 'bear', 'sideways'] }, market_summary: { type: Type.STRING }, monthly_portfolio_summary: { type: Type.STRING }, highlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } }, lowlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } }, execution: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, details: { type: Type.STRING }, good_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } }, bad_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } } } }, stock_diagnostics: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, issues: { type: Type.ARRAY, items: { type: Type.STRING } }, verdict: { type: Type.STRING } } } }, next_period_focus: { type: Type.ARRAY, items: { type: Type.STRING } }, improvement_advice: { type: Type.ARRAY, items: { type: Type.STRING } } } };
const tradingPlanSchema = { type: Type.OBJECT, properties: { items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { symbol: { type: Type.STRING }, action: { type: Type.STRING, enum: ['buy', 'sell', 'hold', 'monitor', 't_trade'] }, price_target: { type: Type.STRING }, reason: { type: Type.STRING } } } }, summary: { type: Type.STRING } } };
const limitUpLadderSchema = { type: Type.OBJECT, properties: { scan_time: { type: Type.STRING }, total_limit_ups: { type: Type.NUMBER }, sectors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { sector_name: { type: Type.STRING }, sector_type: { type: Type.STRING, enum: ["Main", "Sub"] }, total_count: { type: Type.NUMBER }, max_height: { type: Type.NUMBER }, ladder_matrix: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { height: { type: Type.NUMBER }, count: { type: Type.NUMBER }, stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, logic: { type: Type.STRING } } } } } } }, dragon_leader: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, consecutive_days: { type: Type.NUMBER }, strength_score: { type: Type.NUMBER }, reason: { type: Type.STRING } } }, dragon_seeds: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, capital_intensity: { type: Type.STRING, enum: ["Extreme", "High", "Normal"] }, seat_analysis: { type: Type.STRING }, incubation_logic: { type: Type.STRING }, evolution_stage: { type: Type.STRING, enum: ["Seeding", "Sprouting", "Competing"] } } } }, integrity_score: { type: Type.NUMBER }, market_sentiment: { type: Type.STRING, enum: ["Rising", "Climax", "Diverging", "Falling"] } }, required: ["sector_name", "total_count", "max_height", "ladder_matrix", "dragon_leader", "integrity_score"] } }, market_conclusion: { type: Type.STRING } }, required: ["scan_time", "total_limit_ups", "sectors", "market_conclusion"] };
const sectorLadderSchema = { type: Type.OBJECT, properties: { sector_name: { type: Type.STRING }, cycle_stage: { type: Type.STRING, enum: ['Starting', 'Growing', 'Climax', 'End', 'Receding'] }, stage_label: { type: Type.STRING }, risk_score: { type: Type.NUMBER }, ladder: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { tier: { type: Type.STRING }, stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, price: { type: Type.STRING }, status: { type: Type.STRING, enum: ['Leading', 'Stagnant', 'Following', 'Weakening'] }, performance: { type: Type.STRING }, health_score: { type: Type.NUMBER }, logic: { type: Type.STRING } } } } } } }, structural_integrity: { type: Type.OBJECT, properties: { synergy_score: { type: Type.NUMBER }, verdict: { type: Type.STRING }, is_divergent: { type: Type.BOOLEAN } } }, support_points: { type: Type.ARRAY, items: { type: Type.STRING } }, warning_signals: { type: Type.ARRAY, items: { type: Type.STRING } }, action_advice: { type: Type.STRING } } };

const robustParse = (text: string): any => {
  if (!text) return null;
  let clean = text.trim();
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  const firstBrace = clean.search(/[{[]/);
  const lastCurly = clean.lastIndexOf('}');
  const lastSquare = clean.lastIndexOf(']');
  const lastIndex = Math.max(lastCurly, lastSquare);
  if (firstBrace !== -1 && lastIndex !== -1 && lastIndex > firstBrace) {
    clean = clean.substring(firstBrace, lastIndex + 1);
  }
  try {
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
};

export const fetchStockSynergy = async (
  query: string, 
  base64MarketImage: string | null, 
  base64HoldingsImage: string | null, 
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    作为顶级游资操盘手，对标的 "${query}" 进行【合力与主力成本深度审计】。
    必须从上传的第一张图片中识别最新股价。输出 JSON。
  `;
  const parts: any[] = [{ text: prompt }];
  if (base64MarketImage) parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64MarketImage } });
  if (base64HoldingsImage) parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64HoldingsImage } });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts },
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: stockSynergySchema }
  });
  const parsed = robustParse(response.text || "");
  if (!parsed || !parsed.name) throw new Error("模型返回数据不完整。");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, stockSynergyData: parsed };
};

export const fetchLimitUpLadder = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');
  const prompt = `
    【指令升级：全市场全量扫描】
    作为顶级 A 股短线量化专家，请利用 googleSearch 实时扫描今日（${dateStr}）全市场的涨停数据。
    [重要提示]：如果今日是大盘普涨行情，涨停家数可能高达数百家。请务必检索“今日涨停板复盘”或“今日涨停家数汇总”类实时深度复盘页面。
    [目标]：请返回至少 25-30 只核心领涨标的，必须覆盖 5板、4板、3板、2板 及 首板 的所有核心主线（如机器人、AI、低空经济等）。
    严禁仅返回 5 只标的。即使 JSON 会变长，也要确保梯队完整度。
  `;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: limitUpLadderSchema }
  });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, limitUpLadderData: parsed, market: MarketType.CN };
};

export const fetchDualBoardScanning = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');
  const prompt = `
    【双创大资金深度审计】
    作为顶级 A 股量化短线专家，请利用 googleSearch 实时扫描今日（${dateStr}）**创业板** 和 **科创板** 的【涨停封板】标的。
    [核心要求]：请通过全网搜索“今日双创龙虎榜”或“今日双创资金流向汇总”，捕捉至少 15-20 只 20% 涨停标的。
    对于每一只标的，必须精准返回其【连板天数（consecutive_days）】，1代表首板，2代表二连板，以此类推。
    [资金审计优先级]：1. 净买入金额（千万/亿级） 2. 大单主动买入占比 3. 是否有顶级游资/机构席位。
    严禁漏报主要板块的龙头。
  `;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: dualBoardScanSchema }
  });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, dualBoardScanData: parsed, market: MarketType.CN };
};

export const fetchMainBoardScanning = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');
  const prompt = `
    【主板大资金全量扫描】
    作为顶级 A 股量化短线专家，请利用 googleSearch 实时扫描今日（${dateStr}）**沪深主板** 的【涨停封板】标的。
    [核心指令]：今日大盘普涨，请务必搜索“今日沪深涨停板深度复盘”和“今日龙虎榜机构席位”，获取全量名单。
    请返回至少 25 只最具代表性的主板涨停标的，包含其【连板天数】和【资金细节】。
    [资金审计指标]：净买入额（net_buy_amount）、大单占比（large_order_ratio）、参与席位（seats）。
    严禁只返回少量标的。必须遵循 10% 涨停规则。
  `;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: mainBoardScanSchema }
  });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, mainBoardScanData: parsed, market: MarketType.CN };
};

export const fetchGeminiAnalysis = async (prompt: string, isComplex: boolean, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { tools: [{ googleSearch: {} }] } });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
};

export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const prompt = `生成一份 ${market} 的${period === 'day' ? '当日' : '本月'}市场深度分析报告。`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: marketDashboardSchema }
  });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, structuredData: parsed, market };
};

export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string, currentPrice?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const timeContext = now.toLocaleString('zh-CN');
  
  const prompt = `
    作为顶级 A 股量化交易专家，请对标的 "${query}" (市场: ${market}) 进行深度量化研判。
    
    【核心任务：视觉对齐与指标纠正】
    你面前有一张该标的的实时行情截图。
    1. **强制识别盘面价格**: 请优先从图中提取最新的【现价】、【涨跌幅】、【成交额/量】。
    2. **量价关系审计**: 观察图中成交量柱状图，判断当前形态是“放量攻击”、“缩量回调”还是“高位分歧”。
    3. **均线形态校准**: 识别 K 线与均线（MA5/10/20/60）的相对位置，判断是否存在明显的支撑或乖离率过大的情况。
    
    [!!! 绝对优先级逻辑 !!!]: 
    1. 如果用户手动指定了现价 (${currentPrice || '未手动指定'})，则以该价格为最高优先级。
    2. 否则，必须提取【截图中的视觉价格】作为逻辑基准进行后续诊断。
    3. 联网搜索 (googleSearch) 的数据仅用于补充行业背景、近期利好/利空公告。**严禁使用搜索到的滞后价格覆盖截图中的实时视觉数据**。
    
    参考盘面时间: ${timeContext}
    
    请输出详细诊断报告，包含：
    - 视觉提取指标 (现价、量能评分、K线位置)
    - 关键压力与支撑位 (结合图中形态提取)
    - 量化择时指令 (加仓/减仓/持有/观望)
    - 核心研判逻辑 (必须详细说明图中形态对判断的支撑作用)
  `;
  
  const parts = [
    { text: prompt },
    { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
  ];
  
  const response = await ai.models.generateContent({ 
    model: GEMINI_MODEL_PRIMARY, 
    contents: { parts },
    config: {
      tools: [{ googleSearch: {} }] 
    }
  });
  
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, market };
};

export const parseBrokerageScreenshot = async (base64Image: string, apiKey?: string): Promise<HoldingsSnapshot> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
  const textPart = { text: "解析截图中的持仓数据，输出 JSON。包含可用数量 availableVolume 字段。" };
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts: [imagePart, textPart] },
    config: { responseMimeType: "application/json", responseSchema: holdingsSnapshotSchema }
  });
  return robustParse(response.text || "{}");
};

export const fetchPeriodicReview = async (journals: any[], label: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const prompt = `对以下历史交易记录进行【${label}】阶段性复盘：${JSON.stringify(journals)}`;
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { responseMimeType: "application/json", responseSchema: periodicReviewSchema } });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, periodicData: parsed, market };
};

export const extractTradingPlan = async (content: string, apiKey?: string): Promise<{ items: PlanItem[], summary: string }> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const prompt = `从以下分析文本中提取具体的交易计划项：\n\n${content}`;
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { responseMimeType: "application/json", responseSchema: tradingPlanSchema } });
  const parsed = robustParse(response.text || "{}");
  return { items: parsed.items?.map((it: any) => ({ ...it, id: Math.random().toString(36).substr(2, 9), status: 'pending' })) || [], summary: parsed.summary || "" };
};

export const fetchSectorLadderAnalysis = async (query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `分析 ${market} 板块 "${query}" 的生命周期梯队及风险指数。`;
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: sectorLadderSchema } });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, ladderData: parsed, market };
};
