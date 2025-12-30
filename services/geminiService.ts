
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, MarketDashboardData, HoldingsSnapshot, PeriodicReviewData, PlanItem, KLineSynergyData, ChipAnalysisData, SectorLadderData } from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 

/**
 * 统一获取 GoogleGenAI 实例。
 * 严格遵守系统指令：从 process.env.API_KEY 获取密钥。
 */
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // 抛出特定错误码，供前端 UI 捕获并引导用户进行 Key 选择
    throw new Error("MISSING_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

const robustParse = (text: string): any => {
  if (!text) return null;
  let clean = text.trim();
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  const firstBrace = clean.search(/[{[]/);
  const lastIndex = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
  if (firstBrace !== -1 && lastIndex !== -1) clean = clean.substring(firstBrace, lastIndex + 1);
  try {
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
};

const chipAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    code: { type: Type.STRING },
    current_price: { type: Type.STRING },
    control_score: { type: Type.NUMBER },
    control_status: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
    main_cost: { type: Type.STRING },
    cost_distance: { type: Type.STRING },
    profit_ratio: { type: Type.STRING },
    chip_concentration: { type: Type.STRING },
    recent_big_flow: { type: Type.STRING },
    positions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          change: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["type", "change", "description"]
      }
    },
    battle_verdict: { type: Type.STRING }
  },
  required: ["name", "code", "current_price", "control_score", "control_status", "main_cost", "cost_distance", "profit_ratio", "chip_concentration", "recent_big_flow", "positions", "battle_verdict"]
};

export const fetchInstitutionalChipAnalysis = async (
  query: string,
  _apiKey?: string,
  market: MarketType = MarketType.CN
): Promise<AnalysisResult> => {
  const ai = getAIClient();
  const prompt = `分析标的 "${query}" 的主力控盘度与核心成本。直接输出 JSON。`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_PRIMARY,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: chipAnalysisSchema
      }
    });

    return {
      content: response.text || "",
      timestamp: Date.now(),
      modelUsed: ModelProvider.GEMINI_INTL,
      isStructured: true,
      chipData: robustParse(response.text || "{}"),
      market
    };
  } catch (e: any) {
    if (e.message?.includes("entity was not found") || e.message?.includes("API key")) {
      throw new Error("MISSING_API_KEY");
    }
    throw e;
  }
};

export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType): Promise<AnalysisResult> => {
  const ai = getAIClient();
  const imagePart = { inlineData: { mimeType: 'image/png', data: base64Image } };
  const textPart = { text: `深度量化分析股票 "${query}" 的 K 线走势。` };
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_PRIMARY,
      contents: { parts: [imagePart, textPart] },
    });
    return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, market };
  } catch (e: any) {
    if (e.message?.includes("entity was not found") || e.message?.includes("API key")) {
      throw new Error("MISSING_API_KEY");
    }
    throw e;
  }
};

export const parseBrokerageScreenshot = async (base64Image: string): Promise<HoldingsSnapshot> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_PRIMARY,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: '解析持仓数据。' }
        ]
      },
      config: { responseMimeType: "application/json" }
    });
    return robustParse(response.text);
  } catch (e: any) {
    if (e.message?.includes("entity was not found") || e.message?.includes("API key")) {
      throw new Error("MISSING_API_KEY");
    }
    throw e;
  }
};

export const fetchPeriodicReview = async (journals: any[], periodLabel: string, market: MarketType): Promise<AnalysisResult> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_PRIMARY,
      contents: `分析复盘数据: ${JSON.stringify(journals)}`,
      config: { responseMimeType: "application/json" }
    });
    return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, periodicData: robustParse(response.text), market };
  } catch (e: any) {
    if (e.message?.includes("entity was not found") || e.message?.includes("API key")) {
      throw new Error("MISSING_API_KEY");
    }
    throw e;
  }
};

