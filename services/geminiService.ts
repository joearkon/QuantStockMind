
// STRICTLY following @google/genai coding guidelines.
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType, HoldingsSnapshot, HistoricalYearData, JournalEntry, PeriodicReviewData, PlanItem, MacroDeductionData } from "../types";

// Complex analysis uses gemini-3-pro-preview; Basic/Vision tasks use gemini-3-flash-preview.
const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";
const GEMINI_MODEL_BASIC = "gemini-3-flash-preview";

// 获取有效的 API Key (环境变量优先，本地存储兜底)
const getApiKey = () => {
  if (process.env.API_KEY) return process.env.API_KEY;
  const saved = localStorage.getItem('quantmind_settings');
  if (saved) {
    const settings = JSON.parse(saved);
    return settings.geminiKey || "";
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
    market_indices: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.STRING }, change: { type: Type.STRING }, direction: { type: Type.STRING, enum: ["up", "down"] } } } },
    market_volume: { type: Type.OBJECT, properties: { total_volume: { type: Type.STRING }, volume_delta: { type: Type.STRING }, volume_trend: { type: Type.STRING, enum: ["expansion", "contraction", "flat"] }, net_inflow: { type: Type.STRING }, capital_mood: { type: Type.STRING } }, required: ["total_volume", "volume_delta", "volume_trend", "net_inflow", "capital_mood"] },
    market_sentiment: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, summary: { type: Type.STRING }, trend: { type: Type.STRING, enum: ["bullish", "bearish", "neutral"] } }, required: ["score", "summary", "trend"] },
    capital_rotation: { type: Type.OBJECT, properties: { inflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, inflow_reason: { type: Type.STRING }, outflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, outflow_reason: { type: Type.STRING } }, required: ["inflow_sectors", "inflow_reason", "outflow_sectors", "outflow_reason"] },
    deep_logic: { type: Type.OBJECT, properties: { policy_driver: { type: Type.STRING }, external_environment: { type: Type.STRING }, market_valuation: { type: Type.STRING } }, required: ["policy_driver", "external_environment", "market_valuation"] },
    hot_topics: { type: Type.ARRAY, items: { type: Type.STRING } },
    opportunity_analysis: { type: Type.OBJECT, properties: { defensive_value: { type: Type.OBJECT, properties: { logic: { type: Type.STRING }, sectors: { type: Type.ARRAY, items: { type: Type.STRING } } } }, tech_growth: { type: Type.OBJECT, properties: { logic: { type: Type.STRING }, sectors: { type: Type.ARRAY, items: { type: Type.STRING } } } } }, required: ["defensive_value", "tech_growth"] },
    strategist_verdict: { type: Type.STRING },
    allocation_model: { type: Type.OBJECT, properties: { aggressive: { type: Type.OBJECT, properties: { strategy_name: { type: Type.STRING }, description: { type: Type.STRING }, action_plan: { type: Type.ARRAY, items: { type: Type.STRING } }, portfolio_table: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, volume: { type: Type.STRING }, weight: { type: Type.STRING }, logic_tag: { type: Type.STRING } } } }, core_advantage: { type: Type.STRING } } }, balanced: { type: Type.OBJECT, properties: { strategy_name: { type: Type.STRING }, description: { type: Type.STRING }, action_plan: { type: Type.ARRAY, items: { type: Type.STRING } }, portfolio_table: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, volume: { type: Type.STRING }, weight: { type: Type.STRING }, logic_tag: { type: Type.STRING } } } }, core_advantage: { type: Type.STRING } } } }, required: ["aggressive", "balanced"] }
  },
  required: ["data_date", "market_indices", "market_sentiment", "market_volume", "capital_rotation", "deep_logic", "hot_topics", "opportunity_analysis", "strategist_verdict", "allocation_model"]
};

// New: Added schemas for missing functions
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
    // 基础修复
    clean = clean.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/：/g, ':').replace(/，/g, ',');
    try { return JSON.parse(clean); } catch (e2) { throw new Error("JSON 结构异常"); }
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
    throw new Error(`AI 服务暂时繁忙 (${description}): ${error.message}`);
  }
}

