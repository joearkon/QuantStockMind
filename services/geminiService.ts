import { GoogleGenAI, GenerateContentResponse, Type, Schema } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType, HoldingsSnapshot, HistoricalYearData } from "../types";

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
  // Remove markdown wrapping
  clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  
  // --- ROBUST FIX: Handle Model Hallucinations (Infinite Zeros) ---
  // Fix cases like: "volume": 200.000000000000000000000...
  // Regex explains: Look for a number followed by a dot and 5+ zeros, replace with just the integer part.
  clean = clean.replace(/(\d+)\.0{5,}\d*/g, '$1');
  
  // Fix cases like: "price": 12.34567890123... -> 12.34
  // Look for number . 2 digits + 4 more digits, truncate.
  // We use a safe lookahead or simple replacement to avoid breaking valid high precision numbers if strict, 
  // but for stock prices, >4 decimals usually means hallucination loop.
  clean = clean.replace(/(\d+\.\d{4})\d+/g, '$1');

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
 */
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
        
        if (!ctx) {
          resolve(base64Str);
          return;
        }

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
 * Executes a Gemini API call with exponential backoff retry logic.
 */
export async function callGeminiWithRetry(
  apiCall: () => Promise<GenerateContentResponse>,
  retries: number = 5,
  baseDelay: number = 3000
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
        // Exponential backoff: 3000, 6000, 12000... with small random jitter
        const delay = baseDelay * Math.pow(2, i) + (Math.random() * 500);
        console.warn(`Gemini API Busy (${msg}). Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${retries})`);
        await wait(delay);
        continue;
      }
      break;
    }
  }
  
  let friendlyMsg = lastError.message || "未知错误";
  const rawMsg = friendlyMsg.toLowerCase();
  
  if (rawMsg.includes('503') || rawMsg.includes('overloaded')) {
    friendlyMsg = "模型服务繁忙 (Model Overloaded)，请稍后再试。";
  } else if (rawMsg.includes('429') || rawMsg.includes('resource_exhausted')) {
    friendlyMsg = "请求过于频繁 (Rate Limit)，请稍后再试。";
  } else {
     try {
       if (friendlyMsg.trim().startsWith('{')) {
          const jsonError = JSON.parse(friendlyMsg);
          if (jsonError.error) {
              friendlyMsg = jsonError.error.message || jsonError.error.status || `Error Code ${jsonError.error.code}`;
          } else if (jsonError.message) {
              friendlyMsg = jsonError.message;
          }
       }
     } catch (e) {
       // Ignore
     }
  }
  
  if (!friendlyMsg) friendlyMsg = "服务暂时不可用 (Unknown Error)";

  throw new Error(friendlyMsg);
}

// --- API Functions ---

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
    throw error;
  }
};

