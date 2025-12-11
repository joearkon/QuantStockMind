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
        inflow_reason: { type: Type.STRING, description: "Focus on Main Force/Institutional buying logic" },
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

// --- Helpers ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const cleanJsonString = (jsonStr: string): string => {
  let clean = jsonStr.trim();
  // Remove markdown wrapping
  clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  
  // Find valid JSON bounds
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  
  return clean;
};

/**
 * Optimizes base64 image string by resizing and compressing it via Canvas.
 * Solves issue where large screenshots cause API timeouts or network failures.
 */
const compressImage = (base64Str: string, maxWidth = 1024, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    // If running on server or without DOM, return original
    if (typeof document === 'undefined') {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    // Prefix with potentially wrong mime type is usually fine for browser to sniff, 
    // but we use png as generic fallback if unknown.
    img.src = `data:image/png;base64,${base64Str}`;

    img.onload = () => {
      try {
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(base64Str);
          return;
        }

        // Fill background white (handle transparent PNGs converting to JPEG)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with reduced quality
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        // Remove prefix
        const result = dataUrl.split(',')[1];
        resolve(result);
      } catch (e) {
        console.warn("Image compression failed, using original.", e);
        resolve(base64Str);
      }
    };

    img.onerror = (e) => {
      console.warn("Image load error, using original.", e);
      resolve(base64Str);
    };
  });
};

/**
 * Executes a Gemini API call with exponential backoff retry logic.
 * Handles 503 (Overloaded) and 429 (Rate Limit) errors.
 */