// --- API Functions ---
export const fetchMacroForecaster = async (inputData: string, market: MarketType = MarketType.CN): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("请先在设置中配置 Gemini API Key");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    角色: 资深宏观策略师。
    分析标的: ${market} 市场，分析输入: 【${inputData}】。
    
    任务: 进行深度推演。
    1. 短期 (1-2月): 催化剂、板块轮动。
    2. 长期 (十五五规划): 战略性结构变化。

    【硬性要求】:
    - **所有输出内容必须使用简体中文，禁止出现英文单词（除股票代码外）。**
    - 使用 Google Search 工具获取最新政策动向。
    - 严格按 JSON Schema 输出。
  `;

  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, {
      contents: prompt + `\n\nSchema: ${JSON.stringify(macroForecasterSchema)}`,
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: macroForecasterSchema }
    }, "Macro Forecaster");
    const parsedData = robustParse(response.text || "{}");
    return { content: response.text || "{}", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, macroData: parsedData, market };
  } catch (error: any) { throw error; }
};

export const fetchMarketDashboard = async (period: 'day' | 'month', market = MarketType.CN): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("请先在设置中配置 Gemini API Key");
  const ai = new GoogleGenAI({ apiKey });

  const marketName = market === MarketType.US ? "美股" : market === MarketType.HK ? "港股" : "A股";
  const prompt = `
    任务: 生成 ${marketName} 市场的 ${period === 'day' ? '当日' : '本月'} 深度分析报告。
    【内容要求】:
    1. 搜索主要指数（如沪深300、恒指、纳指）的数值和涨跌。
    2. 成交额、量能趋势、主力资金流向。
    3. 市场情绪、核心驱动逻辑、热门题材。
    
    【输出要求】:
    - **必须严格使用简体中文返回所有字段值，包括指数名称、板块名称、逻辑描述。禁止出现英文。**
    - 严格匹配 JSON Schema。
    - 指数名称请使用中文，如“上证指数”而非“Shanghai Composite”。
  `;

  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, {
      contents: prompt + `\n\nSchema: ${JSON.stringify(marketDashboardSchema)}`,
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
        contents: prompt + "\n【请严格使用简体中文回答，禁止返回英文内容】", 
        config: { tools: [{ googleSearch: {} }], systemInstruction: "你是一个专业的金融量化分析助手。请全程使用简体中文沟通。" } 
    }, "Standard Analysis");
    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []).map((chunk: any) => chunk.web).filter(Boolean);
    return { content: response.text || "", groundingSource: sources, timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: false };
  } catch (error: any) { throw error; }
};

export const fetchSectorHistory = async (year: string, month = 'all', market = MarketType.CN): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `回顾 ${market} 市场在 ${year} 年 ${month} 的题材表现。请严格使用简体中文输出。`;
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, { contents: prompt, config: { tools: [{ googleSearch: {} }] } }, "History Review");
    return { content: response.text || "{}", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, historyData: robustParse(response.text || "{}"), market };
  } catch (error: any) { throw error; }
};

// Fixed: Implemented fetchStockDetailWithImage
export const fetchStockDetailWithImage = async (image: string, query: string, market: MarketType): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    请对 ${market} 市场的股票 "${query}" 进行深度分析。
    我已上传该股票的 K 线图截图。请结合视觉信息与联网搜索结果。
    
    输出必须包含：
    ## 1. 基础数据与成交量
    ## 2. 关键价位 (支撑位、压力位、止盈止损)
    ## 3. K线形态识别 (图中有无明显底部/顶部信号)
    ## 4. 操作建议
    ## 5. 核心逻辑
    
    请严格使用简体中文。
  `;
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_BASIC, {
      contents: {
        parts: [
          { inlineData: { data: image, mimeType: 'image/png' } },
          { text: prompt }
        ]
      },
      config: { tools: [{ googleSearch: {} }] }
    }, "Stock Vision Analysis");
    return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
  } catch (error: any) { throw error; }
};

// Fixed: Implemented parseBrokerageScreenshot
export const parseBrokerageScreenshot = async (base64ImageData: string): Promise<HoldingsSnapshot> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    请从这张券商持仓截图中提取持仓数据。
    需要字段：总资产、仓位占比、日期、持仓列表（名称、代码、数量、成本价、现价、盈亏、盈亏率、市值）。
    如果某个字段缺失，请尝试通过其他数值计算或设为 0。
    
    输出 JSON 格式。
  `;
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_BASIC, {
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: 'image/png' } },
          { text: prompt }
        ]
      },
      config: { responseMimeType: "application/json", responseSchema: holdingsSnapshotSchema }
    }, "Parsing Brokerage Image");
    return robustParse(response.text || "{}");
  } catch (error: any) { throw error; }
};

// Fixed: Implemented fetchPeriodicReview
export const fetchPeriodicReview = async (journals: JournalEntry[], label: string, market: MarketType): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const context = JSON.stringify(journals.map(j => ({ date: new Date(j.timestamp).toLocaleDateString(), snapshot: j.snapshot })));
  const prompt = `
    作为资深投顾，请对以下交易历史进行【${label}】阶段性总结。
    分析市场: ${market}。
    
    任务：
    1. 评估收益波动与仓位管理。
    2. 审计交易纪律执行力。
    3. 识别阶段性高光与失误。
    4. 规划下阶段战略。
    
    历史数据: ${context}
    
    必须返回 JSON 格式。
  `;
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, {
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: periodicReviewSchema, tools: [{ googleSearch: {} }] }
    }, "Periodic Review");
    const parsed = robustParse(response.text || "{}");
    return { content: response.text || "{}", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, periodicData: parsed, market };
  } catch (error: any) { throw error; }
};

// Fixed: Implemented extractTradingPlan
export const extractTradingPlan = async (analysisContent: string): Promise<{ items: PlanItem[], summary: string }> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    请从以下分析报告中提取“明日交易计划”。
    提取每只提及个股的：名称/代码、操作(buy/sell/hold/monitor/t_trade)、目标价、逻辑摘要。
    
    报告内容:
    """
    ${analysisContent}
    """
    
    返回 JSON 格式。
  `;
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_BASIC, {
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: tradingPlanSchema }
    }, "Extracting Trading Plan");
    const parsed = robustParse(response.text || "{}");
    return { items: parsed.items || [], summary: parsed.summary || "" };
  } catch (error: any) { throw error; }
};
