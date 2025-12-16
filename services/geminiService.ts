import { GoogleGenAI, GenerateContentResponse, Type, Schema } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType, HoldingsSnapshot, HistoricalYearData } from "../types";

const GEMINI_MODEL_FAST = "gemini-2.5-flash"; 
const GEMINI_MODEL_LITE = "gemini-flash-lite-latest"; // Fallback model for high load

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
    // New Volume Section
    market_volume: {
      type: Type.OBJECT,
      description: "Data about total trading volume and capital flow.",
      properties: {
        total_volume: { type: Type.STRING, description: "Total trading volume today, e.g. '1.5万亿' or '150B'" },
        volume_delta: { type: Type.STRING, description: "Difference vs yesterday, e.g. '放量2000亿' or '缩量5%'" },
        volume_trend: { type: Type.STRING, enum: ["expansion", "contraction", "flat"], description: "Trend direction" },
        net_inflow: { type: Type.STRING, description: "Net inflow of Main Force/Northbound, e.g. '主力净流入+50亿'" },
        capital_mood: { type: Type.STRING, description: "Summary of money flow, e.g. '增量资金进场' or '存量博弈'" }
      },
      required: ["total_volume", "volume_delta", "volume_trend", "net_inflow", "capital_mood"]
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
  required: ["market_sentiment", "market_volume", "capital_rotation", "deep_logic", "hot_topics", "opportunity_analysis", "strategist_verdict", "allocation_model"]
};

const holdingsParsingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    totalAssets: { type: Type.NUMBER, description: "Total assets amount from screenshot" },
    positionRatio: { type: Type.NUMBER, description: "Position percentage (0-100), e.g. 82.5 for 82.5%. Try to find '仓位' in image." },
    date: { type: Type.STRING, description: "Date string YYYY-MM-DD" },
    holdings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          volume: { type: Type.NUMBER, description: "Integer only. No decimals." },
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

const historicalYearSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    year: { type: Type.STRING },
    yearly_summary: { type: Type.STRING, description: "Summary of the whole year style in Chinese." },
    months: {
      type: Type.ARRAY,
      description: "Array of months data.",
      items: {
        type: Type.OBJECT,
        properties: {
          month: { type: Type.INTEGER, description: "1 to 12" },
          summary: { type: Type.STRING, description: "Monthly analysis/summary in Chinese." },
          winners: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Sector name in Chinese" },
                change_approx: { type: Type.STRING, description: "Approximate percentage change, e.g. '+15.5%'" }
              }
            }
          },
          losers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Sector name in Chinese" },
                change_approx: { type: Type.STRING, description: "Approximate percentage change, e.g. '-8.2%'" }
              }
            }
          },
          key_event: { type: Type.STRING, description: "Key macro/policy event in Chinese" }
        },
        required: ["month", "summary", "winners", "losers", "key_event"]
      }
    }
  },
  required: ["year", "yearly_summary", "months"]
};

// --- Helpers ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const cleanJsonString = (jsonStr: string): string => {
  let clean = jsonStr.trim();
  clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  clean = clean.replace(/(\d+)\.0{5,}\d*/g, '$1');
  clean = clean.replace(/(\d+\.\d{4})\d+/g, '$1');
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  return clean;
};

const compressImage = (base64Str: string, maxWidth = 1024, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = `data:image/png;base64,${base64Str}`;
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(base64Str); return; }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
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
 * Base retry logic for a single model call.
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
      
      if ((isOverloaded || isRateLimit) && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i) + (Math.random() * 500);
        console.warn(`Gemini API Busy (${msg}). Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${retries})`);
        await wait(delay);
        continue;
      }
      throw error; // Throw immediately if not retryable or last retry
    }
  }
  throw lastError;
}

/**
 * STRATEGY OPTIMIZATION: High-Level Fallback Wrapper
 * Tries Primary Model (Flash 2.5) -> Fails (503) -> Tries Lite Model (Flash Lite)
 */
export async function runGeminiSafe(
  ai: GoogleGenAI,
  params: { contents: any; config?: any },
  description: string = "Request"
): Promise<GenerateContentResponse> {
  // Attempt 1: Main Model (3 Retries)
  try {
    return await callGeminiWithRetry(() => ai.models.generateContent({
      model: GEMINI_MODEL_FAST,
      ...params
    }), 3, 2000);
  } catch (error: any) {
    const msg = (error.message || "").toLowerCase();
    // Only fallback on capacity issues
    if (msg.includes('503') || msg.includes('overloaded') || msg.includes('unavailable') || msg.includes('fetch')) {
       console.warn(`Primary model overloaded for ${description}. Switching to Flash Lite...`);
       // Attempt 2: Fallback Model (3 Retries)
       try {
         return await callGeminiWithRetry(() => ai.models.generateContent({
            model: GEMINI_MODEL_LITE,
            ...params
         }), 3, 2000);
       } catch (fallbackError: any) {
         throw new Error(`服务繁忙 (All Models Busy): ${fallbackError.message}`);
       }
    }
    throw error;
  }
}

// --- API Functions ---

