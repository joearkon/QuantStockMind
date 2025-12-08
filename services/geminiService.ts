
import { GoogleGenAI, GenerateContentResponse, Type, Schema } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType } from "../types";

const GEMINI_MODEL_FAST = "gemini-2.5-flash"; 
const GEMINI_MODEL_REASONING = "gemini-2.5-flash"; 

const marketDashboardSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    market_indices: {
      type: Type.ARRAY,
      description: "Current status of major indices.",
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
        outflow_reason: { type: Type.STRING }
      },
      required: ["inflow_sectors", "inflow_reason", "outflow_sectors", "outflow_reason"]
    },
    deep_logic: {
      type: Type.OBJECT,
      properties: {
        policy_driver: { type: Type.STRING },
        external_environment: { type: Type.STRING },
        market_valuation: { type: Type.STRING }
      },
      required: ["policy_driver", "external_environment", "market_valuation"]
    },
    hot_topics: {
      type: Type.ARRAY, 
      items: { type: Type.STRING }
    },
    // New Strategy Sections
    opportunity_analysis: {
      type: Type.OBJECT,
      description: "Analysis of opportunities in Defensive/Value sectors vs Tech/Growth sectors",
      properties: {
        defensive_value: {
          type: Type.OBJECT,
          properties: {
            logic: { type: Type.STRING, description: "Why buy defensive/value now?" },
            sectors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "e.g. Bank, Coal, High Div" }
          }
        },
        tech_growth: {
          type: Type.OBJECT,
          properties: {
            logic: { type: Type.STRING, description: "Why buy tech/growth now?" },
            sectors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "e.g. AI, Semi, Robots" }
          }
        }
      },
      required: ["defensive_value", "tech_growth"]
    },
    strategist_verdict: {
      type: Type.STRING,
      description: "A one-paragraph summary of the final investment verdict by the strategist."
    },
    allocation_model: {
      type: Type.OBJECT,
      description: "Portfolio allocation suggestions for two profiles.",
      properties: {
        aggressive: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "Short description of this strategy" },
            allocation: {
              type: Type.OBJECT,
              properties: {
                equity_growth: { type: Type.NUMBER, description: "Percentage 0-100" },
                equity_value: { type: Type.NUMBER, description: "Percentage 0-100" },
                bonds_cash: { type: Type.NUMBER, description: "Percentage 0-100" }
              }
            },
            suggested_picks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 stock names or codes" }
          }
        },
        balanced: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            allocation: {
              type: Type.OBJECT,
              properties: {
                equity_growth: { type: Type.NUMBER },
                equity_value: { type: Type.NUMBER },
                bonds_cash: { type: Type.NUMBER }
              }
            },
            suggested_picks: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      },
      required: ["aggressive", "balanced"]
    }
  },
  required: ["market_sentiment", "capital_rotation", "deep_logic", "hot_topics", "opportunity_analysis", "strategist_verdict", "allocation_model"]
};

/**
 * Perform analysis using Gemini with Google Search Grounding (Text Mode).
 */
export const fetchGeminiAnalysis = async (
  prompt: string,
  useReasoning: boolean = false,
  apiKey?: string
): Promise<AnalysisResult> => {
  
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) {
    throw new Error("API Key is missing. Please set GEMINI API KEY in settings or environment.");
  }

  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  const modelName = useReasoning ? "gemini-3-pro-preview" : GEMINI_MODEL_FAST;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "你是一个专业的全球金融市场量化分析助手。请根据用户指定的市场（A股/港股/美股）输出Markdown格式的分析报告。",
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
  period: 'day' | 'month',
  market: MarketType = MarketType.CN,
  apiKey?: string
): Promise<AnalysisResult> => {
  
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) {
    throw new Error("API Key is missing. Please set GEMINI API KEY in settings or environment.");
  }

  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  
  let marketSpecificPrompt = "";
  if (market === MarketType.CN) {
    marketSpecificPrompt = "主要指数关注：上证指数、深证成指、创业板指。重点关注中国政策和内资动向。";
  } else if (market === MarketType.HK) {
    marketSpecificPrompt = "主要指数关注：恒生指数、恒生科技指数、国企指数。重点关注南向资金和外资流动。";
  } else if (market === MarketType.US) {
    marketSpecificPrompt = "主要指数关注：道琼斯、纳斯达克、标普500。重点关注美联储政策和科技巨头表现。";
  }

  try {
    const prompt = `
      今天是 ${dateStr}。
      请根据当前【${market === 'US' ? '美股' : market === 'HK' ? '港股' : 'A股'}】市场情况（需基于最新互联网信息），生成一份"${period === 'day' ? '当日' : '本月'}"的市场深度分析报告。
      
      ${marketSpecificPrompt}

      重点关注：
      1. 主要指数表现。
      2. 市场情绪评分。
      3. 资金流向与深度逻辑。
      4. 投资机会分析（防御 vs 成长）。
      5. 策略师最终建议与仓位配置模型（激进型 vs 平衡型）。
      
      请确保数据具有逻辑性和专业性。
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: marketDashboardSchema,
        systemInstruction: `你是一个资深全球市场策略分析师。请基于真实数据生成分析。`
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
      isStructured: true,
      market: market
    };

  } catch (error: any) {
    console.error("Gemini Dashboard Error:", error);
    throw new Error(`分析生成失败: ${error.message}`);
  }
};
