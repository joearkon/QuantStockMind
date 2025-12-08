import { GoogleGenAI, GenerateContentResponse, Type, Schema } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType, HoldingsSnapshot } from "../types";

const GEMINI_MODEL_FAST = "gemini-2.5-flash"; 
const GEMINI_MODEL_REASONING = "gemini-2.5-flash"; 

// --- Schemas ---

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
      description: "Detailed Portfolio construction for two different strategies.",
      properties: {
        aggressive: {
          type: Type.OBJECT,
          properties: {
            strategy_name: { type: Type.STRING, description: "e.g., 激进型成长策略 (仓位≈80%)" },
            description: { type: Type.STRING, description: "Short description" },
            action_plan: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Step by step actions, e.g. 1. Clear weak stocks..." },
            portfolio_table: {
              type: Type.ARRAY,
              description: "List of specific stocks",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  code: { type: Type.STRING },
                  volume: { type: Type.STRING, description: "Specific share count or amount, e.g. '800股' or '约2000元'" },
                  weight: { type: Type.STRING, description: "Percentage, e.g. '34%'" },
                  logic_tag: { type: Type.STRING, description: "Short logic tag, e.g. AI Leader" }
                }
              }
            },
            core_advantage: { type: Type.STRING, description: "Summary of why this portfolio fits the current market" }
          }
        },
        balanced: {
          type: Type.OBJECT,
          properties: {
            strategy_name: { type: Type.STRING, description: "e.g., 稳健防御策略 (仓位≈50%)" },
            description: { type: Type.STRING },
            action_plan: { type: Type.ARRAY, items: { type: Type.STRING } },
            portfolio_table: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  code: { type: Type.STRING },
                  volume: { type: Type.STRING },
                  weight: { type: Type.STRING },
                  logic_tag: { type: Type.STRING }
                }
              }
            },
            core_advantage: { type: Type.STRING }
          }
        }
      },
      required: ["aggressive", "balanced"]
    }
  },
  required: ["market_sentiment", "capital_rotation", "deep_logic", "hot_topics", "opportunity_analysis", "strategist_verdict", "allocation_model"]
};

const holdingsParsingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    totalAssets: { type: Type.NUMBER, description: "Total assets amount from screenshot" },
    date: { type: Type.STRING, description: "Date string YYYY-MM-DD" },
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

// --- API Functions ---

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
 * Parse brokerage app screenshot using Gemini Vision
 */
export const parseBrokerageScreenshot = async (
  base64Image: string,
  apiKey?: string
): Promise<HoldingsSnapshot> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key Required for Image Analysis");

  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_FAST,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: "Identify the Total Assets (总资产) and list all stocks in this screenshot. For each stock, extract Name, Code (infer 6-digit code if only name exists), Volume (持仓), Cost Price (成本), Current Price (现价), Profit/Loss amount (盈亏), Profit Rate (盈亏率%), and Market Value (市值). Return JSON."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: holdingsParsingSchema,
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText);

  } catch (error: any) {
    console.error("Image Parsing Error:", error);
    throw new Error("Screenshot parsing failed. Please try a clearer image or manual input.");
  }
}

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
    marketSpecificPrompt = "主要指数关注：上证指数、深证成指、创业板指、科创50。重点关注中国政策、内资动向及高低切换逻辑。";
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

      重点任务：
      1. 分析主要指数、市场情绪、资金流向。
      2. 提供投资机会分析（防御 vs 成长）。
      3. **生成实战仓位配置表 (Portfolio Table)**：
         - 假设用户需要在两种策略中二选一：【激进型/成长】（通常高仓位）或【稳健型/防御】（通常中低仓位）。
         - 对于每种策略，请像专业的基金经理一样，给出具体的**操作步骤**（如：1. 清仓弱标的... 2. 调仓至...）。
         - **必须**提供一个详细的持仓表格，包含：
           - **标的**：具体的股票名称和代码 (A股600/000/300, 港股0XXXX, 美股Symbol)。
           - **持仓数量/Volume**：假设初始资金10万，给出具体的建议股数（如 "800股"）。
           - **占比/Weight**：建议的持仓比例（如 "34%"）。
           - **逻辑标签**：一句话概括买入逻辑（如 "新质生产力龙头"）。
         - **务必在表格最后包含一行 "现金 (Cash)"**，用于应对短期波动。
         - 确保推荐的个股具有代表性和流动性，符合当前的"Deep Logic"分析。
      
      请确保数据具有逻辑性和专业性。
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: marketDashboardSchema,
        systemInstruction: `你是一个资深基金经理。在生成"allocation_model"时，必须提供具体的股票代码(如 600xxx, 300xxx)和明确的持仓数量与比例。表格最后必须包含"现金"行。不要使用模糊的建议。`
      },
    });

    const jsonText = response.text || "{}";
    let parsedData: MarketDashboardData;
    try {
      let cleanJson = jsonText;
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      } else {
        // Fallback cleanup if needed
        cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();
      }
      parsedData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Parse Error", e);
      throw new Error("无法解析模型返回的数据，请重试。");
    }

    return {
      content: jsonText,
      groundingSource: [],
      timestamp: Date.now(),
      modelUsed: ModelProvider.GEMINI_INTL,
      isStructured: true,
      structuredData: parsedData,
      market: market
    };

  } catch (error: any) {
    console.error("Gemini Dashboard Error:", error);
    throw new Error(`仪表盘生成失败: ${error.message || "未知错误"}`);
  }
};