async function callGeminiWithRetry(
  apiCall: () => Promise<GenerateContentResponse>,
  retries: number = 3,
  baseDelay: number = 2000
): Promise<GenerateContentResponse> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      const msg = (error.message || JSON.stringify(error)).toLowerCase();
      const isOverloaded = msg.includes('503') || msg.includes('overloaded') || msg.includes('unavailable');
      const isRateLimit = msg.includes('429') || msg.includes('resource_exhausted');
      
      // Retry only on transient errors
      if ((isOverloaded || isRateLimit) && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`Gemini API Busy (${msg}). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await wait(delay);
        continue;
      }
      
      // If it's not retriable or out of attempts, stop
      break;
    }
  }
  
  // Format the error for UI display before throwing
  let friendlyMsg = lastError.message || "未知错误";
  const rawMsg = friendlyMsg.toLowerCase();
  
  // 1. Check for common HTTP codes in message
  if (rawMsg.includes('503') || rawMsg.includes('overloaded')) {
    friendlyMsg = "模型服务繁忙 (Model Overloaded)，请稍后再试。";
  } else if (rawMsg.includes('429') || rawMsg.includes('resource_exhausted')) {
    friendlyMsg = "请求过于频繁 (Rate Limit)，请稍后再试。";
  } else {
     // 2. Try to parse JSON error message if possible to extract 'message'
     try {
       // Check if it looks like JSON first to avoid syntax error in console
       if (friendlyMsg.trim().startsWith('{')) {
          const jsonError = JSON.parse(friendlyMsg);
          // Handle nested Google API Error format: { error: { code: 500, message: "", status: "INTERNAL_SERVER_ERROR" } }
          if (jsonError.error) {
              friendlyMsg = jsonError.error.message || jsonError.error.status || `Error Code ${jsonError.error.code}`;
          } else if (jsonError.message) {
              friendlyMsg = jsonError.message;
          }
       }
     } catch (e) {
       // Ignore parse error, use original
     }
  }
  
  // Final fallback if parsing resulted in empty string
  if (!friendlyMsg) friendlyMsg = "服务暂时不可用 (Unknown Error)";

  throw new Error(friendlyMsg);
}

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
    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "你是一个专业的全球金融市场量化分析助手。请务必查询最新的【主力资金流向】（Main Force Fund Flow）、【北向资金】（Northbound Capital）和【机构动向】。请根据用户指定的市场（A股/港股/美股）输出Markdown格式的分析报告。",
      },
    }));

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
    console.error("Gemini Analysis Error:", error);
    throw error; // Already formatted by callGeminiWithRetry
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

  // COMPRESS: Optimize image before sending to prevent timeouts and reduce latency
  const optimizedImage = await compressImage(base64Image);

  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  try {
    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: GEMINI_MODEL_FAST,
      contents: {
        parts: [
          {
            inlineData: {
              // We explicitly convert to JPEG in compressImage for better compression ratio
              mimeType: 'image/jpeg',
              data: optimizedImage
            }
          },
          {
            text: "Analyze this image. Identify Total Assets (总资产) and Date. List all stocks with Name, Code (infer 6-digit if missing), Volume (持仓), Cost (成本), Current Price (现价), Profit (盈亏), Profit Rate (盈亏率%), Market Value (市值). OUTPUT RAW JSON ONLY. DO NOT USE MARKDOWN BLOCK. NO ```json."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: holdingsParsingSchema,
      }
    }));

    const jsonText = response.text || "{}";
    
    try {
      const cleanJson = cleanJsonString(jsonText);
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("JSON Parse Error (Image)", parseError, jsonText);
      throw new Error("图片识别结果格式错误。请确保图片清晰，或尝试重新上传。");
    }

  } catch (error: any) {
    console.error("Image Parsing Error:", error);
    throw error;
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
    marketSpecificPrompt = "主要指数：上证/深证/科创。核心任务：【必须】搜索并分析今日的“主力资金净流入”（Main Force Net Inflow）和“北向资金”（Northbound Capital）数据。在“资金轮动”部分明确指出哪些板块是“机构/主力”在买入。";
  } else if (market === MarketType.HK) {
    marketSpecificPrompt = "主要指数：恒指/恒生科技。核心任务：分析“南向资金”（Southbound Capital）流向及外资机构动向。";
  } else if (market === MarketType.US) {
    marketSpecificPrompt = "主要指数：道指/纳指/标普。核心任务：分析华尔街机构（Institutional Money）流向及科技巨头动向。";
  }

  // NOTE: When using 'googleSearch' tool, we CANNOT use 'responseMimeType: "application/json"'.
  // Instead, we MUST inject the schema into the prompt and parse the text response manually.
  
  try {
    const prompt = `
      今天是 ${dateStr}。
      请根据当前【${market === 'US' ? '美股' : market === 'HK' ? '港股' : 'A股'}】市场情况（使用 Search 工具获取实时数据），生成一份"${period === 'day' ? '当日' : '本月'}"的市场深度分析报告。
      
      ${marketSpecificPrompt}

      重点任务：
      1. 分析主要指数、市场情绪、资金流向（重点是机构/主力资金）。
      2. 提供投资机会分析（防御 vs 成长）。
      3. **生成实战仓位配置表 (Portfolio Table)**：
         - 假设用户需要在两种策略中二选一：【激进型/成长】（通常高仓位）或【稳健型/防御】（通常中低仓位）。
         - 对于每种策略，请像专业的基金经理一样，给出具体的**操作步骤**（如：1. 清仓弱标的... 2. 调仓至...）。
         - **必须**提供一个详细的持仓表格，包含：
           - **标的**：具体的股票名称和代码 (A股600/000/300, 港股0XXXX, 美股Symbol)。
           - **持仓数量/Volume**：假设初始资金10万，给出具体的建议股数（如 "800股"）。
           - **占比/Weight**：建议的持仓比例（如 "34%"）。
           - **逻辑标签**：一句话概括买入逻辑（如 "主力大幅加仓"）。
         - **务必在表格最后包含一行 "现金 (Cash)"**，用于应对短期波动。
         - 确保推荐的个股具有代表性和流动性，符合当前的"Deep Logic"分析。
      
      IMPORTANT: You must return the result as valid JSON strictly following this schema structure. Do NOT output markdown code blocks.
      
      JSON Schema Structure:
      ${JSON.stringify(marketDashboardSchema, null, 2)}
      
      请确保数据具有逻辑性和专业性。
    `;

    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: GEMINI_MODEL_FAST,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // REMOVED: responseMimeType: "application/json" IS NOT SUPPORTED WITH googleSearch
        // REMOVED: responseSchema: marketDashboardSchema
        systemInstruction: `你是一个资深基金经理。在分析资金流向时，必须区分"散户"与"主力/机构"。在"capital_rotation"字段中，请特指主力资金的流向。`
      },
    }));

    const text = response.text || "{}";
    let parsedData: MarketDashboardData;
    
    try {
      const cleanJson = cleanJsonString(text);
      parsedData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Parse Error", e);
      console.log("Raw Text:", text);
      throw new Error("无法解析模型返回的数据 (JSON Parse Error)。请重试，或尝试使用其他模型。");
    }

    // Get sources if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk: any) => chunk.web)
      .filter((web: any) => web !== undefined);

    return {
      content: text,
      groundingSource: sources,
      timestamp: Date.now(),
      modelUsed: ModelProvider.GEMINI_INTL,
      isStructured: true,
      structuredData: parsedData,
      market: market
    };

  } catch (error: any) {
    console.error("Gemini Dashboard Error:", error);
    throw error;
  }
};