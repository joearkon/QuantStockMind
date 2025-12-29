
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, MarketDashboardData, HoldingsSnapshot, PeriodicReviewData, PlanItem, KLineSynergyData } from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 
const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";

// KLine Synergy Schema - Enhanced for Price Roadmap
const klineSynergySchema = {
  type: Type.OBJECT,
  properties: {
    pattern_name: { type: Type.STRING },
    synergy_score: { type: Type.NUMBER },
    time_frame: { type: Type.STRING },
    logic_timeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING },
          action: { type: Type.STRING },
          psychology: { type: Type.STRING }
        },
        required: ["day", "action", "psychology"]
      }
    },
    synergy_factors: {
      type: Type.OBJECT,
      properties: {
        volume_resonance: { type: Type.NUMBER },
        price_strength: { type: Type.NUMBER },
        capital_alignment: { type: Type.NUMBER }
      },
      required: ["volume_resonance", "price_strength", "capital_alignment"]
    },
    prediction: {
      type: Type.OBJECT,
      properties: {
        trend: { type: Type.STRING, enum: ["Bullish", "Bearish", "Neutral"] },
        probability: { type: Type.STRING },
        target_window: { type: Type.STRING },
        key_observation: { type: Type.STRING },
        price_roadmap: {
          type: Type.OBJECT,
          properties: {
            tomorrow: {
              type: Type.OBJECT,
              properties: {
                range: { type: Type.STRING },
                high_target: { type: Type.STRING },
                low_support: { type: Type.STRING },
                action_hint: { type: Type.STRING }
              },
              required: ["range", "high_target", "low_support", "action_hint"]
            },
            day_after: {
              type: Type.OBJECT,
              properties: {
                range: { type: Type.STRING },
                high_target: { type: Type.STRING },
                low_support: { type: Type.STRING },
                action_hint: { type: Type.STRING }
              },
              required: ["range", "high_target", "low_support", "action_hint"]
            }
          },
          required: ["tomorrow", "day_after"]
        }
      },
      required: ["trend", "probability", "target_window", "key_observation", "price_roadmap"]
    },
    battle_summary: { type: Type.STRING }
  },
  required: ["pattern_name", "synergy_score", "time_frame", "logic_timeline", "synergy_factors", "prediction", "battle_summary"]
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

export const fetchKLineSynergyAnalysis = async (
  query: string,
  base64Image: string | null,
  market: MarketType,
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  const prompt = `
    作为资深 A 股量化交易专家，请针对标的 "${query}" 进行【3-5日K线合力与股价精准预判】。
    
    [!!! 核心约束：必须给具体价格 !!!]
    1. 联网搜索该股【今日】的真实收盘价和成交量。
    2. 识别图中或数据中的 3-5 日 K 线形态（如：多方炮、搓揉线、仙人指路等）。
    3. 合力计算：分析主力/游资/散户的筹码交换情况，给出 0-100 的合力值。
    4. **明日/后日预判**：
       - 基于今日价格，计算明日（T+1）的【合理价格波动区间】。
       - 明确给出明日的【乐观冲击目标价】和【悲观防守支撑价】。
       - 预测后日（T+2）的可能运行中轴。
    
    [视觉校准]
    ${base64Image ? "必须根据上传的截图，识别图中实体大小和影线长度，判断多空博弈的极致点。" : ""}

    请输出严格 JSON，减少大段文字。
  `;

  const contents: any = { parts: [{ text: prompt }] };
  if (base64Image) {
    contents.parts.push({
      inlineData: { mimeType: 'image/jpeg', data: base64Image }
    });
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: klineSynergySchema
    }
  });

  const parsed = robustParse(response.text || "{}");

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    klineSynergyData: parsed,
    market
  };
};

// ... 其他原有导出保持不变 ...
export const fetchGeminiAnalysis = async (prompt: string, isComplex: boolean, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = isComplex ? GEMINI_MODEL_COMPLEX : GEMINI_MODEL_PRIMARY;
  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] },
  });
  return {
    content: response.text || "",
    groundingSource: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      uri: chunk.web?.uri || "",
      title: chunk.web?.title || "网页来源"
    })),
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL
  };
};

export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: `生成一份 ${market} 市场 ${period} 的深度研报。`,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    structuredData: robustParse(response.text || "{}"),
    market
  };
};

export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: `分析股票 ${query}` }] },
    config: { tools: [{ googleSearch: {} }] }
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, market };
};

export const parseBrokerageScreenshot = async (base64Image: string, apiKey: string): Promise<HoldingsSnapshot> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: "识别持仓" }] },
    config: { responseMimeType: "application/json" }
  });
  return robustParse(response.text || "{}") as HoldingsSnapshot;
};

export const fetchPeriodicReview = async (journals: any[], label: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: `复盘持仓: ${JSON.stringify(journals)}`,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, periodicData: robustParse(response.text || "{}"), market };
};

export const extractTradingPlan = async (content: string, apiKey: string): Promise<{ items: PlanItem[], summary: string }> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: `从报告提取计划: ${content}`,
    config: { responseMimeType: "application/json" }
  });
  const parsed = robustParse(response.text || "{}");
  return { items: (parsed.items || []).map((item: any) => ({ ...item, id: Math.random().toString(36).substring(7), status: 'pending' })), summary: parsed.summary || "交易计划" };
};

export const fetchSectorLadderAnalysis = async (sectorName: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: `分析板块周期: ${sectorName}`,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, ladderData: robustParse(response.text || "{}"), market };
};
