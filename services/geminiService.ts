import { GoogleGenAI, GenerateContentResponse, Type, Schema } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType, HoldingsSnapshot, HistoricalYearData, JournalEntry, PeriodicReviewData, PlanItem } from "../types";

// STRICTLY USE 2.5 FLASH. NO DOWNGRADE.
const GEMINI_MODEL_PRIMARY = "gemini-2.5-flash"; 

// --- Schemas ---

const marketDashboardSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    data_date: { type: Type.STRING, description: "The actual date of the data found (YYYY-MM-DD) or 'Realtime'." },
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
  required: ["data_date", "market_sentiment", "market_volume", "capital_rotation", "deep_logic", "hot_topics", "opportunity_analysis", "strategist_verdict", "allocation_model"]
};

const tradingPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          symbol: { type: Type.STRING, description: "Stock Name or Code" },
          action: { type: Type.STRING, enum: ['buy', 'sell', 'hold', 'monitor', 't_trade'] },
          price_target: { type: Type.STRING, description: "Target Price or Range, e.g. >15.5 or 10-10.5" },
          reason: { type: Type.STRING, description: "Short rationale in Chinese" }
        },
        required: ["symbol", "action", "price_target", "reason"]
      }
    },
    strategy_summary: { type: Type.STRING, description: "Overall strategy for the day in Chinese" }
  },
  required: ["items", "strategy_summary"]
};

const periodicReviewSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER, description: "0-100 Overall Performance Score" },
    market_summary: { type: Type.STRING, description: "Summary of market condition" },
    market_trend: { type: Type.STRING, enum: ["bull", "bear", "volatile"] },
    highlight: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Best trade or decision" },
        description: { type: Type.STRING }
      },
      required: ["title", "description"]
    },
    lowlight: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Worst trade or drawdown" },
        description: { type: Type.STRING }
      },
      required: ["title", "description"]
    },
    execution: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: "Execution discipline score 0-100" },
        details: { type: Type.STRING },
        good_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } },
        bad_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["score", "details", "good_behaviors", "bad_behaviors"]
    },
    next_period_focus: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Strategic checklist for next period"
    }
  },
  required: ["score", "market_summary", "market_trend", "highlight", "lowlight", "execution", "next_period_focus"]
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

/**
 * Military-grade JSON Parser 2.0
 * Handles comments, missing commas, unquoted keys, and aggressive LLM artifacts.
 */
const robustParse = (text: string): any => {
  if (!text) return {};
  let clean = text.trim();
  
  // 1. Strip Markdown Code Blocks
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  
  // 2. Locate JSON boundaries (Do this FIRST to avoid cleaning non-JSON parts)
  const firstBrace = clean.search(/[{[]/);
  const lastCurly = clean.lastIndexOf('}');
  const lastSquare = clean.lastIndexOf(']');
  const lastIndex = Math.max(lastCurly, lastSquare);
  
  if (firstBrace !== -1 && lastIndex !== -1 && lastIndex > firstBrace) {
    clean = clean.substring(firstBrace, lastIndex + 1);
  }

  // 3. First Attempt: Optimistic Parse
  try {
    return JSON.parse(clean);
  } catch (e) {
    // Proceed to repairs
  }

  // 4. Aggressive Fixes

  // Fix: Strip Comments safely (avoid stripping http://)
  // Remove block comments
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove line comments that start at line beginning or after structural chars
  clean = clean.replace(/(^|[{,\[\]])\s*\/\/.*$/gm, '$1'); 

  // Fix: Quote normalization
  clean = clean.replace(/[\u201C\u201D]/g, '"'); 
  
  // Fix: Floating point artifacts (Gemini sometimes outputs 1.000000001)
  clean = clean.replace(/(\d+)\.0{5,}\d*/g, '$1');

  // Fix: Missing commas between objects/arrays } { -> }, {
  clean = clean.replace(/}\s*{/g, '}, {');
  clean = clean.replace(/]\s*\[/g, '], [');
  
  // Fix: Missing commas between string array items "A" "B" -> "A", "B"
  // Safer regex: look for Quote-Space-Quote
  clean = clean.replace(/"\s+(?=")/g, '", ');

  // Fix: Trailing Commas
  clean = clean.replace(/,\s*}/g, '}');
  clean = clean.replace(/,\s*]/g, ']');

  // Fix: Chinese Punctuation
  clean = clean.replace(/：/g, ':').replace(/，/g, ',');

  // Fix: Unquoted keys
  clean = clean.replace(/([{,]\s*)([a-zA-Z0-9_]+?)\s*:/g, '$1"$2":');
  
  // Fix: NaN/Infinity
  clean = clean.replace(/\bNaN\b/g, 'null');
  clean = clean.replace(/\bInfinity\b/g, 'null');

  try {
    return JSON.parse(clean);
  } catch (finalError) {
    console.error("Robust parse failed completely.", finalError);
    // console.log("Failed JSON text:", clean);
    throw new Error("JSON 解析严重失败 (Syntax Error)。模型返回了非法格式。");
  }
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
        const delay = baseDelay * Math.pow(2, i) + (Math.random() * 1000);
        console.warn(`Gemini API Busy (${msg}). Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${retries})`);
        await wait(delay);
        continue;
      }
      throw error; // Throw immediately if not retryable or last retry
    }
  }
  throw lastError;
}

