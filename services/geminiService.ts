
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType, HoldingsSnapshot, JournalEntry, PlanItem } from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 
const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";

// Schema for Market Dashboard
const marketDashboardSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    data_date: { type: Type.STRING, description: "数据日期 (YYYY-MM-DD)" },
    market_indices: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          value: { type: Type.STRING },
          change: { type: Type.STRING },
          percent: { type: Type.STRING },
          direction: { type: Type.STRING, enum: ["up", "down"] }
        },
        required: ["name", "value", "change", "percent", "direction"]
      }
    },
    market_volume: {
      type: Type.OBJECT,
      properties: {
        total_volume: { type: Type.STRING },
        volume_delta: { type: Type.STRING },
        volume_trend: { type: Type.STRING, enum: ["expansion", "contraction", "flat"] },
        capital_mood: { type: Type.STRING }
      },
      required: ["total_volume", "volume_delta", "volume_trend", "capital_mood"]
    },
    market_sentiment: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        summary: { type: Type.STRING },
        trend: { type: Type.STRING, enum: ["bullish", "bearish", "neutral"] }
      },
      required: ["score", "summary", "trend"]
    },
    capital_rotation: {
      type: Type.OBJECT,
      properties: {
        inflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
        outflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
        rotation_logic: { type: Type.STRING }
      },
      required: ["inflow_sectors", "outflow_sectors", "rotation_logic"]
    },
    macro_logic: {
      type: Type.OBJECT,
      properties: {
        policy_focus: { type: Type.STRING },
        external_impact: { type: Type.STRING },
        core_verdict: { type: Type.STRING }
      },
      required: ["policy_focus", "external_impact", "core_verdict"]
    }
  },
  required: ["data_date", "market_sentiment", "market_volume", "capital_rotation", "market_indices", "macro_logic"]
};

// Schema for Holdings Snapshot (OCR/Parsing)
const holdingsSnapshotSchema: Schema = {
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
          costPrice: { type: Type.NUMBER },
          currentPrice: { type: Type.NUMBER },
          profit: { type: Type.NUMBER },
          profitRate: { type: Type.STRING },
          marketValue: { type: Type.NUMBER },
        },
        required: ["name", "code", "volume", "costPrice", "currentPrice", "profit", "profitRate", "marketValue"]
      }
    }
  },
  required: ["totalAssets", "positionRatio", "date", "holdings"]
};

// Schema for Periodic Review
const periodicReviewSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    market_trend: { type: Type.STRING, enum: ["bull", "bear", "sideways"] },
    market_summary: { type: Type.STRING },
    highlight: {
      type: Type.OBJECT,
      properties: { title: { type: Type.STRING }, description: { type: Type.STRING } },
      required: ["title", "description"]
    },
    lowlight: {
      type: Type.OBJECT,
      properties: { title: { type: Type.STRING }, description: { type: Type.STRING } },
      required: ["title", "description"]
    },
    execution: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        details: { type: Type.STRING },
        good_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } },
        bad_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["score", "details", "good_behaviors", "bad_behaviors"]
    },
    next_period_focus: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["score", "market_trend", "market_summary", "highlight", "lowlight", "execution", "next_period_focus"]
};

// Schema for Trading Plan Extraction
const tradingPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          symbol: { type: Type.STRING },
          action: { type: Type.STRING, enum: ["buy", "sell", "hold", "monitor", "t_trade"] },
          price_target: { type: Type.STRING },
          reason: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["pending", "completed", "skipped", "failed"] }
        },
        required: ["id", "symbol", "action", "price_target", "reason", "status"]
      }
    },
    summary: { type: Type.STRING }
  },
  required: ["items", "summary"]
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
    console.error("Parse error:", e);
    return null;
  }
};

/**
 * Executes a Gemini request with basic error handling wrapper
 */
export const runGeminiSafe = async (ai: any, params: any, label: string) => {
  try {
    const response = await ai.models.generateContent(params);
    return response;
  } catch (error: any) {
    console.error(`Gemini Error [${label}]:`, error);
    throw error;
  }
};

export const fetchMarketDashboard = async (
  period: 'day' | 'month',
  market: MarketType = MarketType.CN,
  apiKey?: string
): Promise<AnalysisResult> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  
  try {
    const prompt = `
      【任务】作为资深策略分析师，利用 googleSearch 获取 ${market} 市场的最新收盘或盘中数据。
      【核心字段】
      1. 五大核心指数的具体数值与百分比。
      2. 市场成交额及其增减量。
      3. 资金轮动：明确指出今日领涨板块（流入）与领跌/获利回吐板块（流出）。
      4. 宏观逻辑：分析今日市场背后的主要政策导向或外部环境（如美联储、汇率等）。
      
      【要求】
      - 严禁返回虚假或过时数据。
    `;
    
    const response = await ai.models.generateContent({ 
      model: GEMINI_MODEL_PRIMARY,
      contents: prompt, 
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: marketDashboardSchema
      } 
    });
    
    const text = response.text || "{}";
    const parsedData = robustParse(text);
    
    if (!parsedData) throw new Error("无法解析模型返回的 JSON 数据。");

    return { 
      content: text, 
      timestamp: Date.now(), 
      modelUsed: ModelProvider.GEMINI_INTL, 
      isStructured: true, 
      structuredData: parsedData, 
      market 
    };
  } catch (error: any) {
    throw error;
  }
};

export const fetchGeminiAnalysis = async (
  prompt: string,
  isComplex: boolean = false,
  apiKey?: string
): Promise<AnalysisResult> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey: effectiveKey! });
  const response = await ai.models.generateContent({
    model: isComplex ? GEMINI_MODEL_COMPLEX : GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });
  return {
    content: response.text || "",
    groundingSource: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      uri: chunk.web?.uri || "",
      title: chunk.web?.title || ""
    })).filter((s: any) => s.uri) || [],
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL
  };
};

export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: `分析股票 "${query}" 的形态逻辑。` }] },
    config: { tools: [{ googleSearch: {} }] }
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, market };
};

/**
 * Parses a brokerage screenshot to extract holdings information using Gemini Vision
 */
export const parseBrokerageScreenshot = async (base64Image: string, apiKey?: string): Promise<HoldingsSnapshot> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  
  // Always use { contents: { parts: [...] } } for multi-part requests as per guidelines.
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
        {
          text: "Identify all stock holdings, total assets, and position ratio from this brokerage screenshot.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: holdingsSnapshotSchema,
    },
  });
  
  const text = response.text || "{}";
  return robustParse(text);
};

/**
 * Performs a periodic review based on a series of journal entries
 */
export const fetchPeriodicReview = async (journalEntries: JournalEntry[], label: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  
  const prompt = `Perform a periodic review for the ${label} period in the ${market} market. 
    Analyze the following historical trading journal entries to find trends, execution quality, and next steps:
    ${JSON.stringify(journalEntries)}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_COMPLEX,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: periodicReviewSchema
    }
  });
  
  const text = response.text || "{}";
  const data = robustParse(text);

  return {
    content: text,
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    periodicData: data,
    market
  };
};

/**
 * Extracts a structured trading plan from analysis text
 */
export const extractTradingPlan = async (analysisText: string, apiKey?: string): Promise<{ items: PlanItem[], summary: string }> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: `请从以下复盘分析文本中提取结构化的【交易计划】。
      [注意]: 所有输出字段（股票名、操作理由、策略总结）必须使用【中文】。
      分析文本如下: ${analysisText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: tradingPlanSchema
    }
  });
  
  const text = response.text || "{}";
  const data = robustParse(text);

  return {
    items: data.items || [],
    summary: data.summary || ""
  };
};
