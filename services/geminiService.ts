
// STRICTLY following @google/genai coding guidelines.
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType, HoldingsSnapshot, HistoricalYearData, JournalEntry, PeriodicReviewData, PlanItem, MacroDeductionData } from "../types";

// Complex analysis uses gemini-3-pro-preview; Basic/Vision tasks use gemini-3-flash-preview.
export const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";
export const GEMINI_MODEL_BASIC = "gemini-3-flash-preview";

// 获取有效的 API Key (环境变量优先，本地存储兜底)
const getApiKey = () => {
  if (process.env.API_KEY) return process.env.API_KEY;
  const saved = localStorage.getItem('quantmind_settings');
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      return settings.geminiKey || "";
    } catch (e) { return ""; }
  }
  return "";
};

// --- Schemas ---
const macroForecasterSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    short_term_outlook: {
      type: Type.OBJECT,
      properties: {
        period: { type: Type.STRING },
        top_sectors: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              logic: { type: Type.STRING },
              catalysts: { type: Type.ARRAY, items: { type: Type.STRING } },
              heat_index: { type: Type.NUMBER }
            }
          }
        }
      }
    },
    strategic_planning_15th: {
      type: Type.OBJECT,
      properties: {
        theme: { type: Type.STRING },
        vision: { type: Type.STRING },
        potential_winners: { type: Type.ARRAY, items: { type: Type.STRING } },
        key_policy_indicators: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    logic_chain: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          event: { type: Type.STRING },
          impact: { type: Type.STRING },
          result: { type: Type.STRING }
        }
      }
    },
    risk_warning: { type: Type.STRING }
  },
  required: ["summary", "short_term_outlook", "strategic_planning_15th", "logic_chain", "risk_warning"]
};

const marketDashboardSchema = {
  type: Type.OBJECT,
  properties: {
    data_date: { type: Type.STRING },
    market_indices: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: { 
          name: { type: Type.STRING, description: "指数名称，如'上证指数'" }, 
          value: { type: Type.STRING, description: "指数当前数值字符串，必须纯数字或带两位小数。严禁包含任何推导过程或括号说明文字。" }, 
          change: { type: Type.STRING, description: "涨跌幅，如'+0.41%'。严禁包含任何文字说明。" }, 
          direction: { type: Type.STRING, enum: ["up", "down"] } 
        },
        required: ["name", "value", "change", "direction"]
      } 
    },
    market_volume: { type: Type.OBJECT, properties: { total_volume: { type: Type.STRING }, volume_delta: { type: Type.STRING }, volume_trend: { type: Type.STRING, enum: ["expansion", "contraction", "flat"] }, net_inflow: { type: Type.STRING }, capital_mood: { type: Type.STRING } }, required: ["total_volume", "volume_delta", "volume_trend", "net_inflow", "capital_mood"] },
    market_sentiment: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, summary: { type: Type.STRING }, trend: { type: Type.STRING, enum: ["bullish", "bearish", "neutral"] } }, required: ["score", "summary", "trend"] },
    capital_rotation: { type: Type.OBJECT, properties: { inflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, inflow_reason: { type: Type.STRING }, outflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, outflow_reason: { type: Type.STRING } }, required: ["inflow_sectors", "inflow_reason", "outflow_sectors", "outflow_reason"] },
    deep_logic: { type: Type.OBJECT, properties: { policy_driver: { type: Type.STRING, description: "宏观驱动力，所有关于数值的详细推演过程请写在这里。" }, external_environment: { type: Type.STRING }, market_valuation: { type: Type.STRING } }, required: ["policy_driver", "external_environment", "market_valuation"] },
    hot_topics: { type: Type.ARRAY, items: { type: Type.STRING } },
    opportunity_analysis: { type: Type.OBJECT, properties: { defensive_value: { type: Type.OBJECT, properties: { logic: { type: Type.STRING }, sectors: { type: Type.ARRAY, items: { type: Type.STRING } } } }, tech_growth: { type: Type.OBJECT, properties: { logic: { type: Type.STRING }, sectors: { type: Type.ARRAY, items: { type: Type.STRING } } } } }, required: ["defensive_value", "tech_growth"] },
    strategist_verdict: { type: Type.STRING },
    allocation_model: { type: Type.OBJECT, properties: { aggressive: { type: Type.OBJECT, properties: { strategy_name: { type: Type.STRING }, description: { type: Type.STRING }, action_plan: { type: Type.ARRAY, items: { type: Type.STRING } }, portfolio_table: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, volume: { type: Type.STRING }, weight: { type: Type.STRING }, logic_tag: { type: Type.STRING } } } }, core_advantage: { type: Type.STRING } } }, balanced: { type: Type.OBJECT, properties: { strategy_name: { type: Type.STRING }, description: { type: Type.STRING }, action_plan: { type: Type.ARRAY, items: { type: Type.STRING } }, portfolio_table: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, volume: { type: Type.STRING }, weight: { type: Type.STRING }, logic_tag: { type: Type.STRING } } } }, core_advantage: { type: Type.STRING } } } }, required: ["aggressive", "balanced"] }
  },
  required: ["data_date", "market_indices", "market_sentiment", "market_volume", "capital_rotation", "deep_logic", "hot_topics", "opportunity_analysis", "strategist_verdict", "allocation_model"]
};

const holdingsSnapshotSchema = {
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

const periodicReviewSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    market_summary: { type: Type.STRING },
    market_trend: { type: Type.STRING, enum: ["bull", "bear", "volatile"] },
    highlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } },
    lowlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } },
    execution: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, details: { type: Type.STRING }, good_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } }, bad_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } } } },
    next_period_focus: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["score", "market_summary", "market_trend", "highlight", "lowlight", "execution", "next_period_focus"]
};