export const fetchGeminiAnalysis = async (
  prompt: string,
  useReasoning: boolean = false,
  apiKey?: string
): Promise<AnalysisResult> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  
  try {
    let response: GenerateContentResponse;
    
    if (useReasoning) {
       response = await callGeminiWithRetry(() => ai.models.generateContent({
         model: "gemini-3-pro-preview",
         contents: prompt,
         config: { tools: [{ googleSearch: {} }] }
       }), 5, 3000);
    } else {
       response = await runGeminiSafe(ai, {
         contents: prompt,
         config: {
            tools: [{ googleSearch: {} }],
            systemInstruction: "你是一个专业的全球金融市场量化分析助手。请务必查询最新的【主力资金流向】、【北向资金】和【机构动向】。"
         }
       }, "Standard Analysis");
    }

    const text = response.text || "无法生成分析结果。";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks.map((chunk: any) => chunk.web).filter((web: any) => web !== undefined);

    return {
      content: text,
      groundingSource: sources,
      timestamp: Date.now(),
      modelUsed: ModelProvider.GEMINI_INTL,
      isStructured: false
    };

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const parseBrokerageScreenshot = async (
  base64Image: string,
  apiKey?: string
): Promise<HoldingsSnapshot> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key Required");

  const optimizedImage = await compressImage(base64Image);
  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  try {
    const response = await runGeminiSafe(ai, {
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: optimizedImage } },
          { text: "Analyze this brokerage screenshot. Extract: Total Assets (总资产), Position Ratio (仓位), and all Stocks (Name, Code, Volume, Cost, Price, Profit). Output raw JSON." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: holdingsParsingSchema,
      }
    }, "Image Parsing");

    const jsonText = response.text || "{}";
    try {
      const cleanJson = cleanJsonString(jsonText);
      return JSON.parse(cleanJson);
    } catch (parseError) {
      throw new Error("图片识别结果格式错误。请确保图片清晰，或尝试重新上传。");
    }
  } catch (error: any) {
    console.error("Image Parsing Error:", error);
    throw error;
  }
}

export const fetchStockDetailWithImage = async (
  base64Image: string,
  stockQuery: string,
  market: MarketType = MarketType.CN,
  apiKey?: string
): Promise<AnalysisResult> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key missing");

  const optimizedImage = await compressImage(base64Image);
  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  const marketName = market === MarketType.US ? '美股' : market === MarketType.HK ? '港股' : 'A股';

  try {
    const visionResponse = await runGeminiSafe(ai, {
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: optimizedImage } },
          { text: `Analyze stock chart for ${stockQuery}. Extract: Turnover Rate, Volume Ratio, Technical Pattern (Trend, Support). Summary in Chinese.` }
        ]
      }
    }, "Vision Extraction");

    const visualData = visionResponse.text || "（未检测到明显的盘口数据）";

    const finalResponse = await runGeminiSafe(ai, {
      contents: `Role: ${marketName} Fund Manager. Context: User looking at ${stockQuery}. Visual Info: ${visualData}. Task: Search latest price, Main Force Flow, News. Output: Markdown report (Metrics, Technicals, Funds, Action).`,
      config: { tools: [{ googleSearch: {} }] }
    }, "Stock Analysis Synthesis");

    const text = finalResponse.text || "无法生成分析结果。";
    const groundingChunks = finalResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks.map((chunk: any) => chunk.web).filter((web: any) => web !== undefined);

    return {
      content: text,
      groundingSource: sources,
      timestamp: Date.now(),
      modelUsed: ModelProvider.GEMINI_INTL,
      isStructured: false
    };

  } catch (error: any) {
    console.error("Stock Image Analysis Error:", error);
    throw error;
  }
};

export const fetchSectorHistory = async (
  year: string,
  month: string = 'all',
  market: MarketType = MarketType.CN,
  apiKey?: string
): Promise<AnalysisResult> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  try {
    const prompt = `Review ${market} market for ${year} ${month === 'all' ? 'Full Year' : month + ' Month'}. Output JSON with winners, losers, summary, key events in Chinese.`;
    
    const response = await runGeminiSafe(ai, {
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: historicalYearSchema
      }
    }, "History Review");

    const text = response.text || "{}";
    let parsedData: HistoricalYearData;
    try {
      parsedData = JSON.parse(cleanJsonString(text));
    } catch (e) {
      throw new Error("无法解析历史数据。");
    }

    return {
      content: text,
      timestamp: Date.now(),
      modelUsed: ModelProvider.GEMINI_INTL,
      isStructured: true,
      historyData: parsedData,
      market: market
    };
  } catch (error: any) {
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
  const dateStr = new Date().toLocaleDateString('zh-CN');
  
  try {
    const prompt = `
      Date: ${dateStr}. Market: ${market}.
      Generate "${period}" Market Analysis Report (Dashboard).
      Tasks:
      1. Indices & Sentiment.
      2. Volume & Capital Flow (Main Force/Northbound).
      3. Sector Rotation.
      4. Strategy (Aggressive vs Balanced).
      Output STRICT JSON matching schema.

      5. **生成实战仓位配置表 (Portfolio Table)**：
         - **必须**提供一个详细的持仓表格，包含：
           - **标的**：具体的股票名称和代码。**【重要】代码必须真实完整（如 600519），严禁使用 "600xxx" 或 "300xxx" 等掩码形式。**
           - **持仓数量/Volume**：假设初始资金10万，给出具体的建议股数（如 "800股"）。
           - **占比/Weight**：建议的持仓比例（如 "34%"）。
           - **逻辑标签**：一句话概括买入逻辑（如 "主力大幅加仓"）。
         - **务必在表格最后包含一行 "现金 (Cash)"**，用于应对短期波动。
    `;

    const response = await runGeminiSafe(ai, {
      contents: prompt + `\n\nReturn JSON strictly matching this schema: ${JSON.stringify(marketDashboardSchema)}`,
      config: {
        tools: [{ googleSearch: {} }],
      }
    }, "Market Dashboard");

    const text = response.text || "{}";
    let parsedData: MarketDashboardData;
    
    try {
      const cleanJson = cleanJsonString(text);
      parsedData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Parse Error", e);
      throw new Error("数据解析失败，请重试。");
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks.map((chunk: any) => chunk.web).filter((web: any) => web !== undefined);

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