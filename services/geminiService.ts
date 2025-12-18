
// STRICTLY following @google/genai coding guidelines.
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType, HoldingsSnapshot, HistoricalYearData, JournalEntry, PeriodicReviewData, PlanItem, MacroDeductionData } from "../types";

// Complex analysis uses gemini-3-pro-preview; Basic/Vision tasks use gemini-3-flash-preview.
const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";
const GEMINI_MODEL_BASIC = "gemini-3-flash-preview";

// --- Schemas ---

const macroForecasterSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    short_term_outlook: {
      type: Type.OBJECT,
      properties: {
        period: { type: Type.STRING, description: "e.g. 2025年1月" },
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
  required: ["data_date", "market_sentiment", "market_volume", "capital_rotation", "deep_logic", "hot_topics", "opportunity_analysis", "strategist_verdict", "allocation_model"]
};

const tradingPlanSchema = { type: Type.OBJECT, properties: { items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { symbol: { type: Type.STRING }, action: { type: Type.STRING, enum: ['buy', 'sell', 'hold', 'monitor', 't_trade'] }, price_target: { type: Type.STRING }, reason: { type: Type.STRING } }, required: ["symbol", "action", "price_target", "reason"] } }, strategy_summary: { type: Type.STRING } }, required: ["items", "strategy_summary"] };
const periodicReviewSchema = { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, market_summary: { type: Type.STRING }, market_trend: { type: Type.STRING, enum: ["bull", "bear", "volatile"] }, highlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["title", "description"] }, lowlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["title", "description"] }, execution: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, details: { type: Type.STRING }, good_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } }, bad_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["score", "details", "good_behaviors", "bad_behaviors"] }, next_period_focus: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["score", "market_summary", "market_trend", "highlight", "lowlight", "execution", "next_period_focus"] };
const holdingsParsingSchema = { type: Type.OBJECT, properties: { totalAssets: { type: Type.NUMBER }, positionRatio: { type: Type.NUMBER }, date: { type: Type.STRING }, holdings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, volume: { type: Type.NUMBER }, costPrice: { type: Type.NUMBER }, currentPrice: { type: Type.NUMBER }, profit: { type: Type.NUMBER }, profitRate: { type: Type.STRING }, marketValue: { type: Type.NUMBER } } } } }, required: ["totalAssets", "holdings"] };
const historicalYearSchema = { type: Type.OBJECT, properties: { year: { type: Type.STRING }, yearly_summary: { type: Type.STRING }, months: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { month: { type: Type.INTEGER }, summary: { type: Type.STRING }, winners: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, change_approx: { type: Type.STRING } } } }, losers: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, change_approx: { type: Type.STRING } } } }, key_event: { type: Type.STRING } }, required: ["month", "summary", "winners", "losers", "key_event"] } } }, required: ["year", "yearly_summary", "months"] };

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
  try { return JSON.parse(clean); } catch (e) {}
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
  try { return JSON.parse(clean); } catch (finalError) { throw new Error("JSON 解析严重失败"); }
};

const compressImage = (base64Str: string, maxWidth = 1024, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve(base64Str); return; }
    const img = new Image();
    img.src = `data:image/png;base64,${base64Str}`;
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxWidth) { const ratio = maxWidth / width; width = maxWidth; height = Math.round(height * ratio); }
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); if (!ctx) { resolve(base64Str); return; }
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, width, height); ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality); resolve(dataUrl.split(',')[1]);
      } catch (e) { resolve(base64Str); }
    };
    img.onerror = () => resolve(base64Str);
  });
};

