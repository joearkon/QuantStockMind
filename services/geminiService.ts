
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

// --- NEW: Synergy Schema ---
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

// ... (existing schemas remain the same)
const marketDashboardSchema = { type: Type.OBJECT, properties: { data_date: { type: Type.STRING }, market_indices: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.STRING }, change: { type: Type.STRING }, percent: { type: Type.STRING }, direction: { type: Type.STRING, enum: ['up', 'down'] } } } }, market_volume: { type: Type.OBJECT, properties: { total_volume: { type: Type.STRING }, volume_delta: { type: Type.STRING }, volume_trend: { type: Type.STRING, enum: ['expansion', 'contraction', 'flat'] }, capital_mood: { type: Type.STRING } } }, market_sentiment: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, summary: { type: Type.STRING }, trend: { type: Type.STRING, enum: ['bullish', 'bearish', 'neutral'] } } }, capital_rotation: { type: Type.OBJECT, properties: { inflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, outflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, rotation_logic: { type: Type.STRING } } }, macro_logic: { type: Type.OBJECT, properties: { policy_focus: { type: Type.STRING }, external_impact: { type: Type.STRING }, core_verdict: { type: Type.STRING } } } } };
const holdingsSnapshotSchema = { type: Type.OBJECT, properties: { totalAssets: { type: Type.NUMBER }, positionRatio: { type: Type.NUMBER }, date: { type: Type.STRING }, holdings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, volume: { type: Type.NUMBER }, costPrice: { type: Type.NUMBER }, currentPrice: { type: Type.NUMBER }, profit: { type: Type.NUMBER }, profitRate: { type: Type.STRING }, marketValue: { type: Type.NUMBER } } } } } };
const periodicReviewSchema = { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, market_trend: { type: Type.STRING, enum: ['bull', 'bear', 'sideways'] }, market_summary: { type: Type.STRING }, monthly_portfolio_summary: { type: Type.STRING }, highlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } }, lowlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } }, execution: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, details: { type: Type.STRING }, good_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } }, bad_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } } } }, stock_diagnostics: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, issues: { type: Type.ARRAY, items: { type: Type.STRING } }, verdict: { type: Type.STRING } } } }, next_period_focus: { type: Type.ARRAY, items: { type: Type.STRING } }, improvement_advice: { type: Type.ARRAY, items: { type: Type.STRING } } } };
const tradingPlanSchema = { type: Type.OBJECT, properties: { items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { symbol: { type: Type.STRING }, action: { type: Type.STRING, enum: ['buy', 'sell', 'hold', 'monitor', 't_trade'] }, price_target: { type: Type.STRING }, reason: { type: Type.STRING } } } }, summary: { type: Type.STRING } } };
const limitUpLadderSchema = { type: Type.OBJECT, properties: { scan_time: { type: Type.STRING }, total_limit_ups: { type: Type.NUMBER }, sectors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { sector_name: { type: Type.STRING }, sector_type: { type: Type.STRING, enum: ["Main", "Sub"] }, total_count: { type: Type.NUMBER }, max_height: { type: Type.NUMBER }, ladder_matrix: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { height: { type: Type.NUMBER }, count: { type: Type.NUMBER }, stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, logic: { type: Type.STRING } } } } } } }, dragon_leader: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, consecutive_days: { type: Type.NUMBER }, strength_score: { type: Type.NUMBER }, reason: { type: Type.STRING } } }, dragon_seeds: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, capital_intensity: { type: Type.STRING, enum: ["Extreme", "High", "Normal"] }, seat_analysis: { type: Type.STRING }, incubation_logic: { type: Type.STRING }, evolution_stage: { type: Type.STRING, enum: ["Seeding", "Sprouting", "Competing"] } } } }, integrity_score: { type: Type.NUMBER }, market_sentiment: { type: Type.STRING, enum: ["Rising", "Climax", "Diverging", "Falling"] } }, required: ["sector_name", "total_count", "max_height", "ladder_matrix", "dragon_leader", "integrity_score"] } }, market_conclusion: { type: Type.STRING } }, required: ["scan_time", "total_limit_ups", "sectors", "market_conclusion"] };
const dualBoardScanSchema = { type: Type.OBJECT, properties: { scan_time: { type: Type.STRING }, market_mood: { type: Type.STRING }, hot_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, board: { type: Type.STRING, enum: ['创业板', '科创板'] }, control_score: { type: Type.NUMBER }, cost_price: { type: Type.STRING }, trend_momentum: { type: Type.STRING }, rating: { type: Type.STRING, enum: ['起爆', '锁筹', '分歧', '出货', '潜伏'] }, volume_ratio: { type: Type.STRING }, logic: { type: Type.STRING }, target_price: { type: Type.STRING }, support_price: { type: Type.STRING } } } } } };
const mainBoardScanSchema = { type: Type.OBJECT, properties: { scan_time: { type: Type.STRING }, market_mood: { type: Type.STRING }, hot_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, board: { type: Type.STRING, enum: ['沪市主板', '深市主板'] }, limit_up_type: { type: Type.STRING, enum: ['首板', '连板'] }, consecutive_days: { type: Type.NUMBER }, control_score: { type: Type.NUMBER }, cost_price: { type: Type.STRING }, trend_momentum: { type: Type.STRING }, rating: { type: Type.STRING, enum: ['起爆', '锁筹', '分歧', '出货', '潜伏'] }, volume_ratio: { type: Type.STRING }, logic: { type: Type.STRING }, target_price: { type: Type.STRING }, support_price: { type: Type.STRING } } } } } };
const sectorLadderSchema = { type: Type.OBJECT, properties: { sector_name: { type: Type.STRING }, cycle_stage: { type: Type.STRING, enum: ['Starting', 'Growing', 'Climax', 'End', 'Receding'] }, stage_label: { type: Type.STRING }, risk_score: { type: Type.NUMBER }, ladder: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { tier: { type: Type.STRING }, stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, price: { type: Type.STRING }, status: { type: Type.STRING, enum: ['Leading', 'Stagnant', 'Following', 'Weakening'] }, performance: { type: Type.STRING }, health_score: { type: Type.NUMBER }, logic: { type: Type.STRING } } } } } } }, structural_integrity: { type: Type.OBJECT, properties: { synergy_score: { type: Type.NUMBER }, verdict: { type: Type.STRING }, is_divergent: { type: Type.BOOLEAN } } }, support_points: { type: Type.ARRAY, items: { type: Type.STRING } }, warning_signals: { type: Type.ARRAY, items: { type: Type.STRING } }, action_advice: { type: Type.STRING } } };

