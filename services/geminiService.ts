
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
          value: { type: Type.STRING, description: "点位数值" },
          change: { type: Type.STRING, description: "涨跌额" },
          percent: { type: Type.STRING, description: "涨跌幅百分比" },
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
        outflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
        rotation_logic: { type: Type.STRING, description: "今日资金流动的实际路径描述" },
        top_inflow_stocks: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["inflow_sectors", "outflow_sectors", "rotation_logic", "top_inflow_stocks"]
    },
    institutional_signals: {
      type: Type.OBJECT,
      properties: {
        lh_top_10: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              net_buy: { type: Type.STRING },
              logic: { type: Type.STRING }
            }
          }
        }
      },
      required: ["lh_top_10"]
    }
  },
  required: ["data_date", "market_sentiment", "market_volume", "institutional_signals", "capital_rotation", "market_indices"]
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
      // 尝试修复中文标点
      return JSON.parse(clean.replace(/：/g, ':').replace(/，/g, ','));
    } catch (finalError) {
      console.error("JSON parse error:", text);
      return {};
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
      【任务】获取 ${market} 实时行情实况。
      【日期】${new Date().toLocaleDateString()}。
      【核心要求】
      1. **指数数据（必须且精确）**：利用搜索工具获取 A 股五大核心指数：上证指数、深证成指、创业板指、北证50、科创50 的最新数值、涨跌额、涨跌幅。
      2. **盘面实测**：全天成交额、相对于上一日的增量/减量、今日主力资金净买入 Top 10 板块及个股。
      3. **严禁虚拟/推论**：所有数值必须来自真实搜索结果，严禁输出任何宏观大局、国家战略等推导文字。
      
      【规则】
      - 全中文输出。
      - 输出必须为合法 JSON，结构: ${JSON.stringify(marketDashboardSchema)}。
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

// ...其余函数保持不变
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
      responseSchema: {
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
      }
    }
  });

  return robustParse(response.text || "{}");
};

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
      responseSchema: {
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
      }
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
      responseSchema: {
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
      }
    }
  });

  return robustParse(response.text || "{}");
};