async function callGeminiWithRetry(apiCall: () => Promise<GenerateContentResponse>, retries = 3, baseDelay = 2000): Promise<GenerateContentResponse> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try { return await apiCall(); } catch (error: any) {
      lastError = error;
      const msg = (error.message || JSON.stringify(error)).toLowerCase();
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

export const fetchMacroForecaster = async (
  inputData: string,
  market: MarketType = MarketType.CN
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Role: Senior Macro Strategist & Future Industry Researcher.
    Context: Analyze the ${market} market based on the following input/insight: 【${inputData}】.
    
    Task: Perform a deep deduction (Deep Forecaster) across two timelines:
    1. Short-term (Next 1-2 months): Catalysts, immediate sector rotation, and heat indices.
    2. Long-term (15th Five-Year Plan / 2026-2030): Strategic structural changes, potential national champions, and key policy metrics.

    Guidelines:
    - You MUST use Google Search to find latest policy "pre-blows" (吹风会) and industry reports.
    - If input is "Commercial Space" (商业航天), focus on rocket technology, high-end manufacturing, and low-earth orbit economy.
    - Output JSON ONLY matching the provided schema. 
    - Languages: Use Chinese for all text fields.
  `;

  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, {
      contents: prompt + `\n\nSchema: ${JSON.stringify(macroForecasterSchema)}`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    }, "Macro Forecaster");

    const text = response.text || "{}";
    const parsedData = robustParse(text);

    return {
      content: text,
      timestamp: Date.now(),
      modelUsed: ModelProvider.GEMINI_INTL,
      isStructured: true,
      macroData: parsedData,
      market: market
    };
  } catch (error: any) {
    throw error;
  }
};

export const extractTradingPlan = async (analysisContent: string): Promise<{ items: PlanItem[], summary: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Role: Professional Trading Assistant. Extract instructions from: """${analysisContent}""". Output in Simplified Chinese. JSON ONLY.`;
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_BASIC, { contents: prompt, config: { responseMimeType: "application/json", responseSchema: tradingPlanSchema } }, "Plan Extraction");
    const parsed = robustParse(response.text || "{}");
    const items = (parsed.items || []).map((item: any) => ({ ...item, id: crypto.randomUUID(), status: 'pending' }));
    return { items, summary: parsed.strategy_summary || "无总纲" };
  } catch (error: any) { throw error; }
};

export const fetchPeriodicReview = async (journals: JournalEntry[], periodLabel: string, market: MarketType): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const journalSummary = journals.map((j, idx) => `[Log #${idx + 1}] Date: ${new Date(j.timestamp).toLocaleDateString()}, Assets: ${j.snapshot.totalAssets}`).join('\n');
  const prompt = `Role: Senior Trading Coach. Period: ${periodLabel}. Market: ${market}. Data: ${journalSummary}. Output JSON Periodic Review.`;
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, { contents: prompt, config: { tools: [{ googleSearch: {} }] } }, "Periodic Review");
    return { content: response.text || "{}", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, periodicData: robustParse(response.text || "{}"), market: market };
  } catch (error: any) { throw error; }
};

export const fetchGeminiAnalysis = async (prompt: string, useReasoning = false): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, { contents: prompt, config: { tools: [{ googleSearch: {} }], systemInstruction: "你是一个专业的金融量化分析助手。" } }, "Standard Analysis");
    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []).map((chunk: any) => chunk.web).filter(Boolean);
    return { content: response.text || "", groundingSource: sources, timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: false };
  } catch (error: any) { throw error; }
};

export const parseBrokerageScreenshot = async (base64Image: string): Promise<HoldingsSnapshot> => {
  const optimizedImage = await compressImage(base64Image);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_BASIC, { contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: optimizedImage } }, { text: "Analyze screenshot. Extract JSON holdings." }] }, config: { responseMimeType: "application/json", responseSchema: holdingsParsingSchema } }, "Image Parsing");
    return robustParse(response.text || "{}");
  } catch (error: any) { throw error; }
};

export const fetchStockDetailWithImage = async (base64Image: string, stockQuery: string, market = MarketType.CN): Promise<AnalysisResult> => {
  const optimizedImage = await compressImage(base64Image);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const vRes = await runGeminiSafe(ai, GEMINI_MODEL_BASIC, { contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: optimizedImage } }, { text: `Analyze chart for ${stockQuery}.` }] } }, "Vision Extraction");
    const finalRes = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, { contents: `Role: Fund Manager. Context: ${stockQuery}. Visual: ${vRes.text}. Search latest and output report.`, config: { tools: [{ googleSearch: {} }] } }, "Stock Analysis Synthesis");
    return { content: finalRes.text || "", groundingSource: (finalRes.candidates?.[0]?.groundingMetadata?.groundingChunks || []).map((c: any) => c.web).filter(Boolean), timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: false };
  } catch (error: any) { throw error; }
};

export const fetchSectorHistory = async (year: string, month = 'all', market = MarketType.CN): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Review ${market} market for ${year} ${month}. JSON ONLY.`;
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, { contents: prompt, config: { tools: [{ googleSearch: {} }] } }, "History Review");
    return { content: response.text || "{}", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, historyData: robustParse(response.text || "{}"), market: market };
  } catch (error: any) { throw error; }
};

export const fetchMarketDashboard = async (period: 'day' | 'month', market = MarketType.CN): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Generate ${period} dashboard for ${market}. Search indices, volume, sentiment. JSON ONLY matching schema.`;
  try {
    const response = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, { contents: prompt + `\n\nSchema: ${JSON.stringify(marketDashboardSchema)}`, config: { tools: [{ googleSearch: {} }] } }, "Market Dashboard");
    return { content: response.text || "{}", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, structuredData: robustParse(response.text || "{}"), market: market };
  } catch (error: any) { throw error; }
};
