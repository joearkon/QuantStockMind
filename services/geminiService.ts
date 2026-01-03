
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, MarketDashboardData, HoldingsSnapshot, PeriodicReviewData, PlanItem, KLineSynergyData, DualBoardScanResponse, MainBoardScanResponse, LimitUpLadderResponse, DragonSignalResponse, StockSynergyResponse, SectorLadderData, JournalEntry, PatternHunterResponse, PatternVerificationResponse, DragonSniperResponse, SnipeVerificationResponse, AuctionDecisionResponse } from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 

// --- JSON Schemas ---

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

const dragonSniperSchema = {
  type: Type.OBJECT,
  properties: {
    detected_main_theme: { type: Type.STRING },
    theme_cycle_stage: { type: Type.STRING, enum: ["萌芽启动", "主升过热", "分歧博弈", "衰退冰点"] },
    market_sentiment_audit: { type: Type.STRING },
    overall_verdict: { type: Type.STRING, enum: ["立即准备", "观望为主", "今日无机会"] },
    risk_warning: { type: Type.STRING },
    selected_targets: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          reason_for_board: { type: Type.STRING },
          theme_purity: { type: Type.NUMBER },
          snipe_logic: { type: Type.STRING },
          trigger_conditions: {
            type: Type.OBJECT,
            properties: {
              auction_volume: { type: Type.STRING },
              opening_strategy: { type: Type.STRING },
              volume_ratio_target: { type: Type.STRING }
            },
            required: ["auction_volume", "opening_strategy", "volume_ratio_target"]
          },
          stop_loss: { type: Type.STRING },
          confidence: { type: Type.NUMBER }
        },
        required: ["name", "code", "reason_for_board", "theme_purity", "snipe_logic", "trigger_conditions", "stop_loss", "confidence"]
      }
    }
  },
  required: ["detected_main_theme", "theme_cycle_stage", "market_sentiment_audit", "overall_verdict", "selected_targets", "risk_warning"]
};

const auctionDecisionSchema = {
  type: Type.OBJECT,
  properties: {
    verdict: { type: Type.STRING, enum: ["立即出击", "持续观察", "逻辑失效/放弃"] },
    match_score: { type: Type.NUMBER },
    reasoning: { type: Type.STRING },
    suggested_entry_type: { type: Type.STRING },
    risk_factor: { type: Type.STRING }
  },
  required: ["verdict", "match_score", "reasoning", "suggested_entry_type", "risk_factor"]
};

const snipeVerificationSchema = {
  type: Type.OBJECT,
  properties: {
    actual_auction: { type: Type.STRING },
    actual_opening: { type: Type.STRING },
    actual_result: { type: Type.STRING },
    is_success: { type: Type.BOOLEAN },
    battle_review: { type: Type.STRING },
    market_synchronization: { type: Type.STRING }
  },
  required: ["actual_auction", "actual_opening", "actual_result", "is_success", "battle_review", "market_synchronization"]
};

/**
 * Robust JSON Parser 4.0 - Copied from enhanced logic to ensure reliability
 */
const robustParse = (text: string): any => {
  if (!text) return null;
  let clean = text.trim();

  // 1. Remove Markdown code block markers
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');

  // 2. Locate JSON boundaries
  const firstBrace = clean.search(/[{[]/);
  const lastCurly = clean.lastIndexOf('}');
  const lastSquare = clean.lastIndexOf(']');
  const lastIndex = Math.max(lastCurly, lastSquare);

  if (firstBrace !== -1 && lastIndex !== -1 && lastIndex > firstBrace) {
    clean = clean.substring(firstBrace, lastIndex + 1);
  }

  // 3. Try initial parse
  try {
    return JSON.parse(clean);
  } catch (e) {
    // 4. Aggressive fix logic
    try {
      clean = clean.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove comments
      clean = clean.replace(/(^|[^:])\/\/.*$/gm, '$1'); 
      clean = clean.replace(/[\u201C\u201D\u2018\u2019]/g, '"'); // Normalize quotes
      clean = clean.replace(/}\s*{/g, '}, {'); // Add missing commas between objects
      clean = clean.replace(/]\s*\[/g, '], [');
      clean = clean.replace(/,\s*}/g, '}'); // Remove trailing commas
      clean = clean.replace(/,\s*]/g, ']');
      clean = clean.replace(/：/g, ':').replace(/，/g, ','); // Chinese punctuation
      return JSON.parse(clean);
    } catch (finalError) {
      console.error("Gemini Service Parse Error:", finalError);
      return null;
    }
  }
};

/**
 * 集合竞价决胜审计 (New)
 */
