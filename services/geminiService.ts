
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType, HoldingsSnapshot, JournalEntry, PlanItem } from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 
const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";

// --- Schemas ---

// Sector Ladder Schema
const sectorLadderSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sector_name: { type: Type.STRING },
    cycle_stage: { type: Type.STRING, enum: ["Starting", "Growing", "Climax", "End", "Receding"] },
    stage_label: { type: Type.STRING },
    risk_score: { type: Type.NUMBER },
    ladder: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tier: { type: Type.STRING },
          stocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                code: { type: Type.STRING },
                status: { type: Type.STRING, enum: ["Leading", "Stagnant", "Following", "Weakening"] },
                performance: { type: Type.STRING },
                health_score: { type: Type.NUMBER },
                logic: { type: Type.STRING }
              },
              required: ["name", "code", "status", "performance", "health_score", "logic"]
            }
          }
        },
        required: ["tier", "stocks"]
      }
    },
    structural_integrity: {
      type: Type.OBJECT,
      properties: {
        synergy_score: { type: Type.NUMBER },
        verdict: { type: Type.STRING },
        is_divergent: { type: Type.BOOLEAN }
      },
      required: ["synergy_score", "verdict", "is_divergent"]
    },
    support_points: { type: Type.ARRAY, items: { type: Type.STRING } },
    warning_signals: { type: Type.ARRAY, items: { type: Type.STRING } },
    action_advice: { type: Type.STRING }
  },
  required: ["sector_name", "cycle_stage", "stage_label", "risk_score", "ladder", "structural_integrity", "support_points", "warning_signals", "action_advice"]
};

// Market Dashboard Schema
const marketDashboardSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    data_date: { type: Type.STRING },
    market_indices: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          value: { type: Type.STRING },
          percent: { type: Type.STRING },
          direction: { type: Type.STRING, enum: ["up", "down"] }
        },
        required: ["name", "value", "percent", "direction"]
      }
    },
    market_volume: {
      type: Type.OBJECT,
      properties: {
        total_volume: { type: Type.STRING },
        volume_delta: { type: Type.STRING },
        volume_trend: { type: Type.STRING, enum: ["expansion", "contraction", "flat"] },
        capital_mood: { type: Type.STRING }
      },
      required: ["total_volume", "volume_delta", "volume_trend", "capital_mood"]
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
        rotation_logic: { type: Type.STRING }
      },
      required: ["inflow_sectors", "outflow_sectors", "rotation_logic"]
    },
    macro_logic: {
      type: Type.OBJECT,
      properties: {
        policy_focus: { type: Type.STRING },
        external_impact: { type: Type.STRING },
        core_verdict: { type: Type.STRING }
      },
      required: ["policy_focus", "external_impact", "core_verdict"]
    }
  },
  required: ["data_date", "market_indices", "market_volume", "market_sentiment", "capital_rotation", "macro_logic"]
};

// Holdings Snapshot Schema
const holdingsSnapshotSchema: Schema = {
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
        },
        required: ["name", "code", "volume", "costPrice", "currentPrice", "profit", "profitRate", "marketValue"]
      }
    }
  },
  required: ["totalAssets", "positionRatio", "date", "holdings"]
};

// Periodic Review Schema
const periodicReviewSchema: Schema = {
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
};

// Trading Plan Schema
const tradingPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          symbol: { type: Type.STRING },
          action: { type: Type.STRING, enum: ["buy", "sell", "hold", "monitor", "t_trade"] },
          price_target: { type: Type.STRING },
          reason: { type: Type.STRING }
        },
        required: ["symbol", "action", "price_target", "reason"]
      }
    }
  },
  required: ["summary", "items"]
};