export const extractTradingPlan = async (analysisText: string): Promise<{ items: PlanItem[], summary: string }> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_PRIMARY,
      contents: `提取计划: ${analysisText}`,
      config: { responseMimeType: "application/json" }
    });
    const parsed = robustParse(response.text);
    if (parsed?.items) {
      parsed.items = parsed.items.map((item: any) => ({ ...item, id: item.id || Math.random().toString(36).substr(2, 9) }));
    }
    return parsed;
  } catch (e: any) {
    if (e.message?.includes("entity was not found") || e.message?.includes("API key")) {
      throw new Error("MISSING_API_KEY");
    }
    throw e;
  }
};

export const fetchSectorLadderAnalysis = async (query: string, market: MarketType): Promise<AnalysisResult> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_PRIMARY,
      contents: `分析板块: ${query}`,
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, ladderData: robustParse(response.text), market };
  } catch (e: any) {
    if (e.message?.includes("entity was not found") || e.message?.includes("API key")) {
      throw new Error("MISSING_API_KEY");
    }
    throw e;
  }
};

export const fetchChiNextMarketScan = async (): Promise<AnalysisResult> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_PRIMARY,
      contents: "扫描创业板合力个股。",
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, klineSynergyData: robustParse(response.text || "{}"), market: MarketType.CN };
  } catch (e: any) {
    if (e.message?.includes("entity was not found") || e.message?.includes("API key")) {
      throw new Error("MISSING_API_KEY");
    }
    throw e;
  }
};

export const fetchKLineSynergyAnalysis = async (query: string, base64Image: string | null, market: MarketType): Promise<AnalysisResult> => {
  const ai = getAIClient();
  const parts: any[] = [{ text: `研判 "${query}" K 线合力。` }];
  if (base64Image) parts.push({ inlineData: { mimeType: 'image/png', data: base64Image } });
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_PRIMARY,
      contents: { parts },
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, klineSynergyData: robustParse(response.text || "{}"), market };
  } catch (e: any) {
    if (e.message?.includes("entity was not found") || e.message?.includes("API key")) {
      throw new Error("MISSING_API_KEY");
    }
    throw e;
  }
};

// Fix: Implement and export missing fetchGeminiAnalysis
export const fetchGeminiAnalysis = async (prompt: string, isComplex: boolean = false, _apiKey?: string): Promise<AnalysisResult> => {
  const ai = getAIClient();
  const model = isComplex ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    
    // Fix: Extract grounding chunks for compliance
    const groundingSource = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      uri: chunk.web?.uri,
      title: chunk.web?.title
    })).filter((s: any) => s.uri) || [];

    return {
      content: response.text || "",
      timestamp: Date.now(),
      modelUsed: ModelProvider.GEMINI_INTL,
      groundingSource
    };
  } catch (e: any) {
    if (e.message?.includes("entity was not found") || e.message?.includes("API key")) {
      throw new Error("MISSING_API_KEY");
    }
    throw e;
  }
};

// Fix: Implement and export missing fetchMarketDashboard
export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, _apiKey?: string): Promise<AnalysisResult> => {
  const ai = getAIClient();
  const prompt = `你是一位资深量化金融分析师。请为 ${market} 市场生成一份${period === 'day' ? '当日' : '本月'}深度量化研判报告，并以严格的 JSON 格式返回。内容包含：各大指数表现、成交额与量能趋势、情绪水位（0-100）、资金博弈逻辑及后续策略。`;
  
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_PRIMARY,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const structuredData = robustParse(response.text || "{}");
    
    return {
      content: response.text || "",
      timestamp: Date.now(),
      modelUsed: ModelProvider.GEMINI_INTL,
      isStructured: true,
      structuredData,
      market
    };
  } catch (e: any) {
    if (e.message?.includes("entity was not found") || e.message?.includes("API key")) {
      throw new Error("MISSING_API_KEY");
    }
    throw e;
  }
};