export const fetchAuctionDecision = async (
  stockInfo: string,
  base64AuctionImg: string,
  strategy: string,
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `对标的 "${stockInfo}" 进行【9:25 集合竞价终极出击审计】。策略：${strategy}。必须输出 JSON。`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: base64AuctionImg } }
      ]
    },
    config: { responseMimeType: "application/json", responseSchema: auctionDecisionSchema }
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, auctionDecisionData: robustParse(response.text || "{}") };
};

export const fetchDragonSniperAnalysis = async (
  candidateStocks: string, 
  userTheme: string, 
  candidateImage: string | null,
  sentimentImage: string | null, 
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `作为顶级游资狙击手，执行【主线切换与次日打板】深度审计。用户预设: "${userTheme || '未指定'}"。必须输出 JSON。`;
  const parts: any[] = [{ text: prompt }];
  if (candidateImage) parts.push({ inlineData: { mimeType: 'image/jpeg', data: candidateImage } });
  if (sentimentImage) parts.push({ inlineData: { mimeType: 'image/jpeg', data: sentimentImage } });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts },
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: dragonSniperSchema }
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, dragonSniperData: robustParse(response.text || "{}") };
};

export const verifySnipeSuccess = async (stockInfo: string, scanDate: number, strategy: string, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const dateStr = new Date(scanDate).toLocaleDateString('zh-CN');
  const prompt = `核验标的 "${stockInfo}" 在 "${dateStr}" 次日的真实表现。必须输出 JSON。`;
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: snipeVerificationSchema } });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, snipeVerificationData: robustParse(response.text || "{}") };
};

export const fetchStockSynergy = async (query: string, base64Image: string | null, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    作为顶级游资操盘手，对标的 "${query}" 进行【合力与主力成本深度审计】。
    
    【核心审计准则 - 严禁忽略】
    1. 【视觉现价优先】：如果用户上传了 K 线/分时图截图，你必须通过 OCR 准确提取图中的【最新实时股价】。将其作为计算安全垫的“绝对现价（used_current_price）”。
    2. 【拒绝陈旧数据】：联网搜索到的价格可能存在 15 分钟以上的延迟，严禁使用延迟价格覆盖用户截图中展现的实时价格。
    3. 【主力成本锚点】：通过联网搜索该标的最近 20 个交易日的“筹码密集区”和“机构席位/大宗交易平均价”。
    4. 【安全垫计算】：公式必须为 (截图现价 - 预估成本) / 预估成本。
    
    必须输出 JSON。
  `;

  const parts: any[] = [{ text: prompt }];
  if (base64Image) parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });

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

// ... (Rest of existing fetchers)
export const fetchLimitUpLadder = async (apiKey?: string): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: "扫描涨停池。输出 JSON。", config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" } });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, limitUpLadderData: robustParse(response.text || "{}") };
};

export const fetchDualBoardScanning = async (apiKey?: string): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: "扫描双创。输出 JSON。", config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" } });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, dualBoardScanData: robustParse(response.text || "{}") };
};

export const fetchMainBoardScanning = async (apiKey?: string): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: "扫描主板。输出 JSON。", config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" } });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, mainBoardScanData: robustParse(response.text || "{}") };
};

export const fetchDragonSignals = async (apiKey?: string): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: "信号扫描。输出 JSON。", config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" } });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, dragonSignalData: robustParse(response.text || "{}") };
};

export const fetchNanxingPattern = async (query: string, apiKey?: string): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: `地量探测: ${query}`, config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" } });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, patternHunterData: robustParse(response.text || "{}") };
};

export const fetchPatternVerification = async (stockInfo: string, volumeRatio: string, base64Image: string | null, apiKey?: string): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [{ text: `验证: ${stockInfo}` }];
  if (base64Image) parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: { parts }, config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" } });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, patternVerificationData: robustParse(response.text || "{}") };
};

export const fetchGeminiAnalysis = async (prompt: string, isComplex: boolean, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { tools: [{ googleSearch: {} }] } });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
};

export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: "市场快报", config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" } });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, structuredData: robustParse(response.text || "{}"), market };
};

export const parseBrokerageScreenshot = async (base64Image: string, apiKey?: string): Promise<HoldingsSnapshot> => {
  if (!apiKey) throw new Error("Missing API Key");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: { parts: [{ text: "识别持仓" }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }] }, config: { responseMimeType: "application/json" } });
  return robustParse(response.text || "{}");
};

export const fetchPeriodicReview = async (journals: JournalEntry[], periodLabel: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: "复盘记录" });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
};

export const extractTradingPlan = async (analysisContent: string, apiKey?: string): Promise<{ items: PlanItem[], summary: string }> => {
  return { items: [], summary: "" };
};

export const fetchSectorLadderAnalysis = async (query: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: `分析板块: ${query}` });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
};

export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const parts = [{ text: `诊断: ${query}` }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }];
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: { parts } });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, market };
};