export async function runGeminiSafe(
  ai: GoogleGenAI,
  params: { contents: any; config?: any },
  description: string = "Request"
): Promise<GenerateContentResponse> {
  try {
    return await callGeminiWithRetry(() => ai.models.generateContent({
      model: GEMINI_MODEL_PRIMARY,
      ...params
    }), 5, 2000);
  } catch (error: any) {
    const msg = (error.message || "").toLowerCase();
    throw new Error(`AI 服务暂时繁忙 (${description}): ${msg}. 请稍后重试。`);
  }
}

// --- API Functions ---

export const extractTradingPlan = async (
  analysisContent: string,
  apiKey?: string
): Promise<{ items: PlanItem[], summary: string }> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  // Extract the "Action" section roughly to save context window if possible, 
  // but Gemini Context window is large enough for full report usually.
  // We'll pass the full content for better context.
  
  const prompt = `
    Role: Professional Trading Assistant.
    Extract specific, actionable trading instructions from the following analysis report into a structured JSON checklist for the next trading day.

    SOURCE ANALYSIS:
    """
    ${analysisContent}
    """

    TASK:
    1. Identify specific actions for each stock mentioned (Buy, Sell, Hold, Monitor, or T-Trade/做T).
    2. Extract target prices (Stop Profit/Stop Loss) if mentioned.
    3. Summarize the logic briefly.
    4. Provide an overall strategy summary.

    IMPORTANT: OUTPUT IN SIMPLIFIED CHINESE (简体中文). 
    Ensure 'reason' and 'strategy_summary' are in Chinese.

    OUTPUT JSON ONLY. NO COMMENTS.
  `;

  try {
    const response = await runGeminiSafe(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: tradingPlanSchema
      }
    }, "Plan Extraction");

    const text = response.text || "{}";
    const parsed = robustParse(text);
    
    // Augment with IDs and default status
    const items = (parsed.items || []).map((item: any) => ({
      ...item,
      id: crypto.randomUUID(),
      status: 'pending'
    }));

    return {
      items,
      summary: parsed.strategy_summary || "无总纲"
    };

  } catch (error: any) {
    console.error("Plan Extraction Error:", error);
    throw error;
  }
};

