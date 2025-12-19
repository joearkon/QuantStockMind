
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
    market_volume: {
      type: Type.OBJECT,
      properties: {
        total_volume: { type: Type.STRING },
        volume_delta: { type: Type.STRING },
        volume_trend: { type: Type.STRING, enum: ["expansion", "contraction", "flat"] },
        net_inflow: { type: Type.STRING },
        capital_mood: { type: Type.STRING },
        active_buy_spread: { type: Type.STRING, description: "Trends of active buying vs selling." }
      },
      required: ["total_volume", "volume_delta", "volume_trend", "net_inflow", "capital_mood", "active_buy_spread"]
    },
    institutional_signals: {
      type: Type.OBJECT,
      properties: {
        dragon_tiger_summary: { type: Type.STRING, description: "Dragon Tiger list overview (Dragon-Tiger list)." },
        block_trade_activity: { type: Type.STRING, description: "Block trade frequency and premium/discount." },
        active_money_flow_trend: { type: Type.STRING, description: "Focus on trend priority (Inflow/Outflow trend)." }
      },
      required: ["dragon_tiger_summary", "block_trade_activity", "active_money_flow_trend"]
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
      properties: {
        defensive_value: {
          type: Type.OBJECT,
          properties: {
            logic: { type: Type.STRING },
            sectors: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        },
        tech_growth: {
          type: Type.OBJECT,
          properties: {
            logic: { type: Type.STRING },
            sectors: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      },
      required: ["defensive_value", "tech_growth"]
    },
    strategist_verdict: { type: Type.STRING },
    allocation_model: {
      type: Type.OBJECT,
      properties: {
        aggressive: {
          type: Type.OBJECT,
          properties: {
            strategy_name: { type: Type.STRING },
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
        },
        balanced: {
          type: Type.OBJECT,
          properties: {
            strategy_name: { type: Type.STRING },
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
  required: ["data_date", "market_sentiment", "market_volume", "institutional_signals", "capital_rotation", "deep_logic", "hot_topics", "opportunity_analysis", "strategist_verdict", "allocation_model"]
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
    score: { type: Type.NUMBER },
    market_summary: { type: Type.STRING },
    market_trend: { type: Type.STRING, enum: ["bull", "bear", "volatile"] },
    highlight: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING }
      },
      required: ["title", "description"]
    },
    lowlight: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING }
      },
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
    next_period_focus: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["score", "market_summary", "market_trend", "highlight", "lowlight", "execution", "next_period_focus"]
};

const holdingsParsingSchema: Schema = {
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

const historicalYearSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    year: { type: Type.STRING },
    yearly_summary: { type: Type.STRING },
    months: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          month: { type: Type.INTEGER },
          summary: { type: Type.STRING },
          winners: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                change_approx: { type: Type.STRING }
              }
            }
          },
          losers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                change_approx: { type: Type.STRING }
              }
            }
          },
          key_event: { type: Type.STRING }
        },
        required: ["month", "summary", "winners", "losers", "key_event"]
      }
    }
  },
  required: ["year", "yearly_summary", "months"]
};

