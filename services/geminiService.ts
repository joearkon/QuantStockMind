
import { GoogleGenAI, GenerateContentResponse, Type, Schema } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketDashboardData } from "../types";

const GEMINI_MODEL_FAST = "gemini-2.5-flash"; 
const GEMINI_MODEL_REASONING = "gemini-2.5-flash"; // Using flash for JSON structure reliability in this demo

const marketDashboardSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    market_indices: {
      type: Type.ARRAY,
      description: "Current status of major A-share indices (Shanghai, Shenzhen, ChiNext). Estimate latest values if real-time not available.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name like '上证指数'" },
          value: { type: Type.STRING, description: "Current value, e.g., '3300.50'" },
          change: { type: Type.STRING, description: "Change percent, e.g., '+0.5%'" },
          direction: { type: Type.STRING, enum: ["up", "down"] }
        }
      }
    },
    market_sentiment: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: "A score from 0 to 100 indicating market sentiment (higher is better)" },
        summary: { type: Type.STRING, description: "Short summary of sentiment" },
        trend: { type: Type.STRING, enum: ["bullish", "bearish", "neutral"] }
      },
      required: ["score", "summary", "trend"]
    },
    capital_rotation: {
      type: Type.OBJECT,
      properties: {
        inflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of top 3 sectors with net inflow" },
        inflow_reason: { type: Type.STRING, description: "Reason for inflow" },
        outflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of top 3 sectors with net outflow" },
        outflow_reason: { type: Type.STRING, description: "Reason for outflow" }
      },
      required: ["inflow_sectors", "inflow_reason", "outflow_sectors", "outflow_reason"]
    },
    deep_logic: {
      type: Type.OBJECT,
      properties: {
        policy_driver: { type: Type.STRING, description: "Analysis of policy impact" },
        external_environment: { type: Type.STRING, description: "Analysis of external markets/macro" },
        market_valuation: { type: Type.STRING, description: "Analysis of valuation/technical status" }
      },
      required: ["policy_driver", "external_environment", "market_valuation"]
    },
    hot_topics: {
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of 3-5 current hot concepts or themes"
    }
  },
  required: ["market_sentiment", "capital_rotation", "deep_logic", "hot_topics"]
};

/**
 * Perform analysis using Gemini with Google Search Grounding (Text Mode).
 */
export const fetchGeminiAnalysis = async (
  prompt: string,
  useReasoning: boolean = false
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Use Gemini 3 preview for complex text tasks if requested, otherwise flash
  const modelName = useReasoning ? "gemini-3-pro-preview" : GEMINI_MODEL_FAST;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "你是一个专业的A股量化分析助手。输出Markdown格式。",
      },
    });

    const text = response.text || "无法生成分析结果。";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const sources = groundingChunks
      .map((chunk: any) => chunk.web)
      .filter((web: any) => web !== undefined);

    return {
      content: text,
      groundingSource: sources,
      timestamp: Date.now(),
      modelUsed: ModelProvider.GEMINI_INTL,
      isStructured: false
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(`模型调用失败: ${error.message || "未知错误"}`);
  }
};

/**
 * Perform structured market dashboard analysis using Gemini JSON mode.
 */
export const fetchMarketDashboard = async (
  period: 'day' | 'month'
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const prompt = `
      请根据当前A股市场情况（需基于最新互联网信息或已知数据），生成一份"${period === 'day' ? '当日' : '本月'}"的市场深度分析报告。
      
      重点关注：
      1. 主要指数表现 (上证、深证、创业板) 的大概点位和涨跌状态。
      2. 市场情绪评分 (0-100)。
      3. 资金流向的板块轮动逻辑 (流入/流出板块及原因)。
      4. 深度逻辑推演 (政策、外部环境、估值)。
      5. 当前风口题材。
      
      请确保数据具有逻辑性和专业性。
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_FAST,
      contents: prompt,
      config: {
        // Note: googleSearch is not always compatible with strict JSON schema in all SDK versions/models combined,
        // but for Gemini 2.5 Flash it often works well to prompt for search then format. 
        // Here we prioritize the schema output.
        responseMimeType: "application/json",
        responseSchema: marketDashboardSchema,
        systemInstruction: `你是一个资深A股策略分析师。请基于广义的市场认知和逻辑推演生成数据。`
      },
    });

    const jsonText = response.text || "{}";
    let parsedData: MarketDashboardData;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (e) {
      console.error("JSON Parse Error", e);
      throw new Error("解析模型返回数据失败");
    }

    return {
      content: "Dashboard Data",
      structuredData: parsedData,
      timestamp: Date.now(),
      modelUsed: ModelProvider.GEMINI_INTL,
      isStructured: true
    };

  } catch (error: any) {
    console.error("Gemini Dashboard Error:", error);
    throw new Error(`分析生成失败: ${error.message}`);
  }
};