export const fetchPeriodicReview = async (
  journals: JournalEntry[],
  periodLabel: string,
  market: MarketType,
  apiKey?: string
): Promise<AnalysisResult> => {
  const effectiveKey = apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  // 1. Serialize Journals into a readable string for the model
  const sortedJournals = [...journals].sort((a, b) => a.timestamp - b.timestamp);
  
  if (sortedJournals.length < 1) {
    throw new Error("日志数据不足，无法生成阶段性复盘。请至少保存一条历史记录。");
  }

  const journalSummary = sortedJournals.map((j, idx) => {
    const date = new Date(j.timestamp).toLocaleDateString();
    const assets = j.snapshot.totalAssets;
    const holdingsStr = j.snapshot.holdings.map(h => `${h.name}(${h.profitRate})`).join(', ');
    const adviceSnippet = j.analysis?.content ? j.analysis.content.substring(0, 300).replace(/\n/g, ' ') + "..." : "无建议";
    
    return `
    [Log #${idx + 1} - Date: ${date}]
    - Total Assets: ${assets}
    - Holdings: ${holdingsStr}
    - AI Advice at that time: ${adviceSnippet}
    `;
  }).join('\n------------------\n');

  const prompt = `
    Role: Senior Trading Coach / Portfolio Manager.
    Context: You are reviewing a user's trading journal for the period: 【${periodLabel}】.
    Market: ${market}.

    Here is the sequence of the user's trading logs (Chronological Order):
    ${journalSummary}

    Task: Generate a structured "Periodic Performance Review" in JSON.
    
    REQUIREMENTS:
    1. Score: 0-100 based on asset growth and discipline.
    2. Market Trend: Bull/Bear/Volatile based on recent performance.
    3. Highlight: The best decision or trade.
    4. Lowlight: The worst decision or drawdown.
    5. Execution Audit: Analyze if user followed previous AI advice. List specific Good/Bad behaviors.
    6. Next Focus: Actionable list.

    OUTPUT JSON ONLY. NO COMMENTS.
  `;

  try {
    const response = await runGeminiSafe(ai, {
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: periodicReviewSchema
      }
    }, "Periodic Review");

    const text = response.text || "{}";
    let parsedData: PeriodicReviewData;
    try {
      parsedData = robustParse(text);
    } catch (e) {
      throw new Error("复盘数据解析失败");
    }

    return {
      content: text,
      timestamp: Date.now(),
      modelUsed: ModelProvider.GEMINI_INTL,
      isStructured: true,
      periodicData: parsedData,
      market: market
    };

  } catch (error: any) {
    console.error("Periodic Review Error:", error);
    throw error;
  }
};

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
          { text: "Analyze this brokerage screenshot. Extract: Total Assets (总资产), Position Ratio (仓位), and all Stocks (Name, Code, Volume, Cost, Price, Profit). \n\nIMPORTANT: Output RAW JSON ONLY. DO NOT Include comments (// or /*). DO NOT use Markdown." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: holdingsParsingSchema,
      }
    }, "Image Parsing");

    const jsonText = response.text || "{}";
    try {
      // Use Robust Parse instead of cleanJsonString
      return robustParse(jsonText);
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
    const prompt = `Review ${market} market for ${year} ${month === 'all' ? 'Full Year' : month + ' Month'}. Output JSON with winners, losers, summary, key events in Chinese. NO COMMENTS.`;
    
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
      parsedData = robustParse(text);
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
  
  // Define specific indices to search based on market to improve grounding
  let searchTerms = [];
  if (market === MarketType.CN) {
    searchTerms = ["上证指数 000001", "深证成指 399001", "创业板指 399006"];
  } else if (market === MarketType.HK) {
    searchTerms = ["恒生指数 HSI", "恒生科技指数 HSTECH"];
  } else if (market === MarketType.US) {
    searchTerms = ["道琼斯指数 DJI", "纳斯达克指数 IXIC", "标普500 SPX"];
  }

  try {
    const prompt = `
      Date: ${dateStr}. Market: ${market}.
      Generate "${period}" Market Analysis Report (Dashboard).
      
      [CRITICAL SEARCH INSTRUCTION - NO HALLUCINATIONS]
      1. You MUST perform specific Google Searches for:
         - ${searchTerms.join(", ")}.
         - "Northbound Capital Flow Today" (北向资金/主力资金).
         - "Total Market Volume Today" (两市成交额).
         - "Top performing stocks A-share today" (今日A股领涨龙头).
      
      [DATA ACCURACY RULES - STRICT]
      - **IF TODAY'S DATA IS NOT AVAILABLE (e.g. before market open or search fails), YOU MUST SEARCH FOR THE PREVIOUS TRADING DAY'S CLOSING DATA.**
      - **YOU MUST EXPLICITLY STATE THE DATE OF THE DATA FOUND in the 'data_date' field.** (e.g. "${dateStr}" or "2024-03-20").
      - Use the *EXACT* values found in the search snippets.
      - If specific flow data is not found, return "N/A" or "0", DO NOT invent a number.
      - Ensure the "change" percentage matches the "value" direction.

      Tasks:
      1. Indices & Sentiment.
      2. Volume & Capital Flow (Main Force/Northbound).
      3. Sector Rotation.
      4. Strategy (Aggressive vs Balanced).
      
      5. **Portfolio Table (CRITICAL)**:
         - **MANDATORY**: You MUST provide specific **INDIVIDUAL STOCKS (个股)**. 
         - **DO NOT** fill the table with only ETFs. The user wants specific stock recommendations.
         - For "Aggressive": Pick top performing leader stocks (龙头).
         - For "Balanced": You can mix ETFs with Dividend/Blue-chip stocks, but individual stocks are required.
         - **NO MASKED CODES**: You MUST provide REAL, SPECIFIC stock codes (e.g. "600519").
         - **Strictly No '600xxx'**.
      
      IMPORTANT: Output RAW JSON ONLY. NO COMMENTS (//). NO MARKDOWN.
      Output STRICT JSON matching schema.
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
      parsedData = robustParse(text);
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