// --- Helpers ---
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
    clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');
    clean = clean.replace(/(^|[{,\[\]])\s*\/\/.*$/gm, '$1'); 
    clean = clean.replace(/[\u201C\u201D]/g, '"'); 
    clean = clean.replace(/(\d+)\.0{5,}\d*/g, '$1');
    clean = clean.replace(/}\s*{/g, '}, {');
    clean = clean.replace(/]\s*\[/g, '], [');
    clean = clean.replace(/"\s+(?=")/g, '", ');
    clean = clean.replace(/,\s*}/g, '}');
    clean = clean.replace(/,\s*]/g, ']');
    clean = clean.replace(/：/g, ':').replace(/，/g, ',');
    clean = clean.replace(/([{,]\s*)([a-zA-Z0-9_]+?)\s*:/g, '$1"$2":');
    clean = clean.replace(/\bNaN\b/g, 'null');
    clean = clean.replace(/\bInfinity\b/g, 'null');
    try {
      return JSON.parse(clean);
    } catch (finalError) {
      console.error("Robust parse failed completely.", finalError);
      throw new Error("JSON 解析严重失败 (Syntax Error)。模型返回了非法格式。");
    }
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
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
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
      const msg = (error.message || JSON.stringify(error)).toLowerCase();
      const isOverloaded = msg.includes('503') || msg.includes('overloaded') || msg.includes('unavailable');
      const isRateLimit = msg.includes('429') || msg.includes('resource_exhausted');
      if ((isOverloaded || isRateLimit) && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i) + (Math.random() * 1000);
        await wait(delay);
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
  const prompt = `Role: Professional Trading Assistant. Extract actionable instructions into JSON. Source: ${analysisContent}. Output JSON only.`;
  try {
    const response = await runGeminiSafe(ai, {
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: tradingPlanSchema }
    }, "Plan Extraction");
    const text = response.text || "{}";
    const parsed = robustParse(text);
    const items = (parsed.items || []).map((item: any) => ({ ...item, id: crypto.randomUUID(), status: 'pending' }));
    return { items, summary: parsed.strategy_summary || "无总纲" };
  } catch (error: any) {
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
  const sortedJournals = [...journals].sort((a, b) => a.timestamp - b.timestamp);
  const journalSummary = sortedJournals.map((j, idx) => `[Log #${idx + 1}] Assets: ${j.snapshot.totalAssets}, Holdings: ${j.snapshot.holdings.map(h => h.name).join(',')}`).join('\n');
  const prompt = `Role: Review user's trading journal for ${periodLabel}. Market: ${market}. Logs: ${journalSummary}. Output JSON strictly.`;
  try {
    const response = await runGeminiSafe(ai, { contents: prompt, config: { tools: [{ googleSearch: {} }] } }, "Periodic Review");
    const text = response.text || "{}";
    const parsedData = robustParse(text);
    return { content: text, timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, periodicData: parsedData, market };
  } catch (error: any) {
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
         config: { tools: [{ googleSearch: {} }], systemInstruction: "资深量化分析师。必须分析龙虎榜(LH List)、大宗交易(Block Trade)和分时活跃资金(Active Spread)趋势。" }
       }, "Standard Analysis");
    }
    const text = response.text || "无法生成分析结果。";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks.map((chunk: any) => chunk.web).filter((web: any) => web !== undefined);
    return { content: text, groundingSource: sources, timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: false };
  } catch (error: any) {
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
          { text: "Extract brokerage data into JSON. NO COMMENTS." }
        ]
      },
      config: { responseMimeType: "application/json", responseSchema: holdingsParsingSchema }
    }, "Image Parsing");
    const jsonText = response.text || "{}";
    return robustParse(jsonText);
  } catch (error: any) {
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
  try {
    const visionResponse = await runGeminiSafe(ai, {
      contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: optimizedImage } }, { text: `Extract technical patterns for ${stockQuery}.` }] }
    }, "Vision Extraction");
    const visualData = visionResponse.text || "（未检测到明显的盘口数据）";
    const finalResponse = await runGeminiSafe(ai, {
      contents: `Context: ${stockQuery}. Visual: ${visualData}. Task: Search latest Dragon Tiger list, Block trades, Spread. Markdown report.`,
      config: { tools: [{ googleSearch: {} }] }
    }, "Stock Analysis Synthesis");
    const text = finalResponse.text || "无法生成分析结果。";
    const groundingChunks = finalResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks.map((chunk: any) => chunk.web).filter((web: any) => web !== undefined);
    return { content: text, groundingSource: sources, timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: false };
  } catch (error: any) {
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
    const prompt = `Review ${market} market for ${year} ${month}. Search winners/losers. Output JSON strictly.`;
    const response = await runGeminiSafe(ai, { contents: prompt, config: { tools: [{ googleSearch: {} }] } }, "History Review");
    const text = response.text || "{}";
    const parsedData = robustParse(text);
    return { content: text, timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, historyData: parsedData, market };
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
  try {
    const prompt = `
      Market Dashboard for ${market}. Date: ${new Date().toLocaleDateString()}.
      [SEARCH MANDATORY]
      1. Indices & Total Volume.
      2. Dragon Tiger list (龙虎榜) institutional net activity.
      3. Block Trade (大宗交易) premiums/discounts.
      4. Active Buy/Sell spread trend (分时资金流入/流出趋势优先).
      [RULE]
      - **TREND PRIORITY**: Prioritize "Inflow/Outflow Trend" over absolute net amount.
      - Output JSON matching schema: ${JSON.stringify(marketDashboardSchema)}.
    `;
    const response = await runGeminiSafe(ai, { contents: prompt, config: { tools: [{ googleSearch: {} }] } }, "Market Dashboard");
    const text = response.text || "{}";
    const parsedData = robustParse(text);
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks.map((chunk: any) => chunk.web).filter((web: any) => web !== undefined);
    return { content: text, groundingSource: sources, timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, structuredData: parsedData, market };
  } catch (error: any) {
    throw error;
  }
};