// Robust JSON Parser
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

/**
 * 主力合力深度审计 (NEW)
 */
export const fetchStockSynergy = async (
  query: string, 
  base64MarketImage: string | null, 
  base64HoldingsImage: string | null, 
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    作为顶级游资操盘手，对标的 "${query}" 进行【合力与主力成本深度审计】。
    
    【核心审计准则 - 严禁忽略】
    1. 【视觉现价锚定】：必须从上传的第一张图片（K线/分时图）中 OCR 识别【最新股价】，设为 used_current_price。如果图片显示已封板，请重点分析封单质量。
    2. 【持仓深度适配】：如果提供了第二张图片（持仓截图），请通过 OCR 识别用户的【持仓均价】、【持股数量】和【当前盈亏状态】。
    3. 【个性化建议】：在 action_guide 中，结合用户的真实成本和该标不的主力成本区间，给出极其具体的加仓、减仓、锁仓或止损点位指令。
    4. 【游资监控】：利用 googleSearch 检索今日该标的的“龙虎榜”或大单异动。识别是否有顶级席位（如章盟主、呼家楼、六一中路）参与。
    5. 【T+1 预判】：必须预测次日的竞价表现和全天走势，给出一个置信度分数。
    
    必须输出 JSON 格式。
  `;

  const parts: any[] = [{ text: prompt }];
  if (base64MarketImage) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64MarketImage } });
  }
  if (base64HoldingsImage) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64HoldingsImage } });
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts },
    config: { 
      tools: [{ googleSearch: {} }], 
      responseMimeType: "application/json",
      responseSchema: stockSynergySchema
    }
  });

  const parsed = robustParse(response.text || "");
  
  if (!parsed || !parsed.name) {
    throw new Error("模型返回数据不完整或解析失败，请尝试重新审计。");
  }

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    stockSynergyData: parsed
  };
};

export const fetchLimitUpLadder = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');
  const prompt = `作为顶级 A 股短线量化专家，请利用 googleSearch 实时扫描今日（${dateStr}）全市场的涨停数据并建立梯队矩阵。`;
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
  const prompt = `作为顶级 A 股量化短线专家，请利用 googleSearch 实时扫描今日（${dateStr}）**创业板** 和 **科创板** 的【涨停封板】标的并评估控盘分。`;
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
  const prompt = `作为顶级 A 股量化短线专家，请利用 googleSearch 实时扫描今日（${dateStr}）**沪深主板** 的【涨停封板】标的。`;
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

export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const parts = [{ text: `对 ${market} 的股票 "${query}" 进行深度量化分析。结合图片中的 K 线形态。` }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }];
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: { parts } });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, market };
};

export const parseBrokerageScreenshot = async (base64Image: string, apiKey?: string): Promise<HoldingsSnapshot> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
  const textPart = { text: "解析截图中的持仓数据，输出 JSON。" };
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