// Robust JSON Parser
const robustParse = (text: string): any => {
  if (!text) return null;
  let clean = text.trim();
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  const firstBrace = clean.search(/[{[]/);
  const lastIndex = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
  if (firstBrace !== -1 && lastIndex !== -1) clean = clean.substring(firstBrace, lastIndex + 1);
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("Parse error:", e);
    return null;
  }
};

// Fetch Sector Ladder Analysis
export const fetchSectorLadderAnalysis = async (sectorName: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    作为顶级 A 股短线量化策略专家，利用 googleSearch 深度分析板块：“${sectorName}” 的当前生命周期。
    
    【核心研判逻辑 - 请务必以此框架输出】
    1. 梯队划分：
       - 一梯队（龙头）：识别当前的领涨标的，分析其是否出现“放量滞涨”或“缩量加速”。
       - 二梯队（中军/核心）：找出该板块的大市值核心标的，分析其与龙头的“联动性”是否减弱（即中军是否不再跟涨）。
       - 三梯队（补涨）：找出低位刚启动的标的，判断其是否有接力欲望。
    2. 行情延续支撑点：找出至少3条支持行情继续走强的证据。
    3. 行情终结警示信号：罗列触发“行情终结”的具体条件（例如：龙头放量冲高回落、中军逆势下跌、补涨批量炸板）。
    
    请输出严格的 JSON。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: sectorLadderSchema
    }
  });

  const text = response.text || "{}";
  const parsed = robustParse(text);

  return {
    content: text,
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    ladderData: parsed,
    market
  };
};

// Fetch Gemini Analysis for general prompts
export const fetchGeminiAnalysis = async (prompt: string, isComplex: boolean, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || "" });
  const response = await ai.models.generateContent({
    model: isComplex ? GEMINI_MODEL_COMPLEX : GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });
  return {
    content: response.text || "",
    groundingSource: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(c => ({
      uri: c.web?.uri || "",
      title: c.web?.title || "来源"
    })) || [],
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL
  };
};

// Fetch Stock Detail with Image (Multimodal)
export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const marketLabel = market === MarketType.US ? '美股' : market === MarketType.HK ? '港股' : 'A股';
  const prompt = `请对 ${marketLabel} 的股票 "${query}" 进行深度量化分析。结合提供的 K 线截图及实时市场数据。`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Image } },
        { text: prompt }
      ]
    },
    config: { tools: [{ googleSearch: {} }] }
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    market
  };
};

// Parse Brokerage Screenshot into Holdings Snapshot
export const parseBrokerageScreenshot = async (base64String: string, apiKey?: string): Promise<HoldingsSnapshot> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || "" });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64String } },
        { text: "请分析这张交易软件持仓截图，提取总资产、仓位占比、日期及详细持仓列表。输出 JSON。" }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: holdingsSnapshotSchema
    }
  });
  return robustParse(response.text);
};

// Fetch Periodic Review based on historical journals
export const fetchPeriodicReview = async (journals: JournalEntry[], label: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || "" });
  const historyText = journals.map(j => `日期: ${new Date(j.timestamp).toLocaleDateString()}, 资产: ${j.snapshot.totalAssets}, 持仓数: ${j.snapshot.holdings.length}`).join('\n');
  const prompt = `分析该账户在 ${label} 期间的表现趋势、操作优劣及后续战略。市场环境: ${market}。以下为历史日志记录：\n${historyText}`;
  
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: periodicReviewSchema
    }
  });
  const parsed = robustParse(response.text);
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    periodicData: parsed,
    market
  };
};

// Extract structured Trading Plan from text
export const extractTradingPlan = async (analysisContent: string, apiKey?: string): Promise<{ items: PlanItem[], summary: string }> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || "" });
  const prompt = `从以下个股或账户复盘分析文本中，提取出具体的交易计划项（标的、动作、目标价、理由）及策略总纲。请确保输出为 JSON。\n\n分析文本：\n${analysisContent}`;
  
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: tradingPlanSchema
    }
  });
  const parsed = robustParse(response.text);
  const items = (parsed.items || []).map((it: any) => ({
    ...it,
    id: crypto.randomUUID(),
    status: 'pending'
  }));
  return {
    items,
    summary: parsed.summary || ""
  };
};

// Fetch Market Dashboard data
export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || "" });
  const marketName = market === MarketType.US ? '美股' : market === MarketType.HK ? '港股' : 'A股';
  const prompt = `作为高级宏观策略分析师，请生成一份 ${marketName} 的${period === 'day' ? '当日' : '本月'}市场深度分析报告。请利用联网搜索获取最新的指数、成交量、板块轮动及宏观驱动力。`;
  
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: marketDashboardSchema
    }
  });
  const parsed = robustParse(response.text);
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    structuredData: parsed,
    market
  };
};
