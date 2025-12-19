
import { GoogleGenAI, GenerateContentResponse, Type, Schema } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType, HoldingsSnapshot, HistoricalYearData, JournalEntry, PeriodicReviewData, PlanItem, HoldingItemDetailed } from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 

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
          direction: { type: Type.STRING, enum: ["up", "down"] }
        }
      }
    },
    market_volume: {
      type: Type.OBJECT,
      properties: {
        total_volume: { type: Type.STRING },
        volume_delta: { type: Type.STRING },
        volume_trend: { type: Type.STRING, enum: ["expansion", "contraction", "flat"] },
        net_inflow: { type: Type.STRING },
        capital_mood: { type: Type.STRING },
        active_buy_spread: { type: Type.STRING }
      },
      required: ["total_volume", "volume_delta", "volume_trend", "net_inflow", "capital_mood", "active_buy_spread"]
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
        inflow_reason: { type: Type.STRING },
        outflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
        outflow_reason: { type: Type.STRING },
        top_inflow_stocks: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["inflow_sectors", "inflow_reason", "outflow_sectors", "outflow_reason", "top_inflow_stocks"]
    },
    institutional_signals: {
      type: Type.OBJECT,
      properties: {
        dragon_tiger_summary: { type: Type.STRING },
        lh_top_10: {
          type: Type.ARRAY,
          description: "龙虎榜净买入排名前10位个股",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              net_buy: { type: Type.STRING, description: "净买入金额 (如: 1.25亿)" },
              logic: { type: Type.STRING, description: "上榜理由或核心席位动向" }
            }
          }
        },
        block_trade_activity: { type: Type.STRING },
        active_money_flow_trend: { type: Type.STRING }
      },
      required: ["dragon_tiger_summary", "lh_top_10", "block_trade_activity", "active_money_flow_trend"]
    }
  },
  required: ["data_date", "market_sentiment", "market_volume", "institutional_signals", "capital_rotation"]
};

// Defined missing schemas for structured AI outputs
const snapshotSchema: Schema = {
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
          marketValue: { type: Type.NUMBER }
        }
      }
    }
  },
  required: ["totalAssets", "holdings"]
};

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

const tradingPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
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
        required: ["id", "symbol", "action", "reason", "status"]
      }
    }
  },
  required: ["summary", "items"]
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const robustParse = (text: string): any => {
  if (!text) return {};
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
    try {
      return JSON.parse(clean.replace(/：/g, ':').replace(/，/g, ','));
    } catch (finalError) {
      throw new Error("JSON 解析严重失败。");
    }
  }
};

async function callGeminiWithRetry(
  apiCall: () => Promise<GenerateContentResponse>,
  retries: number = 5,
  baseDelay: number = 2000
): Promise<GenerateContentResponse> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      const msg = (error.message || "").toLowerCase();
      if ((msg.includes('503') || msg.includes('429')) && i < retries - 1) {
        await wait(baseDelay * Math.pow(2, i) + Math.random() * 1000);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function runGeminiSafe(
  ai: GoogleGenAI,
  params: { contents: any; config?: any },
  description: string = "Request"
): Promise<GenerateContentResponse> {
  return await callGeminiWithRetry(() => ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    ...params
  }), 5, 2000);
}

// Implemented missing export fetchGeminiAnalysis
export const fetchGeminiAnalysis = async (
  prompt: string,
  isComplex: boolean = false,
  apiKey?: string
): Promise<AnalysisResult> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  const modelName = isComplex ? 'gemini-3-pro-preview' : GEMINI_MODEL_PRIMARY;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
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
  } catch (error) {
    throw error;
  }
};

// Implemented missing export fetchStockDetailWithImage
export const fetchStockDetailWithImage = async (
  base64Image: string,
  query: string,
  market: MarketType,
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `分析这张股票图表并结合联网搜索对 "${query}" 在 ${market} 市场进行量化分析。`;
  
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: prompt }
      ]
    },
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    market
  };
};

// Implemented missing export parseBrokerageScreenshot
export const parseBrokerageScreenshot = async (
  base64Image: string,
  apiKey?: string
): Promise<HoldingsSnapshot> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: "提取持仓截图中的持仓数据，返回 JSON。" }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: snapshotSchema
    }
  });

  return robustParse(response.text || "{}");
};

// Implemented missing export fetchPeriodicReview
export const fetchPeriodicReview = async (
  journals: JournalEntry[],
  label: string,
  market: MarketType,
  apiKey?: string
): Promise<AnalysisResult> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  const prompt = `基于历史交易日志进行 ${label} 的阶段性复盘分析，JSON 返回。数据：${JSON.stringify(journals)}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: periodicReviewSchema
    }
  });

  const parsed = robustParse(response.text || "{}");
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    periodicData: parsed,
    market
  };
};

// Implemented missing export extractTradingPlan
export const extractTradingPlan = async (
  analysisContent: string,
  apiKey?: string
): Promise<{ items: PlanItem[]; summary: string }> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: `从以下分析内容中提取交易计划 JSON：\n\n${analysisContent}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: tradingPlanSchema
    }
  });

  return robustParse(response.text || "{}");
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
      【任务】生成 ${market} 深度量化分析看板。
      【日期要求】当前 ${new Date().toLocaleDateString()}。
      【强制检索项】
      1. 各大指数数值与成交额。
      2. 龙虎榜 (LH List)：检索今日净买入排名前 10 的个股名称、净额及上榜理由。若今日暂无，则展示最近一个交易日的数据。
      3. 资金流向：分析全场主力资金流入/流出的核心板块，及流入前 5 名标的。
      4. 情绪评分：结合涨跌家数比、封板率及炸板率给出评分。
      
      【规则】
      - 必须全中文输出。
      - 输出必须严格符合 JSON Schema: ${JSON.stringify(marketDashboardSchema)}。
    `;
    
    const response = await runGeminiSafe(ai, { 
      contents: prompt, 
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      } 
    }, "Market Dashboard");
    
    const text = response.text || "{}";
    const parsedData = robustParse(text);
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