export const parseBrokerageScreenshot = async (
  base64Image: string,
  apiKey?: string
): Promise<HoldingsSnapshot> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key Required for Image Analysis");

  const optimizedImage = await compressImage(base64Image);

  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  try {
    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: GEMINI_MODEL_FAST,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: optimizedImage
            }
          },
          {
            text: "Analyze this brokerage screenshot. Extract: Total Assets (总资产), Position Ratio (仓位, 0-100), and all Stocks (Name, Code, Volume, Cost, Price, Profit). IMPORTANT RULES: 1. 'volume' must be an Integer (e.g. 100), do NOT output decimals like 200.000. 2. 'marketValue', 'costPrice', 'currentPrice' should have max 2 decimals. 3. Do not hallucinate infinite repeated numbers. OUTPUT RAW JSON ONLY."
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

  // Convert MarketType enum to proper Chinese name
  const marketNameMap = {
    [MarketType.CN]: 'A股',
    [MarketType.HK]: '港股',
    [MarketType.US]: '美股'
  };
  const marketName = marketNameMap[market] || market;

  try {
    // --- Step 1: Pure Vision Extraction (No Search Tools) ---
    // This separation ensures the model actually reads the image without tool conflict/hallucination.
    const visionPrompt = `
      【Role】You are a technical stock analyst.
      【Task】Read the provided stock chart/interface image for "${stockQuery}".
      
      Please Extract and Describe concisely in Chinese:
      1. **盘口数据 (Metrics)**:
         - 换手率 (Turnover Rate): e.g. 15.2% (High/Low?)
         - 量比 (Volume Ratio): e.g. 1.5 (Active?)
         - 成交量 (Volume): Current status relative to history.
         - 内外盘对比 (Inside/Outside): Buying vs Selling pressure if visible.
         
      2. **K线形态 (Technical Pattern)**:
         - Current Trend (Up/Down/Sideways).
         - Key Support/Resistance visible.
         - Recent bars: Large red/green candles? Gaps?
      
      Return a summary of what you see in the image.
    `;

    const visionResponse = await callGeminiWithRetry(() => ai.models.generateContent({
      model: GEMINI_MODEL_FAST,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: optimizedImage } },
          { text: visionPrompt }
        ]
      },
      // IMPORTANT: No tools here to force visual processing
    }));

    const visualData = visionResponse.text || "（未检测到明显的盘口数据，将基于通用行情分析）";

    // --- Step 2: Synthesis with Search (Text Only + Tool) ---
    const analysisPrompt = `
      【Role】你是一位精通 ${marketName} 的资深基金经理。
      【Context】用户正在关注股票：${stockQuery}。
      
      【Input Data】
      1. **视觉分析 (来自用户截图)**:
         "${visualData}"
      
      【Task】
      请结合上述视觉信息，并立刻使用 **Google Search** 联网查询该股票最新的：
      - 实时股价与涨跌幅
      - 主力资金流向 (Main Force Net Inflow)
      - 行业板块热度与新闻
      
      【Output】
      请生成一份Markdown深度诊断报告，必须包含以下章节（使用 H2 标题）：
      ## 1. 盘口与量能解码
      - **量价关系**: 结合截图中的"换手率"和"量比"以及联网查询的最新成交量，判断主力意图（吸筹/洗盘/出货？）。
      - **多空力量**: 分析当前买卖盘力量对比。
      
      ## 2. 技术面形态诊断
      - 解读K线组合与均线趋势（结合截图形态）。
      - 明确当前的 **支撑位** 和 **压力位**。
      
      ## 3. 基本面与资金共振
      - 结合联网搜索的主力资金数据和行业逻辑。
      
      ## 4. 操盘建议 (Action)
      - 给出明确的短线/中线操作策略（买入/持有/减仓/观望）。
    `;

    const finalResponse = await callGeminiWithRetry(() => ai.models.generateContent({
      model: GEMINI_MODEL_FAST,
      contents: analysisPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    }));

    const text = finalResponse.text || "无法生成分析结果。";
    const groundingChunks = finalResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
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
    const isSingleMonth = month !== 'all';
    
    // Convert MarketType enum to proper Chinese name for searching
    const marketNameMap = {
      [MarketType.CN]: '中国A股',
      [MarketType.HK]: '港股',
      [MarketType.US]: '美股'
    };
    const marketName = marketNameMap[market] || market;

    const prompt = `
      【Role】你是一名专业的金融分析师，专注于${marketName}市场。
      【Task】请搜索并复盘 ${year}年 ${isSingleMonth ? `${month}月` : '全年'} 的市场行情。
      【Language】必须使用**简体中文**输出。

      ${isSingleMonth 
        ? `请对 ${year}年${month}月 进行深度复盘。` 
        : `请生成 ${year}年 1月到12月 的月度复盘摘要。`}
      
      对于返回的每个月份，请严格包含以下信息：
      1. **领涨板块 (Winners)**: 找出涨幅最大的3-5个行业或概念板块。**必须**提供具体的涨跌幅百分比（例如 "+12.5%"），如果找不到精确数字，请根据行情描述预估幅度。
      2. **领跌板块 (Losers)**: 找出跌幅最大的3-5个板块，并附带跌幅（例如 "-8.2%"）。
      3. **月度摘要 (Summary)**: 用中文简练总结当月的市场风格、资金偏好和核心逻辑（例如："微盘股因流动性危机崩盘，资金抱团高股息"）。
      4. **关键事件 (Key Event)**: 当月对市场影响最大的一个宏观政策或黑天鹅事件。
      
      请严格按照以下 JSON Schema 输出:
      ${JSON.stringify(historicalYearSchema, null, 2)}
    `;

    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: GEMINI_MODEL_FAST,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    }));

    const text = response.text || "{}";
    let parsedData: HistoricalYearData;
    try {
      parsedData = JSON.parse(cleanJsonString(text));
    } catch (e) {
      console.warn("JSON Parse Error History", e);
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
  if (!effectiveKey) {
    throw new Error("API Key is missing. Please set GEMINI API KEY in settings or environment.");
  }

  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  
  let marketSpecificPrompt = "";
  if (market === MarketType.CN) {
    marketSpecificPrompt = "主要指数：上证/深证/科创。核心任务：【必须】搜索并分析今日的“主力资金净流入”（Main Force Net Inflow）和“北向资金”（Northbound Capital）数据。务必统计【今日成交总额】(Total Volume) 并对比昨日是【放量】还是【缩量】(Volume Delta)。";
  } else if (market === MarketType.HK) {
    marketSpecificPrompt = "主要指数：恒指/恒生科技。核心任务：分析“南向资金”（Southbound Capital）流向及今日成交额变化。";
  } else if (market === MarketType.US) {
    marketSpecificPrompt = "主要指数：道指/纳指/标普。核心任务：分析成交量变化及资金流向。";
  }

  // NOTE: We do NOT use responseMimeType: 'application/json' because it conflicts with googleSearch tool in some API versions.
  // We use prompt engineering instead.
  
  try {
    const prompt = `
      今天是 ${dateStr}。
      请根据当前【${market === 'US' ? '美股' : market === 'HK' ? '港股' : 'A股'}】市场情况（使用 Search 工具获取实时数据），生成一份"${period === 'day' ? '当日' : '本月'}"的市场深度分析报告。
      
      ${marketSpecificPrompt}

      重点任务：
      1. 分析主要指数、市场情绪。
      2. **资金与量能分析 (Capital & Volume)**:
         - **成交额**: 今日两市/市场总成交额是多少？
         - **量能对比**: 较昨日是放量还是缩量？幅度多少？
         - **资金信号**: 主力资金/北向资金是净流入还是流出？判断是“增量资金进场”还是“存量博弈”？
      3. 资金流向/板块轮动（重点是机构/主力资金）。
      4. 提供投资机会分析（防御 vs 成长）。
      5. **生成实战仓位配置表 (Portfolio Table)**：
         - 假设用户需要在两种策略中二选一：【激进型/成长】（通常高仓位）或【稳健型/防御】（通常中低仓位）。
         - 对于每种策略，请像专业的基金经理一样，给出具体的**操作步骤**（如：1. 清仓弱标的... 2. 调仓至...）。
         - **必须**提供一个详细的持仓表格，包含：
           - **标的**：具体的股票名称和代码 (A股600/000/300, 港股0XXXX, 美股Symbol)。
           - **持仓数量/Volume**：假设初始资金10万，给出具体的建议股数（如 "800股"）。
           - **占比/Weight**：建议的持仓比例（如 "34%"）。
           - **逻辑标签**：一句话概括买入逻辑（如 "主力大幅加仓"）。
         - **务必在表格最后包含一行 "现金 (Cash)"**，用于应对短期波动。
      
      IMPORTANT: You must return the result as valid JSON strictly following this schema structure. Do NOT output markdown code blocks. Output ONLY the JSON string.
      
      JSON Schema Structure:
      ${JSON.stringify(marketDashboardSchema, null, 2)}
      
      请确保数据具有逻辑性和专业性。
    `;

    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: GEMINI_MODEL_FAST,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType is intentionally removed to avoid tool conflict
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