const tradingPlanSchema = {
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
        }
      }
    },
    summary: { type: Type.STRING }
  },
  required: ["items", "summary"]
};

// --- Helpers ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const robustParse = (text: string): any => {
  if (!text) return {};
  let clean = text.trim();
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  const firstBrace = clean.search(/[{[]/);
  const lastIndex = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
  if (firstBrace !== -1 && lastIndex !== -1 && lastIndex > firstBrace) {
    clean = clean.substring(firstBrace, lastIndex + 1);
  }
  try { return JSON.parse(clean); } catch (e) {
    clean = clean.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/：/g, ':').replace(/，/g, ',');
    try { return JSON.parse(clean); } catch (e2) { throw new Error("JSON 解析失败"); }
  }
};

async function callGeminiWithRetry(apiCall: () => Promise<GenerateContentResponse>, retries = 3, baseDelay = 2000): Promise<GenerateContentResponse> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try { return await apiCall(); } catch (error: any) {
      lastError = error;
      const msg = (error.message || "").toLowerCase();
      if ((msg.includes('503') || msg.includes('overloaded') || msg.includes('429')) && i < retries - 1) {
        await wait(baseDelay * Math.pow(2, i) + (Math.random() * 1000));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function runGeminiSafe(ai: GoogleGenAI, model: string, params: { contents: any; config?: any }, description = "Request"): Promise<GenerateContentResponse> {
  try { return await callGeminiWithRetry(() => ai.models.generateContent({ model, ...params }), 5, 2000); } catch (error: any) {
    throw new Error(`AI 服务繁忙 (${description}): ${error.message}`);
  }
}

// --- API Functions ---
export const fetchMacroForecaster = async (inputData: string, market: MarketType = MarketType.CN): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key 缺失");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `分析 ${market} 市场。输入: 【${inputData}】。强制简体中文。`;
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, {
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: macroForecasterSchema }
    }, "Macro Forecaster");
    return { content: response.text || "{}", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, macroData: robustParse(response.text || "{}"), market };
  } catch (error: any) { throw error; }
};

export const fetchMarketDashboard = async (period: 'day' | 'month', market = MarketType.CN): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    任务：生成 ${market} 市场 ${period === 'day' ? '当日' : '本月'} 深度分析报告。
    
    【格式要求】：
    - 严格使用简体中文。
    - 指数数值 (value 字段) 必须为纯数字字符串，例如 "3889.35"。禁止在此字段中加入任何括号说明、动态推演描述、实时数据修正文字。
    - 涨跌幅 (change 字段) 必须为百分比字符串，例如 "+0.41%"。
    - 所有关于指数点位的动态推演逻辑、修正理由、或者是针对 JSON 格式的备注，必须全部放入 deep_logic 下的 policy_driver 字段中。
  `;
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, {
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: marketDashboardSchema }
    }, "Market Dashboard");
    return { content: response.text || "{}", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, structuredData: robustParse(response.text || "{}"), market };
  } catch (error: any) { throw error; }
};

export const fetchGeminiAnalysis = async (prompt: string, useReasoning = false): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, { 
        contents: prompt, 
        config: { tools: [{ googleSearch: {} }] } 
    }, "Standard Analysis");
    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []).map((chunk: any) => chunk.web).filter(Boolean);
    return { content: response.text || "", groundingSource: sources, timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: false };
  } catch (error: any) { throw error; }
};

export const fetchSectorHistory = async (year: string, month = 'all', market = MarketType.CN): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `回顾 ${market} 市场 ${year} 年 ${month} 题材。`;
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, { contents: prompt, config: { tools: [{ googleSearch: {} }] } }, "History Review");
    return { content: response.text || "{}", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, historyData: robustParse(response.text || "{}"), market };
  } catch (error: any) { throw error; }
};

export const fetchStockDetailWithImage = async (image: string, query: string, market: MarketType): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_BASIC, {
      contents: { parts: [{ inlineData: { data: image, mimeType: 'image/png' } }, { text: `分析 ${market} 股票 ${query}` }] },
      config: { tools: [{ googleSearch: {} }] }
    }, "Stock Vision");
    return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
  } catch (error: any) { throw error; }
};

export const parseBrokerageScreenshot = async (base64ImageData: string): Promise<HoldingsSnapshot> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_BASIC, {
      contents: { parts: [{ inlineData: { data: base64ImageData, mimeType: 'image/png' } }, { text: "提取持仓数据 JSON" }] },
      config: { responseMimeType: "application/json", responseSchema: holdingsSnapshotSchema }
    }, "Parse Image");
    return robustParse(response.text || "{}");
  } catch (error: any) { throw error; }
};

export const fetchPeriodicReview = async (journals: JournalEntry[], label: string, market: MarketType): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, {
      contents: `总结交易记录: ${JSON.stringify(journals)}`,
      config: { responseMimeType: "application/json", responseSchema: periodicReviewSchema }
    }, "Review");
    return { content: response.text || "{}", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, periodicData: robustParse(response.text || "{}"), market };
  } catch (error: any) { throw error; }
};

export const extractTradingPlan = async (analysisContent: string): Promise<{ items: PlanItem[], summary: string }> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_BASIC, {
      contents: `提取交易计划: ${analysisContent}`,
      config: { responseMimeType: "application/json", responseSchema: tradingPlanSchema }
    }, "Extract Plan");
    const parsed = robustParse(response.text || "{}");
    return { items: parsed.items || [], summary: parsed.summary || "" };
  } catch (error: any) { throw error; }
